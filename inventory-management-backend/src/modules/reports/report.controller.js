const reportService = require('./report.service');
const { sendSuccess } = require('../../utils/responseEnvelope');

async function getStockReport(req, res, next) {
  try {
    const { categoryId, stockStatus } = req.query;
    const report = await reportService.getStockReport({ categoryId, stockStatus });
    return sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
}

async function getStockMovementReport(req, res, next) {
  try {
    const { productId, transactionType, fromDate, toDate } = req.query;
    const report = await reportService.getStockMovementReport({
      productId,
      transactionType,
      fromDate,
      toDate
    });
    return sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
}

async function getSalesReport(req, res, next) {
  try {
    const { fromDate, toDate, paymentMethod } = req.query;
    const report = await reportService.getSalesReport({ fromDate, toDate, paymentMethod });
    return sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
}

async function exportReportCsv(req, res, next) {
  try {
    const { type } = req.params; // 'stock', 'movement', or 'sales'
    let csvContent = '';
    let filename = `report-${type}-${Date.now()}.csv`;

    if (type === 'stock') {
      const data = await reportService.getStockReport(req.query);
      const headers = ['SKU', 'Name', 'Category', 'Unit', 'Current Stock', 'Reorder Level', 'Cost Price', 'Selling Price', 'Cost Valuation', 'Retail Valuation', 'Status'];
      const rows = data.map((r) => [
        `"${r.sku}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.category}"`,
        `"${r.unit}"`,
        r.currentStock,
        r.reorderLevel,
        r.costPrice.toFixed(2),
        r.sellingPrice.toFixed(2),
        r.totalCostValue.toFixed(2),
        r.totalRetailValue.toFixed(2),
        r.status
      ].join(','));
      csvContent = [headers.join(','), ...rows].join('\n');
    } else if (type === 'movement') {
      const data = await reportService.getStockMovementReport(req.query);
      const headers = ['Date', 'SKU', 'Product Name', 'Unit', 'Type', 'Quantity Change', 'Balance After', 'User', 'Reason'];
      const rows = data.map((r) => [
        `"${new Date(r.date).toISOString()}"`,
        `"${r.sku}"`,
        `"${r.productName.replace(/"/g, '""')}"`,
        `"${r.unit}"`,
        r.transactionType,
        r.quantity,
        r.balanceAfter,
        `"${r.userName}"`,
        `"${(r.reason || '').replace(/"/g, '""')}"`
      ].join(','));
      csvContent = [headers.join(','), ...rows].join('\n');
    } else if (type === 'sales') {
      const data = await reportService.getSalesReport(req.query);
      const headers = ['Date', 'Invoice Number', 'Customer', 'Cashier', 'Payment Method', 'Items Count', 'Subtotal', 'Discount', 'Tax', 'Total Amount', 'COGS', 'Gross Profit'];
      const rows = data.items.map((r) => [
        `"${new Date(r.date).toISOString()}"`,
        `"${r.invoiceNumber}"`,
        `"${r.customerName.replace(/"/g, '""')}"`,
        `"${r.cashierName}"`,
        r.paymentMethod,
        r.itemCount,
        r.subtotal.toFixed(2),
        r.discount.toFixed(2),
        r.tax.toFixed(2),
        r.totalAmount.toFixed(2),
        r.cogs.toFixed(2),
        r.profit.toFixed(2)
      ].join(','));
      csvContent = [headers.join(','), ...rows].join('\n');
    } else {
      return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStockReport,
  getStockMovementReport,
  getSalesReport,
  exportReportCsv
};
