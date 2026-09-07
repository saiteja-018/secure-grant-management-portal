const AuthService = require('../services/authService');
const UserService = require('../services/userService');

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const user = await AuthService.register({ name, email, password });
      return res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async googleRedirect(req, res) {
    const authUrl = AuthService.getOAuthAuthUrl();
    return res.redirect(authUrl);
  }

  static async googleCallback(req, res, next) {
    try {
      const { code } = req.query;
      if (!code) {
        return res.status(400).json({ error: 'Missing OAuth authorization code' });
      }

      const result = await AuthService.handleOAuthCallback(code);

      // If requested via browser HTML request, we can render or redirect with token in query/hash
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect(`/?token=${result.accessToken}`);
      }

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await UserService.getUserById(req.user.userId);
      return res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
