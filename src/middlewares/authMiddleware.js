const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'grant_portal_super_secret_jwt_key_default';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized: Authorization header missing'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Unauthorized: Format must be Bearer <token>'
    });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, roles, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired token'
    });
  }
}

module.exports = authenticateToken;
