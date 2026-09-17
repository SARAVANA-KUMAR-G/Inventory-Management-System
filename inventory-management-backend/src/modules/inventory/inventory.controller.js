const inventoryService = require('./inventory.service');
const { sendSuccess } = require('../../utils/responseEnvelope');

async function stockIn(req, res, next) {
  try {
    const { productId, quantity, unitCost, supplier, notes } = req.body;
    const result = await inventoryService.recordStockIn({
      productId,
      quantity,
      unitCost,
      supplier,
      notes,
      userId: req.user.id
    });
    return sendSuccess(res, result, null, 201);
  } catch (error) {
    next(error);
  }
}

async function recordAdjustment(req, res, next) {
  try {
    const { productId, type, transactionType, quantity, reason, notes } = req.body;
    const result = await inventoryService.recordAdjustment({
      productId,
      type: type || transactionType,
      quantity,
      reason,
      notes,
      userId: req.user.id
    });
    return sendSuccess(res, result, null, 201);
  } catch (error) {
    next(error);
  }
}

async function listTransactions(req, res, next) {
  try {
    const { page, pageSize, productId, transactionType, fromDate, toDate } = req.query;
    const result = await inventoryService.listStockTransactions({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      productId,
      transactionType,
      fromDate,
      toDate
    });
    return sendSuccess(res, result.items, result.meta);
  } catch (error) {
    next(error);
  }
}

async function getLowStock(req, res, next) {
  try {
    const products = await inventoryService.getLowStockProducts();
    return sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
}

async function getOutOfStock(req, res, next) {
  try {
    const products = await inventoryService.getOutOfStockProducts();
    return sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
}

async function getLastSupplier(req, res, next) {
  try {
    const result = await inventoryService.getLastSupplier(req.params.productId);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  stockIn,
  recordAdjustment,
  listTransactions,
  getLowStock,
  getOutOfStock,
  getLastSupplier
};
