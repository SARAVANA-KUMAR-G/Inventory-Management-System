const categoryService = require('./category.service');
const { sendSuccess } = require('../../utils/responseEnvelope');

async function listCategories(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await categoryService.listCategories(includeInactive);
    return sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    return sendSuccess(res, category, null, 201);
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
}

async function updateCategoryStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const category = await categoryService.updateCategory(req.params.id, { isActive });
    return sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
}

async function deactivateCategory(req, res, next) {
  try {
    const category = await categoryService.deactivateCategory(req.params.id);
    return sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deactivateCategory
};
