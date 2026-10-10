class OrderFilterDto {
  constructor(query) {
    this.page = parseInt(query.page) || 1;
    this.limit = parseInt(query.limit) || 10;
    this.search = query.search || '';
    this.status = query.status || '';
    this.payment_status = query.payment_status || '';
    this.exceptions = query.exceptions === 'true';
  }
}

class OrderListDto {
  constructor(order) {
    this.id = order.id;
    this.order_number = order.order_number;
    this.created_at = order.created_at;
    this.customer_name = order.customer_name;
    this.customer_phone = order.customer_phone;
    this.customer_email = order.customer_email;
    this.delivery_mode = order.delivery_mode;
    this.grand_total = order.grand_total;
    this.payment_status = order.payment_status;
    this.payment_method = order.payment_method;
    this.order_status = order.order_status;
  }
}

class OrderDetailsDto {
  constructor(order) {
    Object.assign(this, order);
  }
}

class OrderStatusUpdateDto {
  constructor(body) {
    this.status = body.status;
    this.notes = body.notes || '';
  }

  validate() {
    const validStatuses = ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    if (!validStatuses.includes(this.status)) {
      return `Invalid status: ${this.status}. Must be one of: ${validStatuses.join(', ')}`;
    }
    return null;
  }
}

module.exports = {
  OrderFilterDto,
  OrderListDto,
  OrderDetailsDto,
  OrderStatusUpdateDto
};
