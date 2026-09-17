const prisma = require('../../config/prisma');
const { NotFoundError, BusinessRuleError } = require('../../utils/errors');
const { StockTransactionType, PaymentMethod } = require('@prisma/client');

async function generateNextInvoiceNumber(tx) {
  const lastSale = await tx.sale.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true }
  });

  let nextSeq = 1;
  if (lastSale && lastSale.invoiceNumber) {
    const match = lastSale.invoiceNumber.match(/(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }
  return `INV-${String(nextSeq).padStart(6, '0')}`;
}

async function listSales({
  page = 1,
  pageSize = 20,
  invoiceNumber = '',
  paymentMethod = '',
  fromDate = '',
  toDate = ''
}) {
  const skip = (page - 1) * pageSize;
  const where = {};

  if (paymentMethod && Object.values(PaymentMethod).includes(paymentMethod)) {
    where.paymentMethod = paymentMethod;
  }

  if (invoiceNumber) {
    where.invoiceNumber = { contains: invoiceNumber, mode: 'insensitive' };
  }

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [totalItems, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } }
          }
        }
      }
    })
  ]);

  // Aggregate returns for the retrieved sales
  const invoiceNumbers = sales.map((s) => s.invoiceNumber);
  const returnTransactions = invoiceNumbers.length > 0
    ? await prisma.stockTransaction.findMany({
        where: {
          transactionType: StockTransactionType.ADJUSTMENT_IN,
          OR: invoiceNumbers.map((inv) => ({ referenceId: { startsWith: `RETURN:${inv}:` } }))
        },
        select: { referenceId: true, quantity: true }
      })
    : [];

  const returnsByInvoice = {};
  for (const ret of returnTransactions) {
    if (ret.referenceId) {
      const parts = ret.referenceId.split(':');
      const inv = parts[1];
      if (inv) {
        returnsByInvoice[inv] = (returnsByInvoice[inv] || 0) + Number(ret.quantity);
      }
    }
  }

  const items = sales.map((s) => {
    let totalSaleUnits = 0;
    for (const si of s.items) {
      totalSaleUnits += Number(si.quantity);
    }
    const returnedUnits = returnsByInvoice[s.invoiceNumber] || 0;
    let status = 'COMPLETED';
    if (returnedUnits >= totalSaleUnits && totalSaleUnits > 0) {
      status = 'RETURNED';
    } else if (returnedUnits > 0) {
      status = 'PARTIALLY_RETURNED';
    }

    return {
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      customerName: 'Walk-in Customer',
      subtotal: Number(s.subtotal),
      discount: Number(s.discountAmount),
      discountAmount: Number(s.discountAmount),
      tax: Number(s.taxAmount),
      taxAmount: Number(s.taxAmount),
      grandTotal: Number(s.grandTotal),
      totalAmount: Number(s.grandTotal),
      paymentMethod: s.paymentMethod,
      status,
      totalUnits: totalSaleUnits,
      returnedUnits,
      itemCount: s.items.length,
      cashierName: `${s.user.firstName} ${s.user.lastName || ''}`.trim(),
      cashierId: s.userId,
      items: s.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        productSku: i.product.sku,
        unit: i.product.unit,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        costPrice: Number(i.costPrice),
        lineTotal: Number(i.lineTotal),
        totalPrice: Number(i.lineTotal)
      })),
      createdAt: s.createdAt
    };
  });

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

