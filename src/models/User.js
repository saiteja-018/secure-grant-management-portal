const db = require('../config/db');

class User {
  static async create({ name, email, passwordHash = null, oauthProvider = null, oauthId = null }) {
    const res = await db.query(
      `INSERT INTO users (name, email, password_hash, oauth_provider, oauth_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, oauth_provider, created_at, updated_at`,
      [name, email.toLowerCase(), passwordHash, oauthProvider, oauthId]
    );
    return res.rows[0];
  }

  static async findByEmail(email) {
    const res = await db.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return res.rows[0] || null;
  }

  static async findById(id) {
    const res = await db.query(
      `SELECT id, name, email, oauth_provider, created_at, updated_at FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByOAuth(provider, oauthId) {
    const res = await db.query(
      `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2`,
      [provider, oauthId]
    );
    return res.rows[0] || null;
  }

  static async getRoles(userId) {
    const res = await db.query(
      `SELECT r.name 
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return res.rows.map((row) => row.name);
  }

  static async addRole(userId, roleId) {
    const res = await db.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING
       RETURNING user_id, role_id`,
      [userId, roleId]
    );
    return res.rows[0] || null;
  }

  static async findAll() {
    const res = await db.query(
      `SELECT u.id, u.name, u.email, u.oauth_provider, u.created_at,
              COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    return res.rows;
  }
}

module.exports = User;
