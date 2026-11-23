const EventEmitter = require('events');
const { getIO } = require('../sockets');

class AppEventEmitter extends EventEmitter {}

const appEmitter = new AppEventEmitter();

// Register listeners
appEmitter.on('order.placed', (order) => {
  const io = getIO();
  console.log(`[Event: order.placed] Order #${order.orderNumber} placed for customer ${order.customer}`);

  if (io && order.items && order.items.length) {
    // Group items by seller so each seller gets only their slice
    const sellerItemsMap = {};
    order.items.forEach((item) => {
      const sId = item.seller ? item.seller.toString() : 'unknown';
      if (!sellerItemsMap[sId]) {
        sellerItemsMap[sId] = [];
      }
      sellerItemsMap[sId].push(item);
    });

    Object.entries(sellerItemsMap).forEach(([sellerId, items]) => {
      const sellerTotal = items.reduce((sum, i) => sum + (i.lineTotal || 0), 0);
      io.to(`seller:${sellerId}`).emit('order:placed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        items,
        sellerTotal,
        createdAt: order.createdAt,
      });
    });
  }
});

appEmitter.on('order.status.changed', ({ order, previousStatus, note }) => {
  const io = getIO();
  console.log(
    `[Event: order.status.changed] Order #${order.orderNumber} moved from ${previousStatus} to ${order.status}`
  );

  if (io && order.customer) {
    const customerId = order.customer._id ? order.customer._id.toString() : order.customer.toString();
    io.to(`user:${customerId}`).emit('order:statusChanged', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      note,
      updatedAt: order.updatedAt,
    });
  }
});

appEmitter.on('stock.low', ({ product, currentStock, threshold }) => {
  const io = getIO();
  console.log(
    `[Event: stock.low] Product "${product.name}" stock (${currentStock}) is at or below threshold (${threshold})`
  );

  if (io) {
    const payload = {
      productId: product._id,
      name: product.name,
      stock: currentStock,
      threshold,
      sellerId: product.seller,
    };

    // Emit to seller and admin rooms
    if (product.seller) {
      io.to(`seller:${product.seller.toString()}`).emit('inventory:lowStock', payload);
    }
    io.to('role:admin').emit('inventory:lowStock', payload);
  }
});

module.exports = appEmitter;
