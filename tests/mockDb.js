// In-memory mock database for fast, isolated, deterministic unit/integration testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
const bcrypt = require('bcryptjs');

class MockDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.roles = [
      { id: 1, name: 'ADMIN' },
      { id: 2, name: 'GRANTOR' },
      { id: 3, name: 'GRANTEE' }
    ];

    const adminHash = bcrypt.hashSync('AdminPassword123!', 1);
    this.users = [
      {
        id: 'admin-uuid-1',
        name: 'System Administrator',
        email: 'admin@grantportal.io',
        password_hash: adminHash,
        oauth_provider: null,
        oauth_id: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    this.user_roles = [
      { user_id: 'admin-uuid-1', role_id: 1 }
    ];

    this.grants = [];
    this.applications = [];
    this.nextId = 100;
  }

  async query(text, params = []) {
    const q = text.trim();

    // 1. ROLES QUERIES
    if (q.includes('SELECT * FROM roles WHERE name = $1')) {
      const role = this.roles.find(r => r.name.toUpperCase() === params[0].toUpperCase());
      return { rows: role ? [role] : [] };
    }
    if (q.includes('SELECT * FROM roles WHERE id = $1')) {
      const role = this.roles.find(r => r.id === parseInt(params[0]));
      return { rows: role ? [role] : [] };
    }
    if (q.includes('SELECT * FROM roles ORDER BY id ASC') || q.includes('SELECT id FROM roles WHERE name = $1')) {
      if (params.length > 0) {
        const role = this.roles.find(r => r.name.toUpperCase() === params[0].toUpperCase());
        return { rows: role ? [role] : [] };
      }
      return { rows: [...this.roles] };
    }
    if (q.startsWith('INSERT INTO roles')) {
      return { rows: [] };
    }

    // 2. USERS QUERIES
    if (q.includes('SELECT * FROM users WHERE LOWER(email) = LOWER($1)')) {
      const user = this.users.find(u => u.email.toLowerCase() === params[0].toLowerCase());
      return { rows: user ? [user] : [] };
    }
    if (q.includes('SELECT id, name, email, oauth_provider, created_at, updated_at FROM users WHERE id = $1') ||
        q.includes('SELECT * FROM users WHERE id = $1')) {
      const user = this.users.find(u => u.id === params[0]);
      return { rows: user ? [user] : [] };
    }
    if (q.includes('SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2')) {
      const user = this.users.find(u => u.oauth_provider === params[0] && u.oauth_id === params[1]);
      return { rows: user ? [user] : [] };
    }
    if (q.includes('SELECT r.name') && q.includes('FROM roles r') && q.includes('WHERE ur.user_id = $1')) {
      const userRoles = this.user_roles.filter(ur => ur.user_id === params[0]);
      const rows = userRoles.map(ur => {
        const r = this.roles.find(role => role.id === ur.role_id);
        return { name: r ? r.name : '' };
      });
      return { rows };
    }
    if (q.startsWith('INSERT INTO users')) {
      const id = `user-uuid-${this.nextId++}`;
      const newUser = {
        id,
        name: params[0],
        email: params[1].toLowerCase(),
        password_hash: params[2] || null,
        oauth_provider: params[3] || null,
        oauth_id: params[4] || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.users.push(newUser);
      return { rows: [newUser] };
    }
    if (q.startsWith('INSERT INTO user_roles')) {
      const existing = this.user_roles.find(ur => ur.user_id === params[0] && ur.role_id === params[1]);
      if (!existing) {
        this.user_roles.push({ user_id: params[0], role_id: params[1] });
      }
      return { rows: [{ user_id: params[0], role_id: params[1] }] };
    }
    if (q.includes('SELECT u.id, u.name, u.email') && q.includes('FROM users u')) {
      const rows = this.users.map(u => {
        const roles = this.user_roles
          .filter(ur => ur.user_id === u.id)
          .map(ur => this.roles.find(r => r.id === ur.role_id)?.name)
          .filter(Boolean);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          oauth_provider: u.oauth_provider,
          created_at: u.created_at,
          roles
        };
      });
      return { rows };
    }

    // 3. GRANTS QUERIES
    if (q.startsWith('INSERT INTO grants')) {
      const id = `grant-uuid-${this.nextId++}`;
      const newGrant = {
        id,
        title: params[0],
        description: params[1],
        amount: parseFloat(params[2]),
        grantor_id: params[3],
        created_at: new Date(),
        updated_at: new Date()
      };
      this.grants.push(newGrant);
      return { rows: [newGrant] };
    }
    if (q.includes('SELECT g.*') && q.includes('WHERE g.id = $1')) {
      const grant = this.grants.find(g => g.id === params[0]);
      if (!grant) return { rows: [] };
      const grantor = this.users.find(u => u.id === grant.grantor_id);
      return {
        rows: [{
          ...grant,
          grantor_name: grantor ? grantor.name : 'Unknown',
          grantor_email: grantor ? grantor.email : 'unknown@example.com'
        }]
      };
    }
    if (q.includes('SELECT g.*') && q.includes('ORDER BY g.created_at DESC')) {
      const rows = this.grants.map(grant => {
        const grantor = this.users.find(u => u.id === grant.grantor_id);
        return {
          ...grant,
          grantor_name: grantor ? grantor.name : 'Unknown',
          grantor_email: grantor ? grantor.email : 'unknown@example.com'
        };
      });
      return { rows };
    }
    if (q.startsWith('UPDATE grants')) {
      const grant = this.grants.find(g => g.id === params[3]);
      if (!grant) return { rows: [] };
      if (params[0] !== undefined && params[0] !== null) grant.title = params[0];
      if (params[1] !== undefined && params[1] !== null) grant.description = params[1];
      if (params[2] !== undefined && params[2] !== null) grant.amount = parseFloat(params[2]);
      grant.updated_at = new Date();
      return { rows: [grant] };
    }
    if (q.startsWith('DELETE FROM grants WHERE id = $1')) {
      const idx = this.grants.findIndex(g => g.id === params[0]);
      if (idx !== -1) {
        this.grants.splice(idx, 1);
        return { rows: [{ id: params[0] }] };
      }
      return { rows: [] };
    }

    // 4. APPLICATIONS QUERIES
    if (q.startsWith('INSERT INTO applications')) {
      const id = `app-uuid-${this.nextId++}`;
      const newApp = {
        id,
        grant_id: params[0],
        grantee_id: params[1],
        proposal: params[2],
        status: 'submitted',
        created_at: new Date(),
        updated_at: new Date()
      };
      this.applications.push(newApp);
      return { rows: [newApp] };
    }
    if (q.includes('SELECT a.*') && q.includes('WHERE a.id = $1')) {
      const app = this.applications.find(a => a.id === params[0]);
      if (!app) return { rows: [] };
      const grant = this.grants.find(g => g.id === app.grant_id);
      const grantee = this.users.find(u => u.id === app.grantee_id);
      return {
        rows: [{
          ...app,
          grant_title: grant ? grant.title : '',
          grantor_id: grant ? grant.grantor_id : null,
          grantee_name: grantee ? grantee.name : '',
          grantee_email: grantee ? grantee.email : ''
        }]
      };
    }
    if (q.includes('SELECT a.*') && q.includes('WHERE a.grant_id = $1')) {
      const apps = this.applications.filter(a => a.grant_id === params[0]);
      const rows = apps.map(app => {
        const grantee = this.users.find(u => u.id === app.grantee_id);
        return {
          ...app,
          grantee_name: grantee ? grantee.name : '',
          grantee_email: grantee ? grantee.email : ''
        };
      });
      return { rows };
    }
    if (q.includes('SELECT a.*') && q.includes('WHERE a.grantee_id = $1')) {
      const apps = this.applications.filter(a => a.grantee_id === params[0]);
      const rows = apps.map(app => {
        const grant = this.grants.find(g => g.id === app.grant_id);
        return {
          ...app,
          grant_title: grant ? grant.title : '',
          grant_amount: grant ? grant.amount : 0,
          grantor_id: grant ? grant.grantor_id : null
        };
      });
      return { rows };
    }
    if (q.startsWith('UPDATE applications')) {
      const app = this.applications.find(a => a.id === params[1]);
      if (!app) return { rows: [] };
      app.status = params[0];
      app.updated_at = new Date();
      return { rows: [app] };
    }

    // Health check query
    if (q === 'SELECT 1') {
      return { rows: [{ '?column?': 1 }] };
    }

    return { rows: [] };
  }
}

const mockDb = new MockDatabase();

module.exports = {
  mockDb,
  query: (text, params) => mockDb.query(text, params),
  pool: {
    connect: async () => ({
      query: (text, params) => mockDb.query(text, params),
      release: () => {}
    }),
    end: async () => {}
  },
  initializeDatabase: async () => true
};
