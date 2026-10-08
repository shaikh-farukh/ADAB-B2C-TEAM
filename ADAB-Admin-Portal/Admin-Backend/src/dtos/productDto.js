// DTOs for Admin Product Catalog based on Day-3 requirements

class ProductListDto {
  constructor(product) {
    this.id = product.id;
    this.name = product.name;
    this.seller = product.seller; // name or object
    this.sellerId = product.sellerId;
    this.price = product.price;
    this.submittedTime = product.submittedTime;
    this.status = product.status; // LIVE, PENDING, REJECTED, SUSPENDED
    this.category = product.category;
    this.brand = product.brand;
    this.moderationReason = product.moderationReason || null;
  }
}

class ProductDetailsDto {
  constructor(product) {
    this.id = product.id;
    this.name = product.name;
    this.description = product.description;
    this.seller = product.seller;
    this.sellerId = product.sellerId;
    this.price = product.price;
    this.stock = product.stock;
    this.submittedTime = product.submittedTime;
    this.status = product.status;
    this.category = product.category;
    this.brand = product.brand;
    this.images = product.images || [];
    this.moderationReason = product.moderationReason || null;
    this.moderationHistory = product.moderationHistory || [];
  }
}

class ProductFilterDto {
  constructor(query) {
    this.status = query.status || 'ALL'; // ALL, LIVE, PENDING, REJECTED
    this.search = query.search || '';
    this.seller = query.seller || '';
    this.category = query.category || '';
    this.brand = query.brand || '';
    this.page = parseInt(query.page, 10) || 1;
    this.limit = parseInt(query.limit, 10) || 10;
    this.sortBy = query.sortBy || 'submittedTime';
    this.sortOrder = query.sortOrder || 'desc';
  }
}

class ProductModerationDto {
  constructor(body) {
    this.reason = body.reason || null;
  }

  validate(action) {
    if ((action === 'REJECT' || action === 'REQUEST_CHANGES') && (!this.reason || this.reason.trim() === '')) {
      return 'Moderation reason is required for rejection or requesting changes.';
    }
    return null;
  }
}

class ProductModerationResponseDto {
  constructor(success, message, product) {
    this.success = success;
    this.message = message;
    this.product = product ? new ProductDetailsDto(product) : null;
  }
}

module.exports = {
  ProductListDto,
  ProductDetailsDto,
  ProductFilterDto,
  ProductModerationDto,
  ProductModerationResponseDto
};
