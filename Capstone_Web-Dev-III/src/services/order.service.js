const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const ApiError = require('../utils/apiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const appEmitter = require('../events');

// Allowed status lifecycle transition map
const ALLOWED_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [], // Terminal status
  cancelled: [], // Terminal status
};

class OrderService {
  /**
   * Concurrency-safe checkout from cart
   * Uses atomic conditional decrement:
   * Product.updateOne({ _id, stock: { $gte: qty }, isActive: true }, { $inc: { stock: -qty } })
   * If any item fails, rolls back all previous decrements and returns 409 Conflict.
   */
  async checkout(userId, { deliveryAddress, couponCode }) {
    // 1. Fetch user's cart
    const cart = await Cart.findOne({ user: userId });
    if (!cart || !cart.items || cart.items.length === 0) {
      throw ApiError.badRequest('Cannot checkout with an empty cart');
    }

    // 2. Fetch fresh product details and perform atomic decrements
    const decrementedList = [];
    const orderItems = [];
    let subtotal = 0;

    try {
      for (const cartItem of cart.items) {
        const product = await Product.findById(cartItem.product);
        if (!product || !product.isActive) {
          throw ApiError.conflict(
            `Product "${product ? product.name : cartItem.product}" is no longer available`
          );
        }

        // Atomic conditional decrement to prevent negative stock in high concurrency
        const updateResult = await Product.updateOne(
          {
            _id: product._id,
            stock: { $gte: cartItem.quantity },
            isActive: true,
          },
          {
            $inc: { stock: -cartItem.quantity },
          }
        );

        if (updateResult.modifiedCount === 0) {
          // Stock was insufficient or product was deactivated concurrently
          throw ApiError.conflict(
            `Insufficient stock for product "${product.name}". Available stock is less than requested quantity (${cartItem.quantity})`
          );
        }

        // Track successful decrement for rollback in case subsequent item fails
        decrementedList.push({
          productId: product._id,
          quantity: cartItem.quantity,
          name: product.name,
          seller: product.seller,
          threshold: product.lowStockThreshold,
        });

        // Take snapshot of price and details
        const lineTotal = Math.round(product.price * cartItem.quantity * 100) / 100;
        subtotal += lineTotal;

        orderItems.push({
          product: product._id,
          seller: product.seller,
          name: product.name,
          unitPrice: product.price,
          quantity: cartItem.quantity,
          lineTotal,
        });
      }
    } catch (err) {
      // Rollback all stock decremented so far in this checkout session
      for (const d of decrementedList) {
        await Product.updateOne(
          { _id: d.productId },
          { $inc: { stock: d.quantity } }
        );
      }
      throw err;
    }

    subtotal = Math.round(subtotal * 100) / 100;

    // 3. Process Coupon if provided
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      appliedCoupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (!appliedCoupon) {
        // Rollback stock before throwing
        for (const d of decrementedList) {
          await Product.updateOne({ _id: d.productId }, { $inc: { stock: d.quantity } });
        }
        throw ApiError.badRequest('Invalid coupon code');
      }

      const check = appliedCoupon.isValid(subtotal);
      if (!check.valid) {
        // Rollback stock before throwing
        for (const d of decrementedList) {
          await Product.updateOne({ _id: d.productId }, { $inc: { stock: d.quantity } });
        }
        throw ApiError.badRequest(check.message);
      }

      discount = appliedCoupon.calculateDiscount(subtotal);
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }

    const shippingFee = 0; // Flat or free shipping
    const totalAmount = Math.max(0, Math.round((subtotal - discount + shippingFee) * 100) / 100);

    // 4. Generate unique orderNumber
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-${dateStr}-${randSuffix}`;

    // 5. Simulated Payment Record
    const transactionId = `TXN-SIM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // 6. Create Order document
    const order = await Order.create({
      orderNumber,
      customer: userId,
      items: orderItems,
      subtotal,
      discount,
      shippingFee,
      totalAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      deliveryAddress,
      payment: {
        method: 'SIMULATED',
        status: 'paid',
        transactionId,
      },
      status: 'paid',
      statusHistory: [
        {
          status: 'pending',
          changedBy: userId,
          changedAt: new Date(),
          note: 'Order created',
        },
        {
          status: 'paid',
          changedBy: userId,
          changedAt: new Date(),
          note: 'Simulated payment completed successfully',
        },
      ],
    });

    // 7. Clear user cart
    cart.items = [];
    await cart.save();

    // 8. Emit events
    appEmitter.emit('order.placed', order);

    // Check low stock for each decremented product
    for (const d of decrementedList) {
      const currentProd = await Product.findById(d.productId);
      if (currentProd && currentProd.stock <= currentProd.lowStockThreshold) {
        appEmitter.emit('stock.low', {
          product: currentProd,
          currentStock: currentProd.stock,
          threshold: currentProd.lowStockThreshold,
        });
      }
    }

