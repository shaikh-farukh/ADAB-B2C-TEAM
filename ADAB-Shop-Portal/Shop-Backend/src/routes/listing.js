const express = require('express');
const router = express.Router();
const ListingController = require('../controllers/listing');
const { requireSellerAuth } = require('../middlewares/auth');

// Base route: /api/v1/listings
router.use(requireSellerAuth);

router.post('/', ListingController.createListing);
router.get('/', ListingController.getListings);

// Manufacturer Catalog Sync Endpoints (Manufacturer -> Seller Master Catalog)
router.get('/manufacturer-products', ListingController.getManufacturerProducts);
router.post('/adopt-manufacturer-product', ListingController.adoptManufacturerProduct);

router.get('/:id', ListingController.getListingById);
router.put('/:id', ListingController.updateListing);
router.delete('/:id', ListingController.deleteListing);

// Day 2 Specific: Submit event
router.post('/:id/submit', ListingController.submitListing);

// Day 2 Specific: Admin Review Simulation (Normally this is in Admin portal)
router.post('/:id/admin-start-review', ListingController.adminStartReview);
router.post('/:id/admin-review', ListingController.adminReview);
router.post('/:id/publish', ListingController.publishListing);

// Day 2 Specific: Missing Shabbir endpoints
router.get('/:id/approval-history', ListingController.getApprovalHistory);
router.post('/:id/documents', ListingController.addDocument);
router.delete('/:id/images/:imageId', ListingController.deleteImage);

// Day 4 Specific: Products Issues
router.get('/:id/issues', ListingController.getListingIssues);

module.exports = router;
