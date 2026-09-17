const dashboardService = require('./dashboard.service');
const { sendSuccess } = require('../../utils/responseEnvelope');

async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary();
    return sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}

async function getSalesTrend(req, res, next) {
  try {
    const trend = await dashboardService.getSalesTrend();
    return sendSuccess(res, trend);
  } catch (error) {
    next(error);
  }
}

async function getTopProducts(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const top = await dashboardService.getTopProducts(limit);
    return sendSuccess(res, top);
  } catch (error) {
    next(error);
  }
}

async function getRecentActivity(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const activity = await dashboardService.getRecentActivity(limit);
    return sendSuccess(res, activity);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary,
  getSalesTrend,
  getTopProducts,
  getRecentActivity
};

