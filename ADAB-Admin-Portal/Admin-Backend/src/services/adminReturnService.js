const { ReturnListDto, ReturnDetailsDto } = require('../dtos/returnDto');

let mockReturns = [
  {
    id: 'ret-201',
    order_number: 'ORD-1001-A',
    customer_name: 'John Doe',
    customer_phone: '+919876543210',
    customer_email: 'john@example.com',
    store_name: 'Krishna Mart',
    reason: 'Received wrong item flavor',
    refund_amount: 350,
    status: 'REQUESTED',
    requested_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    resolved_at: null,
    rejection_reason: null,
    items: [
      { product_name: 'Organic Honey 500g', item_condition: 'SEALED', quantity: 1, reason: 'Wrong flavor sent', refund_amount: 350 }
    ],
    refunds: [],
    status_history: [
      { previous_status: null, new_status: 'REQUESTED', notes: 'Customer initiated return via app', changed_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() }
    ]
  },
  {
    id: 'ret-202',
    order_number: 'ORD-1002-B',
    customer_name: 'Jane Smith',
    customer_phone: '+919876543211',
    customer_email: 'jane@example.com',
    store_name: 'Fresh Supermarket',
    reason: 'Packet was torn and spilling',
    refund_amount: 500,
    status: 'APPROVED',
    requested_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    rejection_reason: null,
    items: [
      { product_name: 'Green Tea Bags (100 pcs)', item_condition: 'DAMAGED', quantity: 1, reason: 'Packet torn', refund_amount: 500 }
    ],
    refunds: [
      { amount: 500, refund_mode: 'ORIGINAL_SOURCE', gateway_refund_id: 'ref_strip_xyz', status: 'COMPLETED', created_at: new Date(Date.now() - 1000 * 60 * 60 * 39).toISOString() }
    ],
    status_history: [
      { previous_status: 'REQUESTED', new_status: 'APPROVED', notes: 'Approved after photo verification', changed_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString() }
    ]
  },
  {
    id: 'ret-203',
    order_number: 'ORD-1004-D',
    customer_name: 'Bob Builder',
    customer_phone: '+919876543214',
    customer_email: 'bob@example.com',
    store_name: 'Hardware Store',
    reason: 'Changed my mind',
    refund_amount: 1500,
    status: 'REJECTED',
    requested_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
    rejection_reason: 'Non-returnable item policy',
    items: [
      { product_name: 'Drill Machine', item_condition: 'OPENED', quantity: 1, reason: 'Changed mind', refund_amount: 1500 }
    ],
    refunds: [],
    status_history: [
      { previous_status: 'REQUESTED', new_status: 'REJECTED', notes: 'Non-returnable item policy', changed_at: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString() }
    ]
  }
];

class AdminReturnService {
  async getReturns(filters) {
    let filtered = mockReturns;

    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(s) || 
        r.order_number.toLowerCase().includes(s) || 
        (r.customer_name && r.customer_name.toLowerCase().includes(s))
      );
    }

    if (filters.exceptions) {
      filtered = filtered.filter(r => r.status === 'REJECTED');
    }

    filtered.sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

    const totalRecords = filtered.length;
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      returns: paginated.map(r => new ReturnListDto(r)),
      totalRecords,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(totalRecords / filters.limit)
    };
  }

  async getReturnDetails(id) {
    const ret = mockReturns.find(r => r.id === id || r.id === parseInt(id)); // parse int or string
    if (!ret) return null;
    return new ReturnDetailsDto(ret);
  }

  async resolveReturn(id, action, rejection_reason, notes) {
    const ret = mockReturns.find(r => r.id === id || r.id === parseInt(id));
    if (!ret) return null;

    const previousStatus = ret.status;
    
    if (action === 'approve') {
      ret.status = 'APPROVED';
      ret.refunds.push({
        amount: ret.refund_amount,
        refund_mode: 'ORIGINAL_SOURCE',
        gateway_refund_id: 'ref_mock_xyz',
        status: 'PENDING',
        created_at: new Date().toISOString()
      });
    } else {
      ret.status = 'REJECTED';
      ret.rejection_reason = rejection_reason;
    }

    ret.resolved_at = new Date().toISOString();

    ret.status_history.unshift({
      previous_status: previousStatus,
      new_status: ret.status,
      notes: notes || (action === 'reject' ? rejection_reason : 'Approved via Admin'),
      changed_at: new Date().toISOString()
    });

    return new ReturnDetailsDto(ret);
  }
}

module.exports = new AdminReturnService();
