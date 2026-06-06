import { NotFoundError } from '../utils/customErrors.js';

export default class BaseService {
  constructor(repository) {
    if (!repository) {
      throw new Error('Repository must be provided to BaseService subclass.');
    }
    this.repository = repository;
  }

  /**
   * Create a new record
   */
  async create(data) {
    return this.repository.create(data);
  }

  /**
   * Find a single record by UUID
   */
  async findById(id) {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new NotFoundError(`Resource with ID ${id} not found.`);
    }
    return record;
  }

  /**
   * Update an existing record
   */
  async update(id, data) {
    // Check if resource exists first to throw correct 404
    await this.findById(id);
    return this.repository.update(id, data);
  }

  /**
   * Delete a record
   */
  async delete(id) {
    await this.findById(id);
    return this.repository.delete(id);
  }

  /**
   * Get all records with pagination, filtering, search, sorting
   */
  async findAll(options) {
    return this.repository.findAll(options);
  }
}
