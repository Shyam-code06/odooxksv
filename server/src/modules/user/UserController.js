import BaseController from '../../common/BaseController.js';
import UserService from './UserService.js';

const userService = new UserService();

export default class UserController extends BaseController {
  constructor() {
    super(userService);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.toggleStatus = this.toggleStatus.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
  }

  async create(req, res, next) {
    try {
      const record = await this.service.create(req.body, req.user.id);
      return this.sendSuccess(res, record, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.update(id, req.body, req.user.id);
      return this.sendSuccess(res, record, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isactive } = req.body;

      if (isactive === undefined) {
        return res.status(400).json({
          success: false,
          message: 'isactive boolean value is required.',
          data: null,
          meta: null
        });
      }

      const updatedUser = await this.service.toggleStatus(id, isactive, req.user.id);
      const actionText = isactive ? 'activated' : 'deactivated';
      
      return this.sendSuccess(res, updatedUser, `User successfully ${actionText}.`);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { password } = req.body;

      const result = await this.service.resetPassword(id, password, req.user.id);
      return this.sendSuccess(res, {}, result.message || 'Password reset successfully.');
    } catch (error) {
      next(error);
    }
  }
}