async function getSaleById(id) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } }
        }
      }
    }
  });

  if (!sale) throw new NotFoundError('Sale not found');

  const returnTransactions = await prisma.stockTransaction.findMany({
    where: {
      transactionType: StockTransactionType.ADJUSTMENT_IN,
      referenceId: { startsWith: `RETURN:${sale.invoiceNumber}:` }
    },
    select: { referenceId: true, quantity: true }
  });

  const alreadyReturnedMap = {};
  for (const ret of returnTransactions) {
    if (ret.referenceId) {
      const parts = ret.referenceId.split(':');
      const saleItemId = parts[2];
      if (saleItemId) {
        alreadyReturnedMap[saleItemId] = (alreadyReturnedMap[saleItemId] || 0) + Number(ret.quantity);
      }
    }
  }

  let totalSaleUnits = 0;
  let totalReturnedUnits = 0;

  const items = sale.items.map((i) => {
    const qty = Number(i.quantity);
    const returnedQty = alreadyReturnedMap[i.id] || 0;
    totalSaleUnits += qty;
    totalReturnedUnits += returnedQty;

    return {
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      unit: i.product.unit,
      quantity: qty,
      returnedQuantity: returnedQty,
      returnableQuantity: Math.max(0, qty - returnedQty),
      unitPrice: Number(i.unitPrice),
      costPrice: Number(i.costPrice),
      lineTotal: Number(i.lineTotal),
      totalPrice: Number(i.lineTotal),
      currentStock: Number(i.product.currentStock)
    };
  });

  let status = 'COMPLETED';
  if (totalReturnedUnits >= totalSaleUnits && totalSaleUnits > 0) {
    status = 'RETURNED';
  } else if (totalReturnedUnits > 0) {
    status = 'PARTIALLY_RETURNED';
  }

  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    customerName: 'Walk-in Customer',
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discountAmount),
    discountAmount: Number(sale.discountAmount),
    tax: Number(sale.taxAmount),
    taxAmount: Number(sale.taxAmount),
    grandTotal: Number(sale.grandTotal),
    totalAmount: Number(sale.grandTotal),
    paymentMethod: sale.paymentMethod,
    status,
    totalSaleUnits,
    totalReturnedUnits,
    cashierName: `${sale.user.firstName} ${sale.user.lastName || ''}`.trim(),
    cashierId: sale.userId,
    createdAt: sale.createdAt,
    items
  };
}

async function createSale(data, cashierId) {
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new BusinessRuleError('At least one item is required to complete a sale');
  }

  const validPaymentMethods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.UPI, PaymentMethod.OTHER];
  const paymentMethod = data.paymentMethod && validPaymentMethods.includes(data.paymentMethod)
    ? data.paymentMethod
    : PaymentMethod.CASH;

  return await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    const saleItemsData = [];
    const stockUpdates = [];

    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        throw new NotFoundError(`Product not found: ${item.productId}`);
      }

      if (!product.isActive) {
        throw new BusinessRuleError(`Product '${product.name}' is inactive and cannot be sold`);
      }

      const qty = Number(item.quantity);
      if (!qty || qty <= 0) {
        throw new BusinessRuleError(`Invalid quantity (${item.quantity}) for product '${product.name}'`);
      }

      const currentStock = Number(product.currentStock);
      if (currentStock < qty) {
        throw new BusinessRuleError(
          `Insufficient stock for '${product.name}'. Available: ${currentStock}, Requested: ${qty}`
        );
      }

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.sellingPrice);
      if (unitPrice < 0) {
        throw new BusinessRuleError(`Unit price cannot be negative for '${product.name}'`);
      }

      const costPrice = Number(product.costPrice || 0);
      const lineTotal = Math.round(qty * unitPrice * 100) / 100;
      subtotal += lineTotal;

      saleItemsData.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
        costPrice,
        lineTotal
      });

      stockUpdates.push({
        product,
        qty,
        newStock: currentStock - qty
      });
    }

    const discountAmount = Math.max(0, Number(data.discount || data.discountAmount || 0));
    const taxAmount = Math.max(0, Number(data.tax || data.taxAmount || 0));
    const grandTotal = Math.max(0, Math.round((subtotal - discountAmount + taxAmount) * 100) / 100);

    const invoiceNumber = await generateNextInvoiceNumber(tx);

    // 1. Create Sale
    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        userId: cashierId,
        paymentMethod,
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        items: {
          create: saleItemsData
        }
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } }
          }
        }
      }
    });

    // 2. Atomically deduct stock and create StockTransactions
    for (const update of stockUpdates) {
      await tx.product.update({
        where: { id: update.product.id },
        data: { currentStock: update.newStock }
      });

      await tx.stockTransaction.create({
        data: {
          productId: update.product.id,
          userId: cashierId,
          transactionType: StockTransactionType.SALE,
          quantity: -update.qty,
          balanceAfter: update.newStock,
          referenceId: sale.id,
          reason: `POS Sale ${invoiceNumber}`
        }
      });
    }

    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerName: data.customerName || 'Walk-in Customer',
      customerPhone: data.customerPhone || null,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discountAmount),
      discountAmount: Number(sale.discountAmount),
      tax: Number(sale.taxAmount),
      taxAmount: Number(sale.taxAmount),
      grandTotal: Number(sale.grandTotal),
      totalAmount: Number(sale.grandTotal),
      paymentMethod: sale.paymentMethod,
      cashierName: `${sale.user.firstName} ${sale.user.lastName || ''}`.trim(),
      items: sale.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        productSku: i.product.sku,
        unit: i.product.unit,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        costPrice: Number(i.costPrice),
        lineTotal: Number(i.lineTotal),
        totalPrice: Number(i.lineTotal)
      })),
      createdAt: sale.createdAt
    };
  });
}

