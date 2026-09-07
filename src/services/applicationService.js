const Application = require('../models/Application');
const Grant = require('../models/Grant');

class ApplicationService {
  static async apply({ grantId, granteeId, proposal }) {
    if (!proposal || !proposal.trim()) {
      const error = new Error('Proposal is required');
      error.status = 400;
      throw error;
    }

    const grant = await Grant.findById(grantId);
    if (!grant) {
      const error = new Error('Grant not found');
      error.status = 404;
      throw error;
    }

    const application = await Application.create({
      grantId,
      granteeId,
      proposal: proposal.trim()
    });

    return application;
  }

  static async getApplicationsByGrant(grantId, userId, userRoles = []) {
    const grant = await Grant.findById(grantId);
    if (!grant) {
      const error = new Error('Grant not found');
      error.status = 404;
      throw error;
    }

    const isOwner = grant.grantor_id === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isAdmin) {
      const error = new Error('Forbidden: You can only view applications for your own grants');
      error.status = 403;
      throw error;
    }

    return await Application.findByGrantId(grantId);
  }

  static async getApplicationById(appId, userId, userRoles = []) {
    const app = await Application.findById(appId);
    if (!app) {
      const error = new Error('Application not found');
      error.status = 404;
      throw error;
    }

    const isApplicant = app.grantee_id === userId;
    const isGrantorOwner = app.grantor_id === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isApplicant && !isGrantorOwner && !isAdmin) {
      const error = new Error('Forbidden: You do not have permission to view this application');
      error.status = 403;
      throw error;
    }

    return app;
  }

  static async getMyApplications(granteeId) {
    return await Application.findByGranteeId(granteeId);
  }

  static async updateStatus(appId, userId, status, userRoles = []) {
    const validStatuses = ['submitted', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      error.status = 400;
      throw error;
    }

    const app = await Application.findById(appId);
    if (!app) {
      const error = new Error('Application not found');
      error.status = 404;
      throw error;
    }

    const isGrantorOwner = app.grantor_id === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isGrantorOwner && !isAdmin) {
      const error = new Error('Forbidden: Only the grantor of this grant can update application status');
      error.status = 403;
      throw error;
    }

    return await Application.updateStatus(appId, status);
  }
}

module.exports = ApplicationService;
