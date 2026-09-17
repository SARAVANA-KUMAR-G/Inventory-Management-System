const saleService = require('./sale.service');
const { sendSuccess } = require('../../utils/responseEnvelope');

async function listSales(req, res, next) {
  try {
    const { page, pageSize, invoiceNumber, paymentMethod, fromDate, toDate } = req.query;
    const result = await saleService.listSales({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      invoiceNumber,
      paymentMethod,
      fromDate,
      toDate
    });
    return sendSuccess(res, result.items, result.meta);
  } catch (error) {
    next(error);
  }
}

async function getSaleById(req, res, next) {
  try {
    const sale = await saleService.getSaleById(req.params.id);
    return sendSuccess(res, sale);
  } catch (error) {
    next(error);
  }
}

async function createSale(req, res, next) {
  try {
    const sale = await saleService.createSale(req.body, req.user.id);
    return sendSuccess(res, sale, null, 201);
  } catch (error) {
    next(error);
  }
}

async function processReturn(req, res, next) {
  try {
    const { items, reason, notes } = req.body;
    const result = await saleService.processReturn({
      saleId: req.params.id,
      items,
      reason,
      notes,
      userId: req.user.id
    });
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSales,
  getSaleById,
  createSale,
  processReturn
};
