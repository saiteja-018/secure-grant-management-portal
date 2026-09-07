const GrantService = require('../services/grantService');

class GrantController {
  static async createGrant(req, res, next) {
    try {
      const { title, description, amount } = req.body;
      const grantorId = req.user.userId;

      const grant = await GrantService.createGrant({
        title,
        description,
        amount,
        grantorId
      });

      return res.status(201).json(grant);
    } catch (err) {
      next(err);
    }
  }

  static async getAllGrants(req, res, next) {
    try {
      const grants = await GrantService.getAllGrants();
      return res.status(200).json(grants);
    } catch (err) {
      next(err);
    }
  }

  static async getGrantById(req, res, next) {
    try {
      const { id } = req.params;
      const grant = await GrantService.getGrantById(id);
      return res.status(200).json(grant);
    } catch (err) {
      next(err);
    }
  }

  static async updateGrant(req, res, next) {
    try {
      const { id } = req.params;
      const grantorId = req.user.userId;
      const { title, description, amount } = req.body;

      const updated = await GrantService.updateGrant(id, grantorId, {
        title,
        description,
        amount
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async deleteGrant(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRoles = req.user.roles || [];

      const result = await GrantService.deleteGrant(id, userId, userRoles);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = GrantController;
