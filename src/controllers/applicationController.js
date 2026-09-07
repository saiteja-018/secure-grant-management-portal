const ApplicationService = require('../services/applicationService');

class ApplicationController {
  static async apply(req, res, next) {
    try {
      const grantId = req.params.id;
      const granteeId = req.user.userId;
      const { proposal } = req.body;

      const application = await ApplicationService.apply({
        grantId,
        granteeId,
        proposal
      });

      return res.status(201).json(application);
    } catch (err) {
      next(err);
    }
  }

  static async getGrantApplications(req, res, next) {
    try {
      const grantId = req.params.id;
      const userId = req.user.userId;
      const userRoles = req.user.roles || [];

      const applications = await ApplicationService.getApplicationsByGrant(
        grantId,
        userId,
        userRoles
      );

      return res.status(200).json(applications);
    } catch (err) {
      next(err);
    }
  }

  static async getApplicationById(req, res, next) {
    try {
      const appId = req.params.appId;
      const userId = req.user.userId;
      const userRoles = req.user.roles || [];

      const application = await ApplicationService.getApplicationById(
        appId,
        userId,
        userRoles
      );

      return res.status(200).json(application);
    } catch (err) {
      next(err);
    }
  }

  static async getMyApplications(req, res, next) {
    try {
      const granteeId = req.user.userId;
      const applications = await ApplicationService.getMyApplications(granteeId);
      return res.status(200).json(applications);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const appId = req.params.appId;
      const userId = req.user.userId;
      const { status } = req.body;
      const userRoles = req.user.roles || [];

      const updated = await ApplicationService.updateStatus(
        appId,
        userId,
        status,
        userRoles
      );

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ApplicationController;
