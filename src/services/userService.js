const User = require('../models/User');
const Role = require('../models/Role');

class UserService {
  static async assignRole(userId, roleName) {
    if (!roleName) {
      const error = new Error('roleName is required');
      error.status = 400;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    const role = await Role.findByName(roleName.toUpperCase());
    if (!role) {
      const error = new Error(`Role '${roleName}' not found`);
      error.status = 400;
      throw error;
    }

    await User.addRole(userId, role.id);
    const updatedRoles = await User.getRoles(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: updatedRoles
    };
  }

  static async getAllUsers() {
    return await User.findAll();
  }

  static async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    const roles = await User.getRoles(userId);
    return {
      ...user,
      roles
    };
  }
}

module.exports = UserService;
