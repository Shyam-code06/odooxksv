import DashboardService from './DashboardService.js';

const dashboardService = new DashboardService();

export default class DashboardController {
  async getStats(req, res, next) {
    try {
      const data = await dashboardService.getDashboardStats(req.user);
      return res.status(200).json({
        success: true,
        message: 'Dashboard metrics retrieved successfully.',
        data
      });
    } catch (error) {
      next(error);
    }
  }
}
