const express = require('express');
const router = express.Router();
const GrantController = require('../controllers/grantController');
const ApplicationController = require('../controllers/applicationController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/rbacMiddleware');

// 1. Create Grant: Only GRANTOR
router.post(
  '/',
  authenticateToken,
  authorizeRoles('GRANTOR'),
  GrantController.createGrant
);

// 2. List Grants: GRANTEE, GRANTOR, ADMIN
router.get(
  '/',
  authenticateToken,
  authorizeRoles('GRANTEE', 'GRANTOR', 'ADMIN'),
  GrantController.getAllGrants
);

// 3. Get Grant by ID: GRANTEE, GRANTOR, ADMIN
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('GRANTEE', 'GRANTOR', 'ADMIN'),
  GrantController.getGrantById
);

// 4. Update Grant: Only the GRANTOR who owns the grant
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('GRANTOR'),
  GrantController.updateGrant
);

// 5. Delete Grant: GRANTOR who owns it or ADMIN
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('GRANTOR', 'ADMIN'),
  GrantController.deleteGrant
);

// 6. Apply to Grant: Only GRANTEE
router.post(
  '/:id/apply',
  authenticateToken,
  authorizeRoles('GRANTEE'),
  ApplicationController.apply
);

// 7. View Grant Applications: Only the GRANTOR who owns the grant (service validates ownership)
router.get(
  '/:id/applications',
  authenticateToken,
  authorizeRoles('GRANTOR', 'ADMIN'),
  ApplicationController.getGrantApplications
);

module.exports = router;
