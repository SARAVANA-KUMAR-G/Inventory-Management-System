const prisma = require('../../config/prisma');

async function getStockReport({ categoryId = '', stockStatus = '' }) {
  const where = { isActive: true };
  if (categoryId) where.categoryId = categoryId;

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { category: { select: { id: true, name: true } } }
  });

  const report = products.map((p) => {
    const stock = Number(p.currentStock);
    const cost = Number(p.costPrice);
    const sell = Number(p.sellingPrice);
    const reorder = Number(p.reorderLevel);

    let status = 'IN_STOCK';
    if (stock <= 0) status = 'OUT_OF_STOCK';
    else if (stock <= reorder) status = 'LOW_STOCK';

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category ? p.category.name : 'Uncategorized',
      unit: p.unit,
      currentStock: stock,
      reorderLevel: reorder,
      costPrice: cost,
      sellingPrice: sell,
      totalCostValue: Math.round(stock * cost * 100) / 100,
      totalRetailValue: Math.round(stock * sell * 100) / 100,
      status
    };
  });

  if (stockStatus) {
    return report.filter((r) => r.status === stockStatus);
  }

  return report;
}

async function getStockMovementReport({ productId = '', transactionType = '', fromDate = '', toDate = '' }) {
  const where = {};
  if (productId) where.productId = productId;
  if (transactionType) where.transactionType = transactionType;

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const transactions = await prisma.stockTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
      user: { select: { id: true, firstName: true, lastName: true } }
    }
  });

  return transactions.map((t) => ({
    id: t.id,
    date: t.createdAt,
    sku: t.product.sku,
    productName: t.product.name,
    unit: t.product.unit,
    transactionType: t.transactionType,
    quantity: Number(t.quantity),
    balanceAfter: Number(t.balanceAfter),
    userName: `${t.user.firstName} ${t.user.lastName || ''}`.trim(),
    reason: t.reason
  }));
}

async function getSalesReport({ fromDate = '', toDate = '', paymentMethod = '' }) {
  const where = {};
  if (paymentMethod) where.paymentMethod = paymentMethod;

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { firstName: true, lastName: true } },
      items: {
        include: {
          product: { select: { costPrice: true, sellingPrice: true, name: true } }
        }
      }
    }
  });

  let totalRevenue = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalCost = 0;

  const items = sales.map((s) => {
    const total = Number(s.grandTotal);
    const subtotal = Number(s.subtotal);
    const discount = Number(s.discountAmount);
    const tax = Number(s.taxAmount);

    let saleCost = 0;
    s.items.forEach((it) => {
      saleCost += Number(it.quantity) * Number(it.costPrice || it.product.costPrice);
    });

    totalRevenue += total;
    totalDiscount += discount;
    totalTax += tax;
    totalCost += saleCost;

    return {
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      date: s.createdAt,
      customerName: 'Walk-in',
      cashierName: `${s.user.firstName} ${s.user.lastName || ''}`.trim(),
      paymentMethod: s.paymentMethod,
      itemCount: s.items.length,
      subtotal,
      discount,
      discountAmount: discount,
      tax,
      taxAmount: tax,
      grandTotal: total,
      totalAmount: total,
      cogs: Math.round(saleCost * 100) / 100,
      profit: Math.round((total - saleCost) * 100) / 100
    };
  });

  return {
    summary: {
      totalSalesCount: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalCOGS: Math.round(totalCost * 100) / 100,
      grossProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
      profitMarginPercent: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000) / 100 : 0
    },
    items
  };
}

module.exports = {
  getStockReport,
  getStockMovementReport,
  getSalesReport
};
