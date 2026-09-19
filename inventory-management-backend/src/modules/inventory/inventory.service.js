const prisma = require('../../config/prisma');
const { NotFoundError, BusinessRuleError } = require('../../utils/errors');
const { StockTransactionType } = require('@prisma/client');

async function recordStockIn({ productId, quantity, unitCost, supplier, notes, userId }) {
  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw new BusinessRuleError('Stock in quantity must be greater than zero');
  }

  const cost = unitCost !== undefined ? Number(unitCost) : null;
  if (cost !== null && cost < 0) {
    throw new BusinessRuleError('Unit cost cannot be negative');
  }

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const currentStock = Number(product.currentStock);
    const newStock = currentStock + qty;

    const updateData = {
      currentStock: newStock
    };
    if (cost !== null && cost > 0) {
      updateData.costPrice = cost;
    }

    await tx.product.update({
      where: { id: productId },
      data: updateData
    });

    const reasonText = supplier ? `Stock In from ${supplier.trim()}` : 'Stock In';

    const transaction = await tx.stockTransaction.create({
      data: {
        productId,
        userId,
        transactionType: StockTransactionType.STOCK_IN,
        quantity: qty,
        balanceAfter: newStock,
        reason: notes ? `${reasonText} (${notes.trim()})` : reasonText,
        referenceId: supplier ? supplier.trim() : null
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        previousStock: currentStock,
        currentStock: newStock
      },
      transaction
    };
  });
}

async function recordAdjustment({ productId, type, quantity, reason, notes, userId }) {
  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw new BusinessRuleError('Adjustment quantity must be greater than zero');
  }

  if (type !== StockTransactionType.ADJUSTMENT_IN && type !== StockTransactionType.ADJUSTMENT_OUT) {
    throw new BusinessRuleError("Adjustment type must be either 'ADJUSTMENT_IN' or 'ADJUSTMENT_OUT'");
  }

  const validReasons = [
    'Damaged', 'Expired', 'Lost', 'Correction', 'Other',
    'Missed Count', 'Late Arrival', 'Customer Return', 'Audit Surplus'
  ];
  const defaultReason = type === StockTransactionType.ADJUSTMENT_IN ? 'Missed Count' : 'Correction';
  const reasonCategory = reason && (validReasons.includes(reason) || reason.trim().length > 0)
    ? reason.trim()
    : defaultReason;

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const currentStock = Number(product.currentStock);
    let newStock;
    let transactionQuantity;

    if (type === StockTransactionType.ADJUSTMENT_IN) {
      newStock = currentStock + qty;
      transactionQuantity = qty;
    } else {
      // Stock Out / Reduction
      if (currentStock - qty < 0) {
        throw new BusinessRuleError(
          `Insufficient stock. Current stock is ${currentStock}, cannot remove ${qty} units. Negative stock is not allowed.`
        );
      }
      newStock = currentStock - qty;
      transactionQuantity = -qty;
    }

    await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock }
    });

    const fullReason = notes ? `${reasonCategory} - ${notes.trim()}` : reasonCategory;

    const transaction = await tx.stockTransaction.create({
      data: {
        productId,
        userId,
        transactionType: type,
        quantity: transactionQuantity,
        balanceAfter: newStock,
        reason: fullReason
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        previousStock: currentStock,
        currentStock: newStock
      },
      transaction
    };
  });
}

async function listStockTransactions({
  page = 1,
  pageSize = 20,
  productId = '',
  transactionType = '',
  fromDate = '',
  toDate = ''
}) {
  const skip = (page - 1) * pageSize;
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

  const [totalItems, transactions] = await Promise.all([
    prisma.stockTransaction.count({ where }),
    prisma.stockTransaction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    })
  ]);

  const items = transactions.map((t) => ({
    id: t.id,
    productId: t.productId,
    productName: t.product.name,
    productSku: t.product.sku,
    unit: t.product.unit,
    transactionType: t.transactionType,
    quantity: Number(t.quantity),
    balanceAfter: Number(t.balanceAfter),
    reason: t.reason,
    userName: t.user ? `${t.user.firstName} ${t.user.lastName || ''}`.trim() || 'Deleted User' : 'Deleted User',
    createdAt: t.createdAt
  }));

  return {
    items,
    meta: {
      page: Number(page),
      pageSize: Number(pageSize),
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    }
  };
}

async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { currentStock: 'asc' }
  });

  return products
    .filter((p) => Number(p.currentStock) > 0 && Number(p.currentStock) <= Number(p.reorderLevel))
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.category ? p.category.name : null,
      currentStock: Number(p.currentStock),
      reorderLevel: Number(p.reorderLevel),
      unit: p.unit,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice)
    }));
}

async function getOutOfStockProducts() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      currentStock: { lte: 0 }
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' }
  });

  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    categoryName: p.category ? p.category.name : null,
    currentStock: Number(p.currentStock),
    reorderLevel: Number(p.reorderLevel),
    unit: p.unit,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice)
  }));
}

async function getLastSupplier(productId) {
  const lastTx = await prisma.stockTransaction.findFirst({
    where: {
      productId,
      transactionType: StockTransactionType.STOCK_IN
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!lastTx) return { supplier: null };

  if (lastTx.referenceId) {
    return { supplier: lastTx.referenceId };
  }

  if (lastTx.reason) {
    const match = lastTx.reason.match(/Stock In from ([^(]+)/);
    if (match) return { supplier: match[1].trim() };
  }

  return { supplier: null };
}

module.exports = {
  recordStockIn,
  recordAdjustment,
  listStockTransactions,
  getLowStockProducts,
  getOutOfStockProducts,
  getLastSupplier
};

