import ReportService from './ReportService.js';

const reportService = new ReportService();

export default class ReportController {
  getSpendingSummary = async (req, res, next) => {
    try {
      const data = await reportService.getSpendingSummary();
      res.status(200).json({ success: true, message: 'Spending summary fetched', data });
    } catch (error) {
      next(error);
    }
  };

  getVendorPerformance = async (req, res, next) => {
    try {
      const data = await reportService.getVendorPerformance();
      res.status(200).json({ success: true, message: 'Vendor performance fetched', data });
    } catch (error) {
      next(error);
    }
  };
}