async function processReturn({ saleId, items, reason, notes, userId }) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new BusinessRuleError('At least one item must be specified for return');
  }

  const returnReason = reason ? reason.trim() : 'Customer Return';
  const fullReasonText = notes ? `${returnReason} - ${notes.trim()}` : returnReason;

  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!sale) {
      throw new NotFoundError('Sale not found');
    }

    // Find all existing return transactions for this invoice
    const existingReturns = await tx.stockTransaction.findMany({
      where: {
        transactionType: StockTransactionType.ADJUSTMENT_IN,
        referenceId: { startsWith: `RETURN:${sale.invoiceNumber}:` }
      }
    });

    const alreadyReturnedMap = {};
    for (const ret of existingReturns) {
      if (ret.referenceId) {
        const parts = ret.referenceId.split(':');
        const saleItemId = parts[2];
        if (saleItemId) {
          alreadyReturnedMap[saleItemId] = (alreadyReturnedMap[saleItemId] || 0) + Number(ret.quantity);
        }
      }
    }

    let totalRefundAmount = 0;
    const processedItems = [];

    for (const returnReq of items) {
      const returnQty = Number(returnReq.quantity);
      if (!returnQty || returnQty <= 0) continue;

      const saleItem = sale.items.find(
        (si) => si.id === returnReq.saleItemId || si.productId === returnReq.productId
      );

      if (!saleItem) {
        throw new NotFoundError(`Sale item not found for return: ${returnReq.saleItemId || returnReq.productId}`);
      }

      const originalQty = Number(saleItem.quantity);
      const alreadyReturned = alreadyReturnedMap[saleItem.id] || 0;
      const remainingReturnable = originalQty - alreadyReturned;

      if (returnQty > remainingReturnable) {
        throw new BusinessRuleError(
          `Cannot return ${returnQty} units of '${saleItem.product.name}'. Remaining returnable quantity is ${remainingReturnable}.`
        );
      }

      // 1. Restore product currentStock atomically
      const currentStock = Number(saleItem.product.currentStock);
      const newStock = currentStock + returnQty;

      await tx.product.update({
        where: { id: saleItem.productId },
        data: { currentStock: newStock }
      });

      // 2. Compute refund for this line item (proportional to lineTotal / originalQty)
      const unitRefund = Number(saleItem.lineTotal) / originalQty;
      const itemRefundTotal = Number((unitRefund * returnQty).toFixed(2));
      totalRefundAmount += itemRefundTotal;

      // 3. Record StockTransaction with referenceId
      const transaction = await tx.stockTransaction.create({
        data: {
          productId: saleItem.productId,
          userId,
          transactionType: StockTransactionType.ADJUSTMENT_IN,
          quantity: returnQty,
          balanceAfter: newStock,
          reason: `Customer Return: ${sale.invoiceNumber} (${saleItem.product.name} x${returnQty}) - ${fullReasonText}`,
          referenceId: `RETURN:${sale.invoiceNumber}:${saleItem.id}`
        }
      });

      alreadyReturnedMap[saleItem.id] = alreadyReturned + returnQty;

      processedItems.push({
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        productName: saleItem.product.name,
        quantityReturned: returnQty,
        unitRefund,
        itemRefundTotal,
        transactionId: transaction.id
      });
    }

    if (processedItems.length === 0) {
      throw new BusinessRuleError('Please specify a return quantity greater than zero for at least one item');
    }

    // Determine updated status of the sale
    let totalSaleUnits = 0;
    let totalReturnedUnits = 0;
    for (const si of sale.items) {
      totalSaleUnits += Number(si.quantity);
      totalReturnedUnits += (alreadyReturnedMap[si.id] || 0);
    }

    let status = 'COMPLETED';
    if (totalReturnedUnits >= totalSaleUnits && totalSaleUnits > 0) {
      status = 'RETURNED';
    } else if (totalReturnedUnits > 0) {
      status = 'PARTIALLY_RETURNED';
    }

    return {
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      status,
      totalRefundAmount: Number(totalRefundAmount.toFixed(2)),
      items: processedItems
    };
  });
}

module.exports = {
  listSales,
  getSaleById,
  createSale,
  processReturn
};
