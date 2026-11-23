const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/apiError');

class CartService {
  async getOrCreateCart(userId) {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }
    return cart;
  }

  async getCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    await cart.populate({
      path: 'items.product',
      select: 'name slug price stock isActive seller category',
    });

    let subtotal = 0;
    const warnings = [];
    const formattedItems = [];

    for (const item of cart.items) {
      const product = item.product;

      // Check if product was deleted or deactivated
      if (!product || !product.isActive) {
        warnings.push({
          productId: product ? product._id : item.product,
          message: `Product is no longer available`,
          type: 'UNAVAILABLE',
        });
        continue;
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        warnings.push({
          productId: product._id,
          message: `Only ${product.stock} unit(s) remaining in stock (requested ${item.quantity})`,
          type: 'INSUFFICIENT_STOCK',
        });
      }

      // Check if price changed since addition
      if (product.price !== item.priceAtAddition) {
        warnings.push({
          productId: product._id,
          message: `Price changed from $${item.priceAtAddition.toFixed(2)} to $${product.price.toFixed(2)}`,
          type: 'PRICE_CHANGED',
        });
      }

      const currentUnitPrice = product.price;
      const lineTotal = Math.round(currentUnitPrice * item.quantity * 100) / 100;
      subtotal += lineTotal;

      formattedItems.push({
        _id: item._id,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          isActive: product.isActive,
          seller: product.seller,
        },
        quantity: item.quantity,
        priceAtAddition: item.priceAtAddition,
        currentUnitPrice,
        lineTotal,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;

    return {
      _id: cart._id,
      user: cart.user,
      items: formattedItems,
      subtotal,
      warnings,
      itemCount: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async addItem(userId, { productId, quantity }) {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw ApiError.notFound('Product not found or is currently unavailable');
    }

    const cart = await this.getOrCreateCart(userId);
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    const existingQty = existingItemIndex >= 0 ? cart.items[existingItemIndex].quantity : 0;
    const requestedTotalQty = existingQty + quantity;

    if (requestedTotalQty > product.stock) {
      throw ApiError.conflict(
        `Requested quantity (${requestedTotalQty}) exceeds available stock (${product.stock})`
      );
    }

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity = requestedTotalQty;
      cart.items[existingItemIndex].priceAtAddition = product.price;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        priceAtAddition: product.price,
      });
    }

    await cart.save();
    return this.getCart(userId);
  }

  async updateItem(userId, productId, quantity) {
    const cart = await this.getOrCreateCart(userId);
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      throw ApiError.notFound('Item not found in your cart');
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return this.getCart(userId);
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw ApiError.notFound('Product is unavailable');
    }

    if (quantity > product.stock) {
      throw ApiError.conflict(
        `Requested quantity (${quantity}) exceeds available stock (${product.stock})`
      );
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    return this.getCart(userId);
  }

  async removeItem(userId, productId) {
    const cart = await this.getOrCreateCart(userId);
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId.toString()
    );

    if (cart.items.length === initialLength) {
      throw ApiError.notFound('Item not found in your cart');
    }

    await cart.save();
    return this.getCart(userId);
  }

  async clearCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];
    await cart.save();
    return {
      _id: cart._id,
      user: cart.user,
      items: [],
      subtotal: 0,
      warnings: [],
      itemCount: 0,
    };
  }
}

module.exports = new CartService();
