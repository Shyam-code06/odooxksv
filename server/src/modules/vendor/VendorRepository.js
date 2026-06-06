import BaseRepository from '../../common/BaseRepository.js';

export default class VendorRepository extends BaseRepository {
  constructor() {
    super('vendor', [
      'id',
      'companyname',
      'categoryid',
      'gstnumber',
      'pannumber',
      'email',
      'phone',
      'address',
      'contactperson',
      'status',
      'rating',
      'createdat',
      'updatedat',
      'deletedat'
    ]);
  }
}
