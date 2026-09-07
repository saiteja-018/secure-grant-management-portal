const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/rbacMiddleware');

// ADMIN-only role assignment endpoint
router.post(
  '/:userId/roles',
  authenticateToken,
  authorizeRoles('ADMIN'),
  UserController.assignRole
);

// ADMIN-only user listing
router.get(
  '/',
  authenticateToken,
  authorizeRoles('ADMIN'),
  UserController.getAllUsers
);

// Get specific user
router.get(
  '/:userId',
  authenticateToken,
  UserController.getUser
);

module.exports = router;
