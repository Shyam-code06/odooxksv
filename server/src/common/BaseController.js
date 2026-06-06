export default class BaseController {
  constructor(service) {
    if (!service) {
      throw new Error('Service must be provided to BaseController subclass.');
    }
    this.service = service;

    // Bind methods to ensure correct lexical 'this' context when used as Express route handlers
    this.create = this.create.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.getAll = this.getAll.bind(this);
  }

  /**
   * Helper method to send standardized API success responses
   */
  sendSuccess(res, data = {}, message = 'Operation successful', statusCode = 200, meta = {}) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta,
    });
  }

  /**
   * Generic Create handler
   */
  async create(req, res, next) {
    try {
      const record = await this.service.create(req.body);
      return this.sendSuccess(res, record, 'Record created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generic GetById handler
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.findById(id);
      return this.sendSuccess(res, record, 'Record retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generic Update handler
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.update(id, req.body);
      return this.sendSuccess(res, record, 'Record updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generic Delete handler
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.delete(id);
      return this.sendSuccess(res, record, 'Record deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generic GetAll handler supporting Pagination, Search, Sorting, and Filtering
   */
  async getAll(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdat',
        sortOrder = 'DESC',
        search = '',
        ...restFilters
      } = req.query;

      // Rest filters can contain columns to do exact matching on
      // Subclasses can override or restrict these queries
      const result = await this.service.findAll({
        page,
        limit,
        sortBy,
        sortOrder,
        search,
        filters: restFilters,
      });

      return this.sendSuccess(
        res,
        result.records,
        'Records retrieved successfully',
        200,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }
}
