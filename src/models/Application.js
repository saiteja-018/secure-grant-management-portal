const db = require('../config/db');

class Application {
  static async create({ grantId, granteeId, proposal }) {
    const res = await db.query(
      `INSERT INTO applications (grant_id, grantee_id, proposal, status)
       VALUES ($1, $2, $3, 'submitted')
       RETURNING *`,
      [grantId, granteeId, proposal]
    );
    return res.rows[0];
  }

  static async findById(id) {
    const res = await db.query(
      `SELECT a.*, 
              g.title as grant_title, 
              g.grantor_id,
              u.name as grantee_name, 
              u.email as grantee_email
       FROM applications a
       JOIN grants g ON a.grant_id = g.id
       JOIN users u ON a.grantee_id = u.id
       WHERE a.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByGrantId(grantId) {
    const res = await db.query(
      `SELECT a.*, 
              u.name as grantee_name, 
              u.email as grantee_email
       FROM applications a
       JOIN users u ON a.grantee_id = u.id
       WHERE a.grant_id = $1
       ORDER BY a.created_at DESC`,
      [grantId]
    );
    return res.rows;
  }

  static async findByGranteeId(granteeId) {
    const res = await db.query(
      `SELECT a.*, 
              g.title as grant_title, 
              g.amount as grant_amount,
              g.grantor_id
       FROM applications a
       JOIN grants g ON a.grant_id = g.id
       WHERE a.grantee_id = $1
       ORDER BY a.created_at DESC`,
      [granteeId]
    );
    return res.rows;
  }

  static async updateStatus(id, status) {
    const res = await db.query(
      `UPDATE applications
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return res.rows[0] || null;
  }
}

module.exports = Application;
