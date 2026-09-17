const prisma = require('../../config/prisma');
const { NotFoundError, ConflictError, BusinessRuleError } = require('../../utils/errors');
const { StockTransactionType } = require('@prisma/client');

async function listProducts({
  page = 1,
  pageSize = 20,
  search = '',
  categoryId = '',
  stockStatus = '',
  sortBy = 'name',
  sortOrder = 'asc',
  includeInactive = false
}) {
  const skip = (page - 1) * pageSize;
  const where = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } }
    ];
  }

  const orderBy = {};
  if (['name', 'sku', 'sellingPrice', 'costPrice', 'currentStock', 'createdAt'].includes(sortBy)) {
    orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [totalItems, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    })
  ]);

  let items = products.map((p) => {
    const stock = Number(p.currentStock);
    const reorder = Number(p.reorderLevel);
    let calculatedStatus = 'IN_STOCK';
    if (stock <= 0) {
      calculatedStatus = 'OUT_OF_STOCK';
    } else if (stock <= reorder) {
      calculatedStatus = 'LOW_STOCK';
    }

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      barcode: p.barcode,
      unit: p.unit,
      categoryId: p.categoryId,
      categoryName: p.category ? p.category.name : null,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      currentStock: stock,
      reorderLevel: reorder,
      inventoryValue: Math.round(stock * Number(p.costPrice) * 100) / 100,
      stockStatus: calculatedStatus,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };
  });

  if (stockStatus) {
    const statusUpper = stockStatus.toUpperCase();
    if (['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].includes(statusUpper)) {
      items = items.filter((i) => i.stockStatus === statusUpper);
    }
  }

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

async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      stockTransactions: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });

  if (!product) throw new NotFoundError('Product not found');

  const stock = Number(product.currentStock);
  const reorder = Number(product.reorderLevel);
  let calculatedStatus = 'IN_STOCK';
  if (stock <= 0) {
    calculatedStatus = 'OUT_OF_STOCK';
  } else if (stock <= reorder) {
    calculatedStatus = 'LOW_STOCK';
  }

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    barcode: product.barcode,
    unit: product.unit,
    categoryId: product.categoryId,
    categoryName: product.category ? product.category.name : null,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    currentStock: stock,
    reorderLevel: reorder,
    inventoryValue: Math.round(stock * Number(product.costPrice) * 100) / 100,
    stockStatus: calculatedStatus,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    recentTransactions: product.stockTransactions.map((st) => ({
      id: st.id,
      transactionType: st.transactionType,
      quantity: Number(st.quantity),
      balanceAfter: Number(st.balanceAfter),
      reason: st.reason,
      userName: `${st.user.firstName} ${st.user.lastName || ''}`.trim(),
      createdAt: st.createdAt
    }))
  };
}

async function createProduct(data, userId) {
  const sku = data.sku.trim();
  const existingSku = await prisma.product.findUnique({ where: { sku } });
  if (existingSku) {
    throw new ConflictError(`Product with SKU '${sku}' already exists`);
  }

  const barcode = data.barcode && data.barcode.trim() ? data.barcode.trim() : null;
  if (barcode) {
    const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
    if (existingBarcode) {
      throw new ConflictError(`Product with barcode '${barcode}' already exists`);
    }
  }

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const initialStock = Number(data.currentStock !== undefined ? data.currentStock : data.initialStock || 0);
  if (initialStock < 0) {
    throw new BusinessRuleError('Initial stock cannot be negative');
  }

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sku,
        name: data.name.trim(),
        categoryId: data.categoryId,
        barcode,
        unit: data.unit ? data.unit.trim() : 'pcs',
        costPrice: Number(data.costPrice || 0),
        sellingPrice: Number(data.sellingPrice || 0),
        currentStock: initialStock,
        reorderLevel: Number(data.reorderLevel || 0),
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
      },
      include: {
        category: true
      }
    });

    if (initialStock > 0) {
      await tx.stockTransaction.create({
        data: {
          productId: product.id,
          userId,
          transactionType: StockTransactionType.STOCK_IN,
          quantity: initialStock,
          balanceAfter: initialStock,
          reason: 'Initial opening stock'
        }
      });
    }

    return product;
  });
}

