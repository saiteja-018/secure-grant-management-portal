-- Seed Roles
INSERT INTO roles (name) VALUES 
('ADMIN'),
('GRANTOR'),
('GRANTEE')
ON CONFLICT (name) DO NOTHING;

-- Seed Default Admin User (Password: AdminPassword123!)
-- Hash generated using bcrypt: $2a$10$iZpXgGz6oTskKjZ3k6V4uOz1Y1zY01e8iTjD246d8h7RzWw1JzQ8y
INSERT INTO users (id, name, email, password_hash, oauth_provider)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'System Administrator',
    'admin@grantportal.io',
    '$2a$10$bSjL3Xn6d9Fh6009L79ZNu7mG5Q1m8Kzp/g5PzK.pfn2mQ7xIeO6W',
    NULL
)
ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name;

-- Assign ADMIN role to the default admin user
INSERT INTO user_roles (user_id, role_id)
SELECT 
    u.id, 
    r.id 
FROM users u, roles r 
WHERE u.email = 'admin@grantportal.io' AND r.name = 'ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;
