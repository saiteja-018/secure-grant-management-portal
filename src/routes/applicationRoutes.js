const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/applicationController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/rbacMiddleware');

// Get current user's submitted applications (GRANTEE)
router.get(
  '/my',
  authenticateToken,
  authorizeRoles('GRANTEE'),
  ApplicationController.getMyApplications
);

// Get specific application: Submitting GRANTEE or GRANTOR of parent grant
router.get(
  '/:appId',
  authenticateToken,
  ApplicationController.getApplicationById
);

// Update status of application: GRANTOR of parent grant or ADMIN
router.patch(
  '/:appId/status',
  authenticateToken,
  authorizeRoles('GRANTOR', 'ADMIN'),
  ApplicationController.updateStatus
);

module.exports = router;
