class ReturnFilterDto {
  constructor(query) {
    this.page = parseInt(query.page) || 1;
    this.limit = parseInt(query.limit) || 10;
    this.search = query.search || '';
    this.status = query.status || '';
    this.exceptions = query.exceptions === 'true';
  }
}

class ReturnListDto {
  constructor(ret) {
    this.id = ret.id;
    this.order_number = ret.order_number;
    this.customer_name = ret.customer_name;
    this.customer_phone = ret.customer_phone;
    this.customer_email = ret.customer_email;
    this.store_name = ret.store_name;
    this.reason = ret.reason;
    this.refund_amount = ret.refund_amount;
    this.status = ret.status;
    this.requested_at = ret.requested_at;
  }
}

class ReturnDetailsDto {
  constructor(ret) {
    Object.assign(this, ret);
  }
}

class ReturnActionDto {
  constructor(body) {
    this.action = body.action; // 'approve' or 'reject'
    this.rejection_reason = body.rejection_reason || '';
    this.notes = body.notes || '';
  }

  validate() {
    if (!['approve', 'reject'].includes(this.action)) {
      return `Invalid action: ${this.action}. Must be 'approve' or 'reject'`;
    }
    if (this.action === 'reject' && !this.rejection_reason.trim()) {
      return 'Rejection reason is required when rejecting a return.';
    }
    return null;
  }
}

module.exports = {
  ReturnFilterDto,
  ReturnListDto,
  ReturnDetailsDto,
  ReturnActionDto
};
