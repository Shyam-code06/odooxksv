import BaseController from '../../common/BaseController.js';
import AuthService from './AuthService.js';

const authService = new AuthService();

export default class AuthController extends BaseController {
  constructor() {
    super(authService);
    
    // Bind custom auth methods to correct context
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.refresh = this.refresh.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.register = this.register.bind(this);
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await this.service.login(username, password);
      return this.sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const result = await this.service.registerVendor(req.body);
      return this.sendSuccess(res, result, 'Registration successful. Account is pending administrator review.', 201);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await this.service.logout(refreshToken);
      return this.sendSuccess(res, result, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await this.service.refresh(refreshToken);
      return this.sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userid = req.user.id;
      const result = await this.service.changePassword(userid, oldPassword, newPassword);
      return this.sendSuccess(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}
