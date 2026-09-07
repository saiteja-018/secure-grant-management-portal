const Grant = require('../models/Grant');
const cacheService = require('../config/redis');

class GrantService {
  static async createGrant({ title, description, amount, grantorId }) {
    if (!title || !description || amount === undefined || amount === null) {
      const error = new Error('Title, description, and amount are required');
      error.status = 400;
      throw error;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      const error = new Error('Amount must be a non-negative number');
      error.status = 400;
      throw error;
    }

    const grant = await Grant.create({
      title,
      description,
      amount: numAmount,
      grantorId
    });

    await cacheService.del('all_grants');
    return grant;
  }

  static async getAllGrants() {
    const cached = await cacheService.get('all_grants');
    if (cached) {
      return cached;
    }

    const grants = await Grant.findAll();
    await cacheService.set('all_grants', grants, 60);
    return grants;
  }

  static async getGrantById(grantId) {
    const grant = await Grant.findById(grantId);
    if (!grant) {
      const error = new Error('Grant not found');
      error.status = 404;
      throw error;
    }
    return grant;
  }

  static async updateGrant(grantId, grantorId, { title, description, amount }) {
    const grant = await Grant.findById(grantId);
    if (!grant) {
      const error = new Error('Grant not found');
      error.status = 404;
      throw error;
    }

    if (grant.grantor_id !== grantorId) {
      const error = new Error('Forbidden: You can only update your own grants');
      error.status = 403;
      throw error;
    }

    let parsedAmount = amount !== undefined ? parseFloat(amount) : undefined;
    if (parsedAmount !== undefined && (isNaN(parsedAmount) || parsedAmount < 0)) {
      const error = new Error('Amount must be a non-negative number');
      error.status = 400;
      throw error;
    }

    const updated = await Grant.update(grantId, {
      title,
      description,
      amount: parsedAmount
    });

    await cacheService.del('all_grants');
    return updated;
  }

  static async deleteGrant(grantId, userId, userRoles = []) {
    const grant = await Grant.findById(grantId);
    if (!grant) {
      const error = new Error('Grant not found');
      error.status = 404;
      throw error;
    }

    const isOwner = grant.grantor_id === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isAdmin) {
      const error = new Error('Forbidden: You do not have permission to delete this grant');
      error.status = 403;
      throw error;
    }

    await Grant.delete(grantId);
    await cacheService.del('all_grants');
    return { id: grantId, message: 'Grant deleted successfully' };
  }
}

module.exports = GrantService;
