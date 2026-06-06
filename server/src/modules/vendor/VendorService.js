import BaseService from '../../common/BaseService.js';
import VendorRepository from './VendorRepository.js';
import { BadRequestError } from '../../utils/customErrors.js';

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

  /**
   * Override update to add email and phone validation
   */
  async update(id, data) {
    const { email, phone } = data;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^\d{10}$/;

    if (email && !emailRegex.test(email)) {
      throw new BadRequestError('Invalid or incomplete email format.');
    }

    if (phone && !phoneRegex.test(phone)) {
      throw new BadRequestError('Mobile number must be exactly 10 digits.');
    }

    return super.update(id, data);
  }
}