    return order;
  }

  async getOrders(user, query = {}) {
    const { page, limit, skip } = getPagination(query);

    const filter = {};

    if (user.role === 'customer') {
      filter.customer = user._id;
    } else if (user.role === 'seller') {
      filter['items.seller'] = user._id;
    } else if (user.role === 'admin') {
      if (query.status) {
        filter.status = query.status;
      }
      if (query.dateFrom || query.dateTo) {
        filter.createdAt = {};
        if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
        if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
      }
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    // If caller is seller, filter each order's items so seller only sees their own items
    const sanitizedOrders = orders.map((order) => {
      if (user.role === 'seller') {
        const orderObj = order.toObject();
        orderObj.items = orderObj.items.filter(
          (item) => item.seller.toString() === user._id.toString()
        );
        return orderObj;
      }
      return order;
    });

    const meta = getPaginationMeta(total, page, limit);
    return { orders: sanitizedOrders, meta };
  }

  async getOrderById(orderId, user) {
    const order = await Order.findById(orderId).populate('customer', 'name email');
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Role checks
    if (user.role === 'customer') {
      if (order.customer._id.toString() !== user._id.toString()) {
        throw ApiError.notFound('Order not found'); // hide existence
      }
      return order;
    }

    if (user.role === 'seller') {
      const containsSellerItem = order.items.some(
        (item) => item.seller.toString() === user._id.toString()
      );
      if (!containsSellerItem) {
        throw ApiError.notFound('Order not found');
      }

      // Seller cannot see other sellers' items
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.filter(
        (item) => item.seller.toString() === user._id.toString()
      );
      return orderObj;
    }

    // Admin can view everything
    return order;
  }

  async updateOrderStatus(orderId, newStatus, note, user) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Sellers can only update status if order contains their products
    if (user.role === 'seller') {
      const containsSellerItem = order.items.some(
        (item) => item.seller.toString() === user._id.toString()
      );
      if (!containsSellerItem) {
        throw ApiError.forbidden('You can only update orders that contain your products');
      }
    }

    // Validate transition map
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw ApiError.conflict(
        `Invalid status transition from '${order.status}' to '${newStatus}'. Allowed transitions: [${allowed.join(
          ', '
        )}]`
      );
    }

    const previousStatus = order.status;

    // If moving to cancelled via status update, restore stock atomically
    if (newStatus === 'cancelled') {
      return this.cancelOrder(orderId, user, note || 'Cancelled by seller or admin');
    }

    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      changedBy: user._id,
      changedAt: new Date(),
      note: note || `Status transitioned to ${newStatus}`,
    });

    await order.save();

    appEmitter.emit('order.status.changed', {
      order,
      previousStatus,
      note,
    });

    return order;
  }

  /**
   * Cancel order:
   * - Customers may cancel only while status is pending or paid.
   * - Sellers / Admin can cancel under transition rules (pending, paid, processing).
   * - Restores stock exactly once via atomic conditional update.
   */
  async cancelOrder(orderId, user, note = 'Order cancelled') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Check customer authorization
    if (user.role === 'customer') {
      if (order.customer.toString() !== user._id.toString()) {
        throw ApiError.notFound('Order not found');
      }
      if (!['pending', 'paid'].includes(order.status)) {
        throw ApiError.conflict(
          `Customers can only cancel orders in 'pending' or 'paid' status. Current status is '${order.status}'`
        );
      }
    } else if (user.role === 'seller') {
      const containsSellerItem = order.items.some(
        (item) => item.seller.toString() === user._id.toString()
      );
      if (!containsSellerItem) {
        throw ApiError.forbidden('You can only cancel orders that contain your products');
      }
      if (!['pending', 'paid', 'processing'].includes(order.status)) {
        throw ApiError.conflict(
          `Order in '${order.status}' status cannot be cancelled`
        );
      }
    }

    // Atomic update to cancel: guarantees double cancellation cannot happen
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: { $in: ['pending', 'paid', 'processing'] },
      },
      {
        $set: { status: 'cancelled' },
        $push: {
          statusHistory: {
            status: 'cancelled',
            changedBy: user._id,
            changedAt: new Date(),
            note: note || 'Order cancelled and stock restored',
          },
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      throw ApiError.conflict('Order is already cancelled or cannot be cancelled');
    }

    // Restore stock atomically for all items
    for (const item of updatedOrder.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      );
    }

    appEmitter.emit('order.status.changed', {
      order: updatedOrder,
      previousStatus: order.status,
      note,
    });

    return updatedOrder;
  }
}

module.exports = new OrderService();
