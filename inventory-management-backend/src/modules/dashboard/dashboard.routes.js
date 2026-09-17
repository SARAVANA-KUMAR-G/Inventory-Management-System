const express = require('express');
const dashboardController = require('./dashboard.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/summary', authorize([ROLES.ADMIN, ROLES.STAFF]), dashboardController.getSummary);
router.get('/sales-trend', authorize([ROLES.ADMIN, ROLES.STAFF]), dashboardController.getSalesTrend);
router.get('/top-products', authorize([ROLES.ADMIN, ROLES.STAFF]), dashboardController.getTopProducts);
router.get('/recent-activity', authorize([ROLES.ADMIN, ROLES.STAFF]), dashboardController.getRecentActivity);

module.exports = router;
