import ReportRepository from './ReportRepository.js';

const reportRepo = new ReportRepository();

export default class ReportService {
  async getSpendingSummary() {
    return reportRepo.getSpendingSummary();
  }

  async getVendorPerformance() {
    return reportRepo.getVendorPerformance();
  }
}
