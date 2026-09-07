const UserService = require('../services/userService');

class UserController {
  static async assignRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { roleName } = req.body;

      if (!roleName) {
        return res.status(400).json({ error: 'roleName is required' });
      }

      const updatedUser = await UserService.assignRole(userId, roleName);
      return res.status(200).json({
        message: `Role ${roleName} assigned successfully`,
        user: updatedUser
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllUsers(req, res, next) {
    try {
      const users = await UserService.getAllUsers();
      return res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  }

  static async getUser(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.userId);
      return res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
