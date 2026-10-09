const { ProductListDto, ProductDetailsDto } = require('../dtos/productDto');

// Mock Data for Admin Product Development
let mockProducts = [
  {
    id: 'prod-001',
    name: 'Premium Basmati Rice 5kg',
    description: 'High quality long grain basmati rice.',
    seller: 'Agro Foods Ltd',
    sellerId: 'sell-101',
    price: 850,
    stock: 120,
    status: 'LIVE',
    category: 'Grains',
    brand: 'Royal Agro',
    images: ['https://via.placeholder.com/150'],
    submittedTime: '2023-10-01T10:00:00Z',
    moderationReason: null,
    moderationHistory: []
  },
  {
    id: 'prod-002',
    name: 'Organic Honey 500g',
    description: 'Pure organic forest honey.',
    seller: 'Nature Farms',
    sellerId: 'sell-102',
    price: 450,
    stock: 50,
    status: 'PENDING',
    category: 'Pantry',
    brand: 'Nature Farms',
    images: ['https://via.placeholder.com/150'],
    submittedTime: '2023-10-05T14:30:00Z',
    moderationReason: null,
    moderationHistory: []
  },
  {
    id: 'prod-003',
    name: 'Whole Wheat Flour 10kg',
    description: '100% whole wheat chakki fresh atta.',
    seller: 'Agro Foods Ltd',
    sellerId: 'sell-101',
    price: 400,
    stock: 0,
    status: 'REJECTED',
    category: 'Grains',
    brand: 'Royal Agro',
    images: ['https://via.placeholder.com/150'],
    submittedTime: '2023-10-02T09:15:00Z',
    moderationReason: 'Product image is blurry and nutritional info is missing.',
    moderationHistory: [
      { action: 'REJECTED', reason: 'Product image is blurry and nutritional info is missing.', date: '2023-10-02T11:00:00Z' }
    ]
  },
  {
    id: 'prod-004',
    name: 'Almonds Premium 1kg',
    description: 'California premium almonds.',
    seller: 'NutriNuts',
    sellerId: 'sell-103',
    price: 1200,
    stock: 200,
    status: 'LIVE',
    category: 'Dry Fruits',
    brand: 'NutriNuts',
    images: ['https://via.placeholder.com/150'],
    submittedTime: '2023-09-28T16:45:00Z',
    moderationReason: null,
    moderationHistory: []
  },
  {
    id: 'prod-005',
    name: 'Green Tea Bags (100 pcs)',
    description: 'Antioxidant rich green tea.',
    seller: 'Nature Farms',
    sellerId: 'sell-102',
    price: 350,
    stock: 80,
    status: 'PENDING',
    category: 'Beverages',
    brand: 'TeaLeaf',
    images: ['https://via.placeholder.com/150'],
    submittedTime: '2023-10-06T08:20:00Z',
    moderationReason: null,
    moderationHistory: []
  }
];

class AdminProductService {
  async getProducts(filters) {
    // 1. Filter
    let filtered = mockProducts;

    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(s) || 
        p.seller.toLowerCase().includes(s) ||
        p.id.toLowerCase().includes(s)
      );
    }

    if (filters.seller) {
      filtered = filtered.filter(p => p.seller.toLowerCase().includes(filters.seller.toLowerCase()));
    }

    if (filters.category) {
      filtered = filtered.filter(p => p.category.toLowerCase() === filters.category.toLowerCase());
    }

    if (filters.brand) {
      filtered = filtered.filter(p => p.brand.toLowerCase() === filters.brand.toLowerCase());
    }

    // 2. Sort
    filtered.sort((a, b) => {
      let valA = a[filters.sortBy];
      let valB = b[filters.sortBy];
      
      if (valA < valB) return filters.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 3. Paginate
    const totalRecords = filtered.length;
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      products: paginated.map(p => new ProductListDto(p)),
      totalRecords,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(totalRecords / filters.limit)
    };
  }

  async getProductDetails(id) {
    const product = mockProducts.find(p => p.id === id);
    if (!product) return null;
    return new ProductDetailsDto(product);
  }

  async moderateProduct(id, action, reason) {
    const productIndex = mockProducts.findIndex(p => p.id === id);
    if (productIndex === -1) return null;

    const product = mockProducts[productIndex];
    let newStatus = product.status;
    
    if (action === 'APPROVE') newStatus = 'LIVE';
    if (action === 'REJECT') newStatus = 'REJECTED';
    if (action === 'REQUEST_CHANGES') newStatus = 'PENDING'; // Or some specific status like 'CHANGES_REQUESTED' depending on Karan's domain
    if (action === 'SUSPEND') newStatus = 'SUSPENDED';

    product.status = newStatus;
    product.moderationReason = reason || null;
    
    product.moderationHistory.push({
      action: newStatus,
      reason: reason || null,
      date: new Date().toISOString()
    });

    return product;
  }
}

module.exports = new AdminProductService();
