const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

async function seedDatabase() {
  try {
    console.log('Beginning database seeding...');

    // 1. Seed Roles
    const roles = ['ADMIN', 'GRANTOR', 'GRANTEE'];
    for (const roleName of roles) {
      await db.query(
        'INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [roleName]
      );
    }
    console.log('Roles seeded: ADMIN, GRANTOR, GRANTEE');

    // 2. Seed Default Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@grantportal.io';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const userResult = await db.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE 
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
       RETURNING id, name, email`,
      [adminName, adminEmail, passwordHash]
    );

    const adminUserId = userResult.rows[0].id;

    // 3. Assign ADMIN role
    const adminRoleRes = await db.query('SELECT id FROM roles WHERE name = $1', ['ADMIN']);
    if (adminRoleRes.rows.length > 0) {
      const adminRoleId = adminRoleRes.rows[0].id;
      await db.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [adminUserId, adminRoleId]
      );
    }

    console.log(`Admin user successfully verified/seeded: ${adminEmail} (Role: ADMIN)`);
    return true;
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await db.initializeDatabase();
      await seedDatabase();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  })();
}

module.exports = { seedDatabase };
