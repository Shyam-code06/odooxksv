import BaseService from '../../common/BaseService.js';
import QuotationRepository from './QuotationRepository.js';
import RfqRepository from '../rfq/RfqRepository.js';
import { AppError, NotFoundError } from '../../utils/customErrors.js';

const quotationRepository = new QuotationRepository();
const rfqRepository = new RfqRepository();

export default class QuotationService extends BaseService {
  constructor() {
    super(quotationRepository);
  }

  /**
   * Submit or update vendor quotation
   */
  async submitQuotation(data, vendorId) {
    // 1. Verify RFQ exists and is active/published
    const rfq = await rfqRepository.findById(data.rfqid);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${data.rfqid} not found.`);
    }

    if (rfq.status !== 'Published') {
      throw new AppError('Quotations can only be submitted for published RFQs.', 400);
    }

    // 2. Verify RFQ deadline has not passed
    const deadline = new Date(rfq.deadline);
    const now = new Date();
    // Reset hours to compare dates fairly, or compare timestamp
    if (now > deadline) {
      throw new AppError('The deadline for this RFQ has already passed.', 400);
    }

    // Calculate totalprice from items if not provided
    let totalprice = parseFloat(data.totalprice);
    const items = data.items || [];
    if (items.length > 0 && isNaN(totalprice)) {
      totalprice = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitprice)), 0);
    }

    if (isNaN(totalprice) || totalprice < 0) {
      throw new AppError('Invalid total price.', 400);
    }

    // 3. Check if vendor already submitted a quotation for this RFQ
    const comparisonResult = await this.repository.findAll({
      filters: { rfqid: data.rfqid, vendorid: vendorId }
    });

    const quotationData = {
      rfqid: data.rfqid,
      vendorid: vendorId,
      totalprice,
      deliverydays: parseInt(data.deliverydays, 10),
      notes: data.notes || '',
      attachmenturl: data.attachmenturl || '',
      status: 'Submitted'
    };

    if (comparisonResult.records && comparisonResult.records.length > 0) {
      // Edit existing quotation before deadline
      const existingQuote = comparisonResult.records[0];
      await this.repository.update(existingQuote.id, quotationData);
      
      // Update items by deleting and recreating them
      await this.repository.executeQuery('DELETE FROM quotationitem WHERE quotationid = $1', [existingQuote.id]);
      if (items.length > 0) {
        for (const item of items) {
          await this.repository.executeQuery(
            'INSERT INTO quotationitem (quotationid, itemname, quantity, unit, unitprice, totalprice) VALUES ($1, $2, $3, $4, $5, $6)',
            [
              existingQuote.id,
              item.itemname,
              item.quantity,
              item.unit,
              item.unitprice,
              item.quantity * item.unitprice
            ]
          );
        }
      }
      return this.findById(existingQuote.id);
    } else {
      // Create new quotation
      return this.repository.createWithItems(quotationData, items.map(item => ({
        ...item,
        totalprice: item.quantity * item.unitprice
      })));
    }
  }

  /**
   * Overridden findById to include items
   */
  async findById(id) {
    const detail = await this.repository.findDetail(id);
    if (!detail) {
      throw new NotFoundError(`Quotation with ID ${id} not found.`);
    }
    return detail;
  }

  /**
   * Get side-by-side quotations for comparison
   */
  async compareQuotations(rfqId) {
    const rfq = await rfqRepository.findById(rfqId);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${rfqId} not found.`);
    }

    const quotations = await this.repository.getComparisonData(rfqId);

    // Identify recommendations: lowest price, fastest delivery
    let lowestPriceQuote = null;
    let fastestDeliveryQuote = null;
    let bestVendorRating = null;

    if (quotations.length > 0) {
      lowestPriceQuote = quotations[0]; // Already sorted by totalprice ASC
      
      const sortedByDelivery = [...quotations].sort((a, b) => a.deliverydays - b.deliverydays);
      fastestDeliveryQuote = sortedByDelivery[0];

      const sortedByRating = [...quotations].sort((a, b) => parseFloat(b.vendorrating) - parseFloat(a.vendorrating));
      bestVendorRating = sortedByRating[0];
    }

    return {
      rfq,
      quotations,
      recommendations: {
        lowestPrice: lowestPriceQuote ? lowestPriceQuote.id : null,
        fastestDelivery: fastestDeliveryQuote ? fastestDeliveryQuote.id : null,
        bestRating: bestVendorRating ? bestVendorRating.id : null
      }
    };
  }

  /**
   * Procurement Officer approves/sends the quotation offer
   */
  async approveQuotationOffer(id) {
    const quotation = await this.findById(id);
    if (quotation.status !== 'Accepted') {
      throw new AppError('Only manager-approved quotations can be approved by the procurement officer.', 400);
    }
    await this.repository.update(id, { officerapproved: true });
    return this.findById(id);
  }

  /**
   * Vendor accepts the quotation offer
   */
  async acceptQuotationOffer(id) {
    const quotation = await this.findById(id);
    if (!quotation.officerapproved) {
      throw new AppError('This offer has not been approved and sent by the procurement officer yet.', 400);
    }

    if (quotation.vendoraccepted) {
      throw new AppError('This offer has already been accepted.', 400);
    }
    
    // 1. Update vendoraccepted to true
    await this.repository.update(id, { vendoraccepted: true });

    return this.findById(id);
  }
}
