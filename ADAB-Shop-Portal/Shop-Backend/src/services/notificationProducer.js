const pool = require('../../db');
const notificationRepository = require('../repositories/notification');

/**
 * Centralized Notification Producer
 * 
 * Resolves target seller userId and creates persistent notifications.
 * Socket.IO delivery is handled automatically by the PostgreSQL trigger
 * on the `notifications` table → pgListener → Socket.IO emit.
 * 
 * This ensures notifications are ALWAYS persisted before real-time delivery
 * and that cross-portal insertions also trigger Socket.IO pushes.
 * 
 * AUTH NOTE: This module does NOT perform authentication. It trusts the
 * caller (service/controller layer) to provide a verified userId/storeId.
 * When real JWT auth is integrated, no changes are needed here.
 */
class NotificationProducer {

  /**
   * Resolve the seller's user_id from a store_id.
   * Used when a business event knows the store but not the user.
   */
  async resolveUserIdFromStore(storeId) {
    try {
      const res = await pool.query(
        `SELECT sp.user_id FROM stores s
         JOIN seller_profiles sp ON s.seller_id = sp.id
         WHERE s.id = $1`,
        [storeId]
      );
      return res.rows[0]?.user_id || null;
    } catch (err) {
      console.error('[NotificationProducer] Failed to resolve userId from storeId:', err.message);
      return null;
    }
  }

  /**
   * Create a notification for a seller. Persists to DB first.
   * Socket.IO delivery happens automatically via the `new_notification` DB trigger.
   * 
   * @param {string} userId - Target seller's user UUID
   * @param {string} title - Notification title
   * @param {string} message - Notification body
   * @param {string} type - Notification type (GENERAL, LISTING, ORDER_STATUS, PRICING, MARKETING, ACCOUNT, FINANCE)
   * @param {string|null} actionUrl - Optional deep link URL
   * @returns {Object|null} Created notification or null on failure
   */
  async notify(userId, title, message, type = 'GENERAL', actionUrl = null) {
    if (!userId || !title || !message) {
      console.warn('[NotificationProducer] Missing required fields, skipping notification');
      return null;
    }
    try {
      return await notificationRepository.createNotification(userId, title, message, type, actionUrl);
    } catch (err) {
      // Fire-and-forget: notification failures must never crash the business operation
      console.error('[NotificationProducer] Failed to create notification:', err.message);
      return null;
    }
  }

  /**
   * Notify a seller by storeId (resolves userId automatically).
   */
  async notifyByStore(storeId, title, message, type = 'GENERAL', actionUrl = null) {
    const userId = await this.resolveUserIdFromStore(storeId);
    if (!userId) {
      console.warn(`[NotificationProducer] Could not resolve userId for storeId=${storeId}`);
      return null;
    }
    return this.notify(userId, title, message, type, actionUrl);
  }

  // ============================================================
  // Domain-Specific Notification Helpers
  // Each method is fire-and-forget safe (never throws)
  // ============================================================

  // --- Listing Events ---

  async listingSubmitted(storeId, listingTitle) {
    return this.notifyByStore(storeId,
      'Product Submitted for Review',
      `Your product "${listingTitle}" has been submitted for admin review.`,
      'GENERAL',
      '/products'
    );
  }

  async listingApproved(storeId, listingTitle) {
    return this.notifyByStore(storeId,
      'Product Approved ✅',
      `Great news! Your product "${listingTitle}" has been approved and is ready to publish.`,
      'GENERAL',
      '/products'
    );
  }

  async listingRejected(storeId, listingTitle, reason) {
    return this.notifyByStore(storeId,
      'Product Rejected',
      `Your product "${listingTitle}" was rejected. Reason: ${reason || 'No reason provided'}.`,
      'GENERAL',
      '/products'
    );
  }

  async listingChangesRequired(storeId, listingTitle, reason) {
    return this.notifyByStore(storeId,
      'Product Changes Required',
      `Your product "${listingTitle}" requires changes: ${reason || 'Please review and resubmit'}.`,
      'GENERAL',
      '/products'
    );
  }

  async listingPublished(storeId, listingTitle) {
    return this.notifyByStore(storeId,
      'Product Published',
      `Your product "${listingTitle}" is now live and visible to customers!`,
      'GENERAL',
      '/products'
    );
  }

  // --- Pricing Events ---

  async bulkPriceUpdated(storeId, count) {
    return this.notifyByStore(storeId,
      'Bulk Price Update Complete',
      `Prices updated successfully for ${count} product${count > 1 ? 's' : ''}.`,
      'PRICE_ALERT',
      '/pricing'
    );
  }

  async priceScheduled(storeId, listingTitle, startDate) {
    return this.notifyByStore(storeId,
      'Price Drop Scheduled',
      `A price drop for "${listingTitle || 'product'}" has been scheduled starting ${new Date(startDate).toLocaleDateString()}.`,
      'PRICE_ALERT',
      '/pricing'
    );
  }

  // --- Marketing Events ---

  async promotionCreated(storeId, promoTitle) {
    return this.notifyByStore(storeId,
      'Promotion Created',
      `Your promotion "${promoTitle}" has been created and is active.`,
      'GENERAL',
      '/marketing'
    );
  }

  async couponCreated(storeId, couponCode) {
    return this.notifyByStore(storeId,
      'Coupon Created',
      `Your coupon "${couponCode}" has been created and is ready to use.`,
      'GENERAL',
      '/marketing'
    );
  }

  // --- Account Events ---

  async profileUpdated(userId) {
    return this.notify(userId,
      'Profile Updated',
      'Your business profile has been updated successfully.',
      'KYC_UPDATE',
      '/settings'
    );
  }

  async storeUpdated(userId) {
    return this.notify(userId,
      'Store Updated',
      'Your store information has been updated successfully.',
      'GENERAL',
      '/settings'
    );
  }

  async settingsChanged(userId) {
    return this.notify(userId,
      'Settings Updated',
      'Your store configuration has been updated.',
      'GENERAL',
      '/settings'
    );
  }
  // --- Messaging Events (Called by Customer/Support domain) ---

  async messageReceived(userId, customerName) {
    return this.notify(userId,
      'New Message Received',
      `You have a new message from ${customerName || 'a customer'}.`,
      'GENERAL',
      '/messages'
    );
  }

  // --- Returns & Fulfillment Events (Called by Operations domain) ---

  async returnCreated(storeId, orderNumber, reason) {
    return this.notifyByStore(storeId,
      'Return Request Received',
      `A return request was created for Order #${orderNumber}. Reason: ${reason}.`,
      'ORDER_STATUS',
      '/returns'
    );
  }
}

module.exports = new NotificationProducer();
