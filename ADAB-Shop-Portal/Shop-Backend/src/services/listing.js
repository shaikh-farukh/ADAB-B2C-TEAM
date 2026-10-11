const ListingRepository = require('../repositories/listing');
const { createListingSchema, updateListingSchema } = require('../dtos/listingDto');

class ListingService {
  async createListing(storeId, data) {
    const validatedData = createListingSchema.parse(data);
    return await ListingRepository.createListing(storeId, validatedData);
  }

  async getListings(storeId, filters) {
    return await ListingRepository.getListings(storeId, filters);
  }

  async getListingById(storeId, id) {
    const listing = await ListingRepository.getListingById(storeId, id);
    if (!listing) throw new Error('Listing not found');
    return listing;
  }

  async updateListing(storeId, id, data) {
    const existing = await this.getListingById(storeId, id);
    if (!['DRAFT', 'CHANGES_REQUIRED'].includes(existing.approval_status)) {
      throw new Error(`Cannot edit listing while it is in ${existing.approval_status} state. It must be in DRAFT or CHANGES_REQUIRED.`);
    }
    const validatedData = updateListingSchema.parse(data);
    const listing = await ListingRepository.updateListing(storeId, id, validatedData);
    if (!listing) throw new Error('Listing not found');
    return listing;
  }

  async deleteListing(storeId, id) {
    const listing = await ListingRepository.deleteListing(storeId, id);
    if (!listing) throw new Error('Listing not found');
    return listing;
  }

  async submitListing(storeId, id) {
    const listing = await this.getListingById(storeId, id);
    if (listing.approval_status !== 'DRAFT' && listing.approval_status !== 'CHANGES_REQUIRED') {
      throw new Error(`Cannot submit listing from state: ${listing.approval_status}`);
    }
    
    // Write history
    const pool = require('../../db');
    await pool.query(
      `INSERT INTO product_approval_history (listing_id, previous_status, new_status, rejection_reason) VALUES ($1, $2, $3, $4)`,
      [id, listing.approval_status, 'SUBMITTED', 'Seller submitted for review']
    );

    return await ListingRepository.updateListing(storeId, id, { approval_status: 'SUBMITTED' });
  }

  // Admin endpoint: start review
  async adminStartReview(storeId, id) {
    const listing = await this.getListingById(storeId, id);
    if (listing.approval_status !== 'SUBMITTED') {
      throw new Error(`Cannot start review from state: ${listing.approval_status}`);
    }
    
    const pool = require('../../db');
    await pool.query(
      `INSERT INTO product_approval_history (listing_id, previous_status, new_status, rejection_reason) VALUES ($1, $2, $3, $4)`,
      [id, listing.approval_status, 'UNDER_REVIEW', 'Admin started review']
    );

    return await ListingRepository.updateListing(storeId, id, { approval_status: 'UNDER_REVIEW' });
  }

  // Admin simulation endpoint
  async adminReviewListing(storeId, id, status, reason = '') {
    if (!['APPROVED', 'REJECTED', 'CHANGES_REQUIRED'].includes(status)) {
      throw new Error('Invalid review status');
    }
    const listing = await this.getListingById(storeId, id);
    if (listing.approval_status !== 'UNDER_REVIEW') {
      throw new Error(`Cannot make decision from state: ${listing.approval_status}. Must be UNDER_REVIEW.`);
    }

    const data = { approval_status: status };
    if (reason) data.rejection_reason = reason;

    // Write history
    const pool = require('../../db');
    await pool.query(
      `INSERT INTO product_approval_history (listing_id, previous_status, new_status, rejection_reason) VALUES ($1, $2, $3, $4)`,
      [id, listing.approval_status, status, reason || 'Admin review decision']
    );

    return await ListingRepository.updateListing(storeId, id, data);
  }

  async publishListing(storeId, id) {
    const listing = await this.getListingById(storeId, id);
    if (listing.approval_status !== 'APPROVED') {
      throw new Error(`Cannot publish listing from state: ${listing.approval_status}. Must be APPROVED.`);
    }

    const pool = require('../../db');
    await pool.query(
      `INSERT INTO product_approval_history (listing_id, previous_status, new_status, rejection_reason) VALUES ($1, $2, $3, $4)`,
      [id, listing.approval_status, 'PUBLISHED', 'Seller or System published listing']
    );

    return await ListingRepository.updateListing(storeId, id, { approval_status: 'PUBLISHED' });
  }
  async getApprovalHistory(storeId, id) {
    // Basic authorization check - is this listing owned by this store?
    await this.getListingById(storeId, id);
    return await ListingRepository.getApprovalHistory(id);
  }

  async addDocument(storeId, id, data) {
    await this.getListingById(storeId, id);
    if (!data.document_type || !data.file_url) throw new Error('Missing required document fields');
    return await ListingRepository.addDocument(id, data);
  }

  async deleteImage(storeId, id, imageId) {
    await this.getListingById(storeId, id);
    return await ListingRepository.deleteImage(imageId);
  }

  async getListingIssues(storeId, id) {
    const issues = await ListingRepository.getListingIssues(storeId, id);
    if (!issues) throw new Error('Listing not found');
    return issues;
  }

  async getManufacturerProducts(filters) {
    return await ListingRepository.getManufacturerProducts(filters);
  }

  async adoptManufacturerProduct(storeId, manufacturerProductId, customData = {}) {
    const pool = require('../../db');
    const mRes = await pool.query('SELECT * FROM manage_manufacturer_products WHERE id = $1 AND deleted_at IS NULL', [manufacturerProductId]);
    if (!mRes.rows[0]) throw new Error('Manufacturer product not found');

    const mProd = mRes.rows[0];
    const listingPayload = {
      title: customData.title || mProd.product_name,
      sku: customData.sku || mProd.sku || `MP-${mProd.id}`,
      barcode: customData.barcode || null,
      brand_tag: customData.brand_tag || mProd.category || 'Manufacturer Master',
      product_type: 'PACKED_ITEM',
      unit: mProd.unit || 'pcs',
      mrp: customData.mrp || Number(mProd.mrp) || Number(mProd.price) || 0,
      sell_price: customData.sell_price || Number(mProd.retail_price) || Number(mProd.distributor_price) || Number(mProd.price) || 0,
      min_order_qty: customData.min_order_qty || 1,
      allowed_buyers: customData.allowed_buyers || 'ALL',
      approval_status: 'DRAFT',
      is_active: true,
      stock_qty: customData.stock_qty || 0,
      image_url: mProd.image_url || mProd.image || mProd.product_image || '',
      manufacturer_product_id: mProd.id
    };

    return await this.createListing(storeId, listingPayload);
  }
}

module.exports = new ListingService();
