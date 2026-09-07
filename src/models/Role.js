const db = require('../config/db');

class Role {
  static async findByName(name) {
    const res = await db.query('SELECT * FROM roles WHERE name = $1', [name]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const res = await db.query('SELECT * FROM roles WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findAll() {
    const res = await db.query('SELECT * FROM roles ORDER BY id ASC');
    return res.rows;
  }
}

module.exports = Role;
