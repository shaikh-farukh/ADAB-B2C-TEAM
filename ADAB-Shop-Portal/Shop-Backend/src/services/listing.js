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

    const updated = await ListingRepository.updateListing(storeId, id, { approval_status: 'SUBMITTED' });
    const notificationProducer = require('./notificationProducer');
    await notificationProducer.listingSubmitted(storeId, listing.title);
    return updated;
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

    const updated = await ListingRepository.updateListing(storeId, id, data);
    
    const notificationProducer = require('./notificationProducer');
    if (status === 'APPROVED') {
      await notificationProducer.listingApproved(storeId, listing.title);
    } else if (status === 'REJECTED') {
      await notificationProducer.listingRejected(storeId, listing.title, reason);
    } else if (status === 'CHANGES_REQUIRED') {
      await notificationProducer.listingChangesRequired(storeId, listing.title, reason);
    }

    return updated;
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

    const updated = await ListingRepository.updateListing(storeId, id, { approval_status: 'PUBLISHED' });
    const notificationProducer = require('./notificationProducer');
    await notificationProducer.listingPublished(storeId, listing.title);
    return updated;
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
}

module.exports = new ListingService();
