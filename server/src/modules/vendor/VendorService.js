import BaseService from '../../common/BaseService.js';
import VendorRepository from './VendorRepository.js';

const vendorRepo = new VendorRepository();

export default class VendorService extends BaseService {
  constructor() {
    super(vendorRepo);
  }

  /**
   * Get all vendors with search capability
   */
  async findAll(options = {}) {
    // Enable column searches for companyname, email, phone, and contactperson
    options.searchColumns = ['companyname', 'email', 'phone', 'contactperson'];
    return super.findAll(options);
  }
}
