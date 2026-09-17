const prisma = require('../../config/prisma');

async function getDashboardSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    allProducts,
    todaySales,
    recentSales,
    recentTransactions
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        currentStock: true,
        reorderLevel: true,
        costPrice: true,
        sellingPrice: true
      }
    }),
    prisma.sale.findMany({
      where: {
        createdAt: { gte: today }
      },
      select: { grandTotal: true }
    }),
    prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
        items: { select: { id: true } }
      }
    }),
    prisma.stockTransaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true, sku: true, unit: true } },
        user: { select: { firstName: true, lastName: true } }
      }
    })
  ]);

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalStockUnits = 0;
  let totalStockValuation = 0;
  const lowStockItems = [];

  for (const p of allProducts) {
    const stock = Number(p.currentStock);
    const reorder = Number(p.reorderLevel);
    const cost = Number(p.costPrice);

    if (stock <= 0) {
      outOfStockCount++;
      lowStockItems.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        currentStock: stock,
        reorderLevel: reorder,
        unit: p.unit,
        status: 'OUT_OF_STOCK'
      });
    } else if (stock <= reorder) {
      lowStockCount++;
      lowStockItems.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        currentStock: stock,
        reorderLevel: reorder,
        unit: p.unit,
        status: 'LOW_STOCK'
      });
    }

    if (stock > 0) {
      totalStockUnits += stock;
      totalStockValuation += stock * cost;
    }
  }

  const todayRevenue = todaySales.reduce((acc, s) => acc + Number(s.grandTotal), 0);

  return {
    totalProducts,
    totalStockItems: totalStockUnits,
    lowStockCount,
    outOfStockCount,
    totalStockValuation: Math.round(totalStockValuation * 100) / 100,
    todaySalesCount: todaySales.length,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    lowStockAlerts: lowStockItems.slice(0, 8),
    recentSales: recentSales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      cashierName: `${s.user.firstName} ${s.user.lastName || ''}`.trim(),
      customerName: 'Walk-in',
      itemCount: s.items.length,
      totalAmount: Number(s.grandTotal),
      grandTotal: Number(s.grandTotal),
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt
    })),
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      productName: t.product.name,
      productSku: t.product.sku,
      transactionType: t.transactionType,
      quantity: Number(t.quantity),
      balanceAfter: Number(t.balanceAfter),
      userName: `${t.user.firstName} ${t.user.lastName || ''}`.trim(),
      reason: t.reason,
      createdAt: t.createdAt
    }))
  };
}

async function getSalesTrend() {
  const days = 7;
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      select: { grandTotal: true }
    });

    const revenue = sales.reduce((acc, s) => acc + Number(s.grandTotal), 0);
    const dateLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    result.push({
      date: dateLabel,
      fullDate: start.toISOString().split('T')[0],
      salesCount: sales.length,
      revenue: Math.round(revenue * 100) / 100
    });
  }

  return result;
}

async function getTopProducts(limit = 5) {
  const topItems = await prisma.saleItem.groupBy({
    by: ['productId'],
    _sum: {
      quantity: true,
      lineTotal: true
    },
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    },
    take: limit
  });

  if (topItems.length === 0) {
    return [];
  }

  const productIds = topItems.map((ti) => ti.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true }
  });

  return topItems.map((ti) => {
    const prod = products.find((p) => p.id === ti.productId);
    return {
      productId: ti.productId,
      name: prod ? prod.name : 'Unknown Product',
      sku: prod ? prod.sku : '',
      category: prod?.category?.name || '',
      currentStock: prod ? Number(prod.currentStock) : 0,
      totalQuantitySold: Number(ti._sum.quantity || 0),
      totalRevenue: Math.round(Number(ti._sum.lineTotal || 0) * 100) / 100
    };
  });
}

async function getRecentActivity(limit = 10) {
  const transactions = await prisma.stockTransaction.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { name: true, sku: true, unit: true } },
      user: { select: { firstName: true, lastName: true } }
    }
  });

  return transactions.map((t) => ({
    id: t.id,
    activityType: t.transactionType,
    description: `${t.transactionType}: ${Number(t.quantity) > 0 ? '+' : ''}${t.quantity} ${t.product.name} (${t.reason || 'Stock Update'})`,
    productName: t.product.name,
    productSku: t.product.sku,
    quantity: Number(t.quantity),
    balanceAfter: Number(t.balanceAfter),
    userName: `${t.user.firstName} ${t.user.lastName || ''}`.trim(),
    createdAt: t.createdAt
  }));
}

module.exports = {
  getDashboardSummary,
  getSalesTrend,
  getTopProducts,
  getRecentActivity
};
