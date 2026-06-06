import BaseService from '../../common/BaseService.js';
import RfqRepository from './RfqRepository.js';
import { NotFoundError } from '../../utils/customErrors.js';

const rfqRepository = new RfqRepository();

export default class RfqService extends BaseService {
  constructor() {
    super(rfqRepository);
  }

  /**
   * Create new RFQ with vendor assignments
   */
  async create(data, userId) {
    // Generate unique RFQ Number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    const rfqNumber = `RFQ-${year}${month}${day}-${random}`;

    const rfqData = {
      rfqnumber: rfqNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      quantity: data.quantity || 1,
      unit: data.unit || 'Units',
      deadline: data.deadline,
      status: 'Draft',
      createdby: userId
    };

    const newRfq = await this.repository.create(rfqData);

    // Invite Vendors if specified
    if (data.assignedVendors && Array.isArray(data.assignedVendors)) {
      await this.repository.assignVendors(newRfq.id, data.assignedVendors);
    }

    return this.findById(newRfq.id);
  }

  /**
   * Overridden findById to include detailed vendors and quotations
   */
  async findById(id) {
    const detail = await this.repository.findDetail(id);
    if (!detail) {
      throw new NotFoundError(`RFQ with ID ${id} not found.`);
    }
    return detail;
  }

  /**
   * Overridden update to handle vendor reassignments if provided
   */
  async update(id, data) {
    await this.findById(id); // Throws 404 if not found

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.deadline !== undefined) updateData.deadline = data.deadline;
    if (data.status !== undefined) updateData.status = data.status;

    let updated = null;
    if (Object.keys(updateData).length > 0) {
      updated = await this.repository.update(id, updateData);
    }

    if (data.assignedVendors && Array.isArray(data.assignedVendors)) {
      await this.repository.assignVendors(id, data.assignedVendors);
    }

    return this.findById(id);
  }

  /**
   * Publish an RFQ to make it active for invited vendors
   */
  async publish(id) {
    return this.update(id, { status: 'Published' });
  }

  /**
   * Close an RFQ (e.g. after deadline)
   */
  async close(id) {
    return this.update(id, { status: 'Closed' });
  }

  /**
   * Overridden findAll with RFQ search columns
   */
  async findAll(options = {}) {
    const searchColumns = ['title', 'description', 'rfqnumber', 'category'];
    return this.repository.findAll({
      ...options,
      searchColumns
    });
  }
}
