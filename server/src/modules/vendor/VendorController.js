import BaseController from '../../common/BaseController.js';
import VendorService from './VendorService.js';

const vendorService = new VendorService();

export default class VendorController extends BaseController {
  constructor() {
    super(vendorService);
  }
}