async function updateProduct(id, data) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Product not found');

  if (data.sku && data.sku.trim() !== existing.sku) {
    const dup = await prisma.product.findUnique({ where: { sku: data.sku.trim() } });
    if (dup) throw new ConflictError(`Product with SKU '${data.sku.trim()}' already exists`);
  }

  if (data.barcode !== undefined) {
    const barcode = data.barcode && data.barcode.trim() ? data.barcode.trim() : null;
    if (barcode && barcode !== existing.barcode) {
      const dup = await prisma.product.findUnique({ where: { barcode } });
      if (dup) throw new ConflictError(`Product with barcode '${barcode}' already exists`);
    }
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new NotFoundError('Category not found');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      sku: data.sku ? data.sku.trim() : undefined,
      name: data.name ? data.name.trim() : undefined,
      categoryId: data.categoryId || undefined,
      barcode: data.barcode !== undefined ? (data.barcode?.trim() || null) : undefined,
      unit: data.unit ? data.unit.trim() : undefined,
      costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
      sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
      reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : undefined,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined
    },
    include: {
      category: true
    }
  });

  return updated;
}

async function deactivateProduct(id) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Product not found');

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: false }
  });

  return updated;
}

async function exportProductsCsv() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: { category: true }
  });

  const header = ['SKU', 'Name', 'Category', 'Barcode', 'Unit', 'Cost Price', 'Selling Price', 'Current Stock', 'Reorder Level', 'Stock Status'];
  const rows = products.map((p) => {
    const stock = Number(p.currentStock);
    const reorder = Number(p.reorderLevel);
    let status = 'IN_STOCK';
    if (stock <= 0) status = 'OUT_OF_STOCK';
    else if (stock <= reorder) status = 'LOW_STOCK';

    return [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category ? p.category.name : ''}"`,
      `"${p.barcode || ''}"`,
      `"${p.unit}"`,
      Number(p.costPrice).toFixed(2),
      Number(p.sellingPrice).toFixed(2),
      stock,
      reorder,
      status
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

async function bulkImportProducts(records, userId) {
  let imported = 0;
  let failed = 0;
  const errors = [];

  const categories = await prisma.category.findMany();
  const categoryMap = new Map();
  categories.forEach((c) => {
    categoryMap.set(c.name.toLowerCase().trim(), c.id);
    categoryMap.set(c.id, c.id);
  });

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1;

    try {
      if (!row.sku || !row.sku.trim()) {
        throw new Error(`Row ${rowNum}: SKU is required`);
      }
      if (!row.name || !row.name.trim()) {
        throw new Error(`Row ${rowNum}: Product name is required`);
      }

      const sku = row.sku.trim();
      const existingSku = await prisma.product.findUnique({ where: { sku } });
      if (existingSku) {
        throw new Error(`Row ${rowNum}: SKU '${sku}' already exists`);
      }

      const barcode = row.barcode && String(row.barcode).trim() ? String(row.barcode).trim() : null;
      if (barcode) {
        const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
        if (existingBarcode) {
          throw new Error(`Row ${rowNum}: Barcode '${barcode}' already exists`);
        }
      }

      let catId = null;
      if (row.category) {
        const catKey = String(row.category).toLowerCase().trim();
        if (categoryMap.has(catKey)) {
          catId = categoryMap.get(catKey);
        } else {
          // Auto-create category if doesn't exist
          const newCat = await prisma.category.create({
            data: { name: String(row.category).trim() }
          });
          categoryMap.set(catKey, newCat.id);
          catId = newCat.id;
        }
      } else {
        throw new Error(`Row ${rowNum}: Category is required`);
      }

      const costPrice = parseFloat(row.costPrice) || 0;
      const sellingPrice = parseFloat(row.sellingPrice) || 0;
      const currentStock = parseFloat(row.currentStock) || 0;
      const reorderLevel = parseFloat(row.reorderLevel) || 0;

      if (currentStock < 0) {
        throw new Error(`Row ${rowNum}: Stock cannot be negative`);
      }

      await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            sku,
            name: String(row.name).trim(),
            categoryId: catId,
            barcode,
            unit: row.unit ? String(row.unit).trim() : 'pcs',
            costPrice,
            sellingPrice,
            currentStock,
            reorderLevel,
            isActive: true
          }
        });

        if (currentStock > 0) {
          await tx.stockTransaction.create({
            data: {
              productId: product.id,
              userId,
              transactionType: StockTransactionType.STOCK_IN,
              quantity: currentStock,
              balanceAfter: currentStock,
              reason: 'CSV Import opening stock'
            }
          });
        }
      });

      imported++;
    } catch (err) {
      failed++;
      errors.push(err.message);
    }
  }

  return { imported, failed, errors };
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  exportProductsCsv,
  bulkImportProducts
};
