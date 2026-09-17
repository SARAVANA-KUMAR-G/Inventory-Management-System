const productService = require('./product.service');
const { sendSuccess } = require('../../utils/responseEnvelope');

async function listProducts(req, res, next) {
  try {
    const { page, pageSize, search, categoryId, stockStatus, sortBy, sortOrder, includeInactive } = req.query;
    const result = await productService.listProducts({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      search,
      categoryId,
      stockStatus,
      sortBy,
      sortOrder,
      includeInactive: includeInactive === 'true'
    });
    return sendSuccess(res, result.items, result.meta);
  } catch (error) {
    next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    return sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body, req.user.id);
    return sendSuccess(res, product, null, 201);
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

async function deactivateProduct(req, res, next) {
  try {
    const product = await productService.deactivateProduct(req.params.id);
    return sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

async function exportProducts(req, res, next) {
  try {
    const csvContent = await productService.exportProductsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-products.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

async function importProducts(req, res, next) {
  try {
    // Accepts either JSON array in req.body.products, or parses CSV text in req.body.csv
    let records = [];

    if (Array.isArray(req.body.products)) {
      records = req.body.products;
    } else if (typeof req.body.csv === 'string') {
      const lines = req.body.csv.trim().split(/\r?\n/);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const rowValues = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          if (rowValues.length >= 2) {
            const row = {};
            headers.forEach((h, idx) => {
              row[h] = rowValues[idx];
            });
            records.push({
              sku: row.sku,
              name: row.name,
              category: row.category,
              barcode: row.barcode,
              unit: row.unit,
              costPrice: row.costprice,
              sellingPrice: row.sellingprice,
              currentStock: row.currentstock,
              reorderLevel: row.reorderlevel
            });
          }
        }
      }
    } else {
      return res.status(400).json({ success: false, error: { message: 'Expected JSON products array or CSV string' } });
    }

    const result = await productService.bulkImportProducts(records, req.user.id);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  exportProducts,
  importProducts
};
