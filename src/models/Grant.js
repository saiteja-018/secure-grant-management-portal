const db = require('../config/db');

class Grant {
  static async create({ title, description, amount, grantorId }) {
    const res = await db.query(
      `INSERT INTO grants (title, description, amount, grantor_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description, amount, grantorId]
    );
    return res.rows[0];
  }

  static async findById(id) {
    const res = await db.query(
      `SELECT g.*, u.name as grantor_name, u.email as grantor_email
       FROM grants g
       JOIN users u ON g.grantor_id = u.id
       WHERE g.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findAll() {
    const res = await db.query(
      `SELECT g.*, u.name as grantor_name, u.email as grantor_email
       FROM grants g
       JOIN users u ON g.grantor_id = u.id
       ORDER BY g.created_at DESC`
    );
    return res.rows;
  }

  static async update(id, { title, description, amount }) {
    const res = await db.query(
      `UPDATE grants
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           amount = COALESCE($3, amount),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title, description, amount, id]
    );
    return res.rows[0] || null;
  }

  static async delete(id) {
    const res = await db.query('DELETE FROM grants WHERE id = $1 RETURNING id', [id]);
    return res.rows[0] || null;
  }

  static async findByGrantorId(grantorId) {
    const res = await db.query(
      `SELECT * FROM grants WHERE grantor_id = $1 ORDER BY created_at DESC`,
      [grantorId]
    );
    return res.rows;
  }
}

module.exports = Grant;
