const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authenticateToken = require('../middlewares/authMiddleware');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// OAuth 2.0 endpoints
router.get('/google', AuthController.googleRedirect);
router.get('/google/callback', AuthController.googleCallback);

// Current user profile
router.get('/me', authenticateToken, AuthController.me);

module.exports = router;
