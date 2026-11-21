/**
 * ADAB Enterprise Seller Portal - OpenAPI 3.0 Specification
 * Version: 2.0.0
 * Comprehensive inventory of all 114+ endpoints across 11 core functional domains.
 */

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ADAB Seller Portal & Kirana Central API',
    version: '2.0.0',
    description: `
### Overview
Interactive API Explorer and Reference for **ADAB Kirana Merchant Platform**.

* **Authentication:** Pass your Bearer JWT token in the \`Authorization\` header.
* **Store Context:** Pass your Store UUID in the \`x-store-id\` header for multi-store operations.
* **Architecture:** Node.js / Express 5 backend with live Neon PostgreSQL, Redis BullMQ, and Cloudinary storage.
    `,
    contact: {
      name: 'ADAB Engineering Team',
      email: 'dev@adab.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5003',
      description: 'Local Development Server'
    },
    {
      url: 'https://api.adab.market',
      description: 'Production API Gateway'
    }
  ],
  tags: [
    { name: '1. Authentication & Identity', description: 'Seller registration, OTP verification, password reset, and Google OAuth' },
    { name: '2. Onboarding, KYC & Store Profile', description: '5-step KYC wizard, FSSAI/GST document verification, and store geolocation' },
    { name: '3. Orders, Returns & Invoices', description: 'Fulfillment FSM workflow, customer returns processing, and GST tax invoice generation' },
    { name: '4. Point of Sale (POS)', description: 'Fast counter walk-in checkout with atomic inventory locking' },
    { name: '5. Listings & Inventory', description: 'Store catalog CRUD, dynamic attributes, CSV bulk upload, and image gallery' },
    { name: '6. Master FMCG Catalog', description: '5,000+ national barcode catalog with instant 1-click product adoption' },
    { name: '7. B2B Resale & Kirana-to-Kirana', description: 'Private brand distribution, inter-store restock requests, and partner analytics' },
    { name: '8. Finance, Khata & Bank Credit', description: 'Merchant digital Khata ledger, instant bank withdrawals, and NBFC working capital loans' },
    { name: '9. Marketing & Pricing Schedules', description: 'Discount promotions, coupon redemption rules, and automated dynamic pricing schedules' },
    { name: '10. Notifications & Chat', description: 'Real-time notification counters, long-polling, and customer/partner chat threads' },
    { name: '11. AI Copilot & MCP Tools', description: 'Gemini 3.5 Flash merchant assistant and tool execution dispatcher' },
    { name: '12. Cloud Storage (Cloudinary)', description: 'Asset uploads and image management across standard platform folders' }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT authorization token (obtained via /api/v1/seller/auth/login or login-otp).'
      },
      StoreHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-store-id',
        description: 'Active store UUID identifier context.'
      }
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Invalid credentials or resource not found' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['idMode'],
        properties: {
          idMode: { type: 'string', enum: ['phone', 'email'], example: 'phone' },
          phone: { type: 'string', example: '+919876543210' },
          email: { type: 'string', example: 'merchant@adab.com' },
          password: { type: 'string', example: 'SecretPassword123' }
        }
      },
      LoginOtpRequest: {
        type: 'object',
        required: ['idMode', 'otp'],
        properties: {
          idMode: { type: 'string', enum: ['phone', 'email'], example: 'phone' },
          phone: { type: 'string', example: '+919876543210' },
          email: { type: 'string', example: 'merchant@adab.com' },
          otp: { type: 'string', example: '543210' }
        }
      },
      SignupRequest: {
        type: 'object',
        required: ['phone', 'password', 'full_name', 'store_name'],
        properties: {
          phone: { type: 'string', example: '+919876543210' },
          email: { type: 'string', example: 'merchant@adab.com' },
          password: { type: 'string', example: 'SecureP@ss123' },
          full_name: { type: 'string', example: 'Ramesh Patel' },
          store_name: { type: 'string', example: 'Patel Super Kirana' }
        }
      },
      ListingPayload: {
        type: 'object',
        required: ['title', 'sell_price', 'mrp'],
        properties: {
          title: { type: 'string', example: 'Tata Salt Vacuum Evaporated 1kg' },
          mrp: { type: 'number', example: 28.0 },
          sell_price: { type: 'number', example: 26.0 },
          stock_qty: { type: 'number', example: 50 },
          barcode: { type: 'string', example: '8901030010017' },
          sku: { type: 'string', example: 'TATA-SALT-1KG' },
          category_id: { type: 'integer', example: 3 },
          product_type: { type: 'string', enum: ['PACKED_ITEM', 'LOOSE_WEIGHT', 'OWN_BRAND'], example: 'PACKED_ITEM' },
          image_url: { type: 'string', example: 'https://res.cloudinary.com/dqjb134t9/image/upload/v1/adab/products/salt.jpg' }
        }
      },
      POSCheckoutRequest: {
        type: 'object',
        required: ['cart', 'paymentMethod'],
        properties: {
          cart: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string', example: 'Amul Butter 500g' },
                price: { type: 'number', example: 275.0 },
                qty: { type: 'integer', example: 2 }
              }
            }
          },
          paymentMethod: { type: 'string', enum: ['CASH', 'UPI', 'CREDIT_KHATA'], example: 'UPI' },
          customerPhone: { type: 'string', example: '+919876543210' },
          discountAmount: { type: 'number', example: 10.0 }
        }
      },
      PromotionPayload: {
        type: 'object',
        required: ['title', 'promo_type', 'start_date', 'end_date'],
        properties: {
          title: { type: 'string', example: 'Weekend Kirana Bonanza' },
          promo_type: { type: 'string', enum: ['PERCENTAGE', 'FLAT', 'BOGO'], example: 'PERCENTAGE' },
          banner_url: { type: 'string', example: 'https://res.cloudinary.com/dqjb134t9/image/upload/v1/adab/marketing/banners/bonanza.jpg' },
          start_date: { type: 'string', format: 'date-time', example: '2026-11-25T00:00:00.000Z' },
          end_date: { type: 'string', format: 'date-time', example: '2026-11-28T23:59:59.000Z' },
          is_active: { type: 'boolean', example: true }
        }
      },
      CouponPayload: {
        type: 'object',
        required: ['code', 'discount_type', 'discount_value'],
        properties: {
          code: { type: 'string', example: 'KIRANA50' },
          discount_type: { type: 'string', enum: ['PERCENTAGE', 'FIXED'], example: 'PERCENTAGE' },
          discount_value: { type: 'number', example: 10.0 },
          min_order_value: { type: 'number', example: 500.0 },
          max_discount: { type: 'number', example: 100.0 },
          expires_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    // ------------------------------------------------------------------------
    // DOMAIN 1: AUTHENTICATION
    // ------------------------------------------------------------------------
    '/api/v1/seller/auth/login': {
      post: {
        tags: ['1. Authentication & Identity'],
        summary: 'Password-based Seller Login',
        description: 'Authenticates a seller using phone number or email with password.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          200: { description: 'Authenticated successfully with JWT token and store context' },
          401: { description: 'Invalid credentials or inactive account', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/v1/seller/auth/login-otp': {
      post: {
        tags: ['1. Authentication & Identity'],
        summary: 'OTP-based Instant Login',
        description: 'Authenticates a merchant via 6-digit verification code.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginOtpRequest' } } }
        },
        responses: {
          200: { description: 'OTP verified and session token issued' },
          400: { description: 'Invalid or expired OTP' }
        }
      }
    },
    '/api/v1/seller/auth/signup': {
      post: {
        tags: ['1. Authentication & Identity'],
        summary: 'Merchant Registration',
        description: 'Registers a new kirana merchant and auto-initializes store context.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } }
        },
        responses: {
          201: { description: 'Merchant account registered successfully' },
          409: { description: 'Phone number or email already in use' }
        }
      }
    },
    '/api/v1/seller/auth/send-otp': {
      post: {
        tags: ['1. Authentication & Identity'],
        summary: 'Send Verification OTP',
        description: 'Generates and delivers a 6-digit OTP code to phone (SMS) or email (Brevo SMTP).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'mode'],
                properties: {
                  identifier: { type: 'string', example: '+919876543210' },
                  mode: { type: 'string', enum: ['phone', 'email'], example: 'phone' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'OTP dispatched successfully' }
        }
      }
    },
    '/api/v1/seller/auth/verify-otp': {
      post: {
        tags: ['1. Authentication & Identity'],
        summary: 'Verify OTP Code',
        description: 'Validates code before registration or password reset.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'otp'],
                properties: {
                  identifier: { type: 'string', example: '+919876543210' },
                  otp: { type: 'string', example: '543210' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'OTP is valid' }
        }
      }
    },
    '/api/v1/seller/auth/reset-password': {
      post: {
        tags: ['1. Authentication & Identity'],
        summary: 'Reset Merchant Password',
        description: 'Sets a new account password following OTP verification.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'otp', 'newPassword'],
                properties: {
                  identifier: { type: 'string', example: '+919876543210' },
                  otp: { type: 'string', example: '543210' },
                  newPassword: { type: 'string', example: 'BrandNewSecure123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Password reset completed' }
        }
      }
    },
    '/api/v1/seller/auth/google': {
      post: {
        tags: ['1. Authentication & Identity'],
        summary: 'Google OAuth2 Token Exchange',
        description: 'One-Tap Google login exchanging idToken for seller session.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: {
                  idToken: { type: 'string' },
                  accessToken: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated with Google profile' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 2: ONBOARDING, KYC & STORE PROFILE
    // ------------------------------------------------------------------------
    '/api/v1/seller/onboarding': {
      get: {
        tags: ['2. Onboarding, KYC & Store Profile'],
        summary: 'Get 5-Step KYC State',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Returns completed step booleans and current kyc_status' }
        }
      }
    },
    '/api/v1/seller/onboarding/step/{stepNum}': {
      post: {
        tags: ['2. Onboarding, KYC & Store Profile'],
        summary: 'Save Incremental Onboarding Step',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'stepNum', in: 'path', required: true, schema: { type: 'string' }, example: 'stage-1-store-profile' }
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Step payload persisted to database' } }
      }
    },
    '/api/v1/seller/onboarding/submit': {
      post: {
        tags: ['2. Onboarding, KYC & Store Profile'],
        summary: 'Submit Merchant KYC for Review',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'KYC status transitioned to SUBMITTED and dispatched to Admin queue' }
        }
      }
    },
    '/api/v1/seller/store': {
      get: {
        tags: ['2. Onboarding, KYC & Store Profile'],
        summary: 'Get Store Profile & Geolocation',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: { 200: { description: 'Store details, coordinates, operational radius, and opening hours' } }
      },
      patch: {
        tags: ['2. Onboarding, KYC & Store Profile'],
        summary: 'Update Store Details',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Store settings updated' } }
      }
    },
    '/api/v1/seller/dashboard': {
      get: {
        tags: ['2. Onboarding, KYC & Store Profile'],
        summary: 'Get Seller Central Dashboard Analytics',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: {
          200: { description: 'Aggregated metrics: revenue, order count, pending payouts, low-stock alerts' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 3: ORDERS, RETURNS & INVOICES
    // ------------------------------------------------------------------------
    '/api/v1/seller/orders': {
      get: {
        tags: ['3. Orders, Returns & Invoices'],
        summary: 'List Store Orders',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by ACCEPTED, PACKED, SHIPPED, DELIVERED' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: { 200: { description: 'List of orders with line items and customer info' } }
      }
    },
    '/api/v1/seller/orders/{id}/status': {
      patch: {
        tags: ['3. Orders, Returns & Invoices'],
        summary: 'Progress Order Lifecycle State',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] } }
              }
            }
          }
        },
        responses: { 200: { description: 'Order state updated' } }
      }
    },
    '/api/v1/orders/{orderId}/invoice/pdf': {
      get: {
        tags: ['3. Orders, Returns & Invoices'],
        summary: 'Generate Printable GST Tax Invoice',
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Returns formatted HTML/PDF invoice with CGST/SGST breakdown' }
        }
      }
    },
    '/api/v1/seller/returns': {
      get: {
        tags: ['3. Orders, Returns & Invoices'],
        summary: 'List Customer Return Requests',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: { 200: { description: 'Returns array of return claims with item damage photos' } }
      }
    },
    '/api/v1/seller/returns/{id}/status': {
      patch: {
        tags: ['3. Orders, Returns & Invoices'],
        summary: 'Regulate & Update Return Status',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['APPROVED', 'REJECTED', 'REFUNDED'] },
                  refundAmount: { type: 'number' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Return status updated and inventory restocked' } }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 4: POINT OF SALE (POS)
    // ------------------------------------------------------------------------
    '/api/v1/seller/pos/checkout-sale': {
      post: {
        tags: ['4. Point of Sale (POS)'],
        summary: 'Counter POS Walk-in Sale Checkout',
        description: 'Processes in-store physical counter checkout with strict concurrency-safe FOR UPDATE inventory decrement.',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/POSCheckoutRequest' } } }
        },
        responses: {
          201: { description: 'Sale completed, receipt printed, and stock decremented' },
          400: { description: 'Insufficient stock or invalid barcode item' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 5: LISTINGS & INVENTORY
    // ------------------------------------------------------------------------
    '/api/v1/seller/listings': {
      get: {
        tags: ['5. Listings & Inventory'],
        summary: 'List Store Product Inventory',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } }
        ],
        responses: { 200: { description: 'Paginated list of product listings' } }
      },
      post: {
        tags: ['5. Listings & Inventory'],
        summary: 'Create Product Listing',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ListingPayload' } } }
        },
        responses: { 201: { description: 'Listing created' } }
      }
    },
    '/api/v1/seller/listings/{id}': {
      get: {
        tags: ['5. Listings & Inventory'],
        summary: 'Get Product Details by ID',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Complete listing specifications and child variants' } }
      },
      patch: {
        tags: ['5. Listings & Inventory'],
        summary: 'Update Listing Details',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Listing updated' } }
      },
      delete: {
        tags: ['5. Listings & Inventory'],
        summary: 'Delete / Archive Listing',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Listing archived' } }
      }
    },
    '/api/v1/seller/listings/{id}/submit': {
      post: {
        tags: ['5. Listings & Inventory'],
        summary: 'Submit Listing for Admin Moderation',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Listing submitted for review' } }
      }
    },
    '/api/v1/seller/listings/{id}/publish': {
      post: {
        tags: ['5. Listings & Inventory'],
        summary: 'Publish Approved Listing to Customer App',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Listing is now live on customer-facing storefront' } }
      }
    },
    '/api/v1/seller/listings/bulk-upload': {
      post: {
        tags: ['5. Listings & Inventory'],
        summary: 'Bulk Upload Products via CSV',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } }
              }
            }
          }
        },
        responses: { 202: { description: 'Async job queued in BullMQ' } }
      }
    },
    '/api/v1/seller/listings/upload-image': {
      post: {
        tags: ['5. Listings & Inventory', '12. Cloud Storage (Cloudinary)'],
        summary: 'Upload Product Photo to Cloudinary',
        description: 'Uploads an image buffer directly into the adab/products folder on Cloudinary and returns both secure_url and public_id.',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                  folder: { type: 'string', example: 'adab/products' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Image uploaded successfully to Cloudinary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    secure_url: { type: 'string' },
                    public_id: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 6: MASTER FMCG CATALOG
    // ------------------------------------------------------------------------
    '/api/v1/shop/catalog/master/search': {
      get: {
        tags: ['6. Master FMCG Catalog'],
        summary: 'Search National FMCG Products',
        parameters: [
          { name: 'query', in: 'query', required: true, schema: { type: 'string' }, example: 'Amul Butter' }
        ],
        responses: { 200: { description: 'List of matching standardized FMCG products' } }
      }
    },
    '/api/v1/shop/catalog/barcode/{barcode}/lookup-barcode': {
      get: {
        tags: ['6. Master FMCG Catalog'],
        summary: 'Lookup Product by EAN/UPC Barcode',
        parameters: [{ name: 'barcode', in: 'path', required: true, schema: { type: 'string' }, example: '8901262010057' }],
        responses: { 200: { description: 'Returns verified master product specs' } }
      }
    },
    '/api/v1/seller/catalog/adopt': {
      post: {
        tags: ['6. Master FMCG Catalog'],
        summary: '1-Click Adopt FMCG Product to Store Shelf',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['master_catalog_id', 'sell_price'],
                properties: {
                  master_catalog_id: { type: 'string', format: 'uuid' },
                  sell_price: { type: 'number', example: 270.0 },
                  initial_stock: { type: 'integer', default: 10 }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Item adopted into active seller inventory' } }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 7: B2B RESALE & KIRANA-TO-KIRANA
    // ------------------------------------------------------------------------
    '/api/v1/seller/other-store-brands': {
      get: {
        tags: ['7. B2B Resale & Kirana-to-Kirana'],
        summary: 'Discover Nearby Stores Exclusive Brands',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: { 200: { description: 'List of brands open for inter-store retail resale' } }
      }
    },
    '/api/v1/seller/other-store-brands/request-stock': {
      post: {
        tags: ['7. B2B Resale & Kirana-to-Kirana'],
        summary: 'Request Resale Stock from Partner Store',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['brand_listing_id', 'quantity'],
                properties: {
                  brand_listing_id: { type: 'string', format: 'uuid' },
                  quantity: { type: 'integer', example: 50 }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'B2B stock request sent' } }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 8: FINANCE, KHATA & BANK CREDIT
    // ------------------------------------------------------------------------
    '/api/v1/seller/finance/financial-summary': {
      get: {
        tags: ['8. Finance, Khata & Bank Credit'],
        summary: 'Financial Overview & Wallet Balance',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: { 200: { description: 'Gross revenue, unsettled balance, and pending payouts' } }
      }
    },
    '/api/v1/seller/finance/withdraw': {
      post: {
        tags: ['8. Finance, Khata & Bank Credit'],
        summary: 'Request Bank Payout Withdrawal',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: { amount: { type: 'number', example: 5000.0 } }
              }
            }
          }
        },
        responses: { 200: { description: 'Withdrawal settlement initiated' } }
      }
    },
    '/api/v1/seller/finance/khata-ledger': {
      get: {
        tags: ['8. Finance, Khata & Bank Credit'],
        summary: 'Digital Khata Credit Ledger',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: { 200: { description: 'Outstanding customer udhar / credit records' } }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 9: MARKETING & PRICING
    // ------------------------------------------------------------------------
    '/api/v1/seller/promotions': {
      get: {
        tags: ['9. Marketing & Pricing Schedules'],
        summary: 'List Store Promotions',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: { 200: { description: 'Active and upcoming campaigns' } }
      },
      post: {
        tags: ['9. Marketing & Pricing Schedules'],
        summary: 'Create Promotional Campaign',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PromotionPayload' } } }
        },
        responses: { 201: { description: 'Campaign scheduled' } }
      }
    },
    '/api/v1/seller/coupons': {
      get: {
        tags: ['9. Marketing & Pricing Schedules'],
        summary: 'List Discount Coupons',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: { 200: { description: 'Merchant discount promo codes' } }
      },
      post: {
        tags: ['9. Marketing & Pricing Schedules'],
        summary: 'Create Discount Coupon',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponPayload' } } }
        },
        responses: { 201: { description: 'Coupon created' } }
      }
    },
    '/api/v1/seller/coupons/{id}': {
      delete: {
        tags: ['9. Marketing & Pricing Schedules'],
        summary: 'Delete Coupon',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Coupon removed' } }
      }
    },
    '/api/v1/seller/pricing': {
      get: {
        tags: ['9. Marketing & Pricing Schedules'],
        summary: 'List Prices, MRPs, Margins & Schedules',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        responses: { 200: { description: 'Pricing matrix' } }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 10: NOTIFICATIONS & CHAT
    // ------------------------------------------------------------------------
    '/api/v1/seller/notifications/unread-count': {
      get: {
        tags: ['10. Notifications & Chat'],
        summary: 'Get Unread Notification Count Badge',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Returns integer badge count' } }
      }
    },
    '/api/v1/seller/notifications': {
      get: {
        tags: ['10. Notifications & Chat'],
        summary: 'List All Notifications',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Array of alerts with timestamps' } }
      }
    },
    '/api/v1/seller/messages/threads': {
      get: {
        tags: ['10. Notifications & Chat'],
        summary: 'List In-App Chat Threads',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Active buyer & wholesale discussion threads' } }
      }
    },

    // ------------------------------------------------------------------------
    // DOMAIN 11: AI COPILOT & MCP TOOLS
    // ------------------------------------------------------------------------
    '/api/v1/assistant/tools': {
      get: {
        tags: ['11. AI Copilot & MCP Tools'],
        summary: 'Discover Registered AI Assistant MCP Tools',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Returns all 12 registered tools with JSON schemas' } }
      }
    },
    '/api/v1/assistant/ai-copilot-chat': {
      post: {
        tags: ['11. AI Copilot & MCP Tools'],
        summary: 'Conversational Turn with Gemini Copilot',
        security: [{ BearerAuth: [], StoreHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string', example: 'Which items in my inventory are below 5 units stock?' },
                  history: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'AI stream/response with invoked tool results' } }
      }
    }
  }
};

module.exports = swaggerSpec;
