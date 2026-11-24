const fs = require('fs');
const path = require('path');

const guidePath = path.resolve('c:/Users/SHABBIR G/Desktop/ADAB-B2C-TEAM/Tasks/Shabbir_API_Postman_Guide.md');
const outputPath = path.resolve(__dirname, '../src/docs/swagger.json');

const content = fs.readFileSync(guidePath, 'utf8');

const openapi = {
  openapi: '3.0.0',
  info: {
    title: 'ADAB Seller Portal - Interactive Swagger API',
    version: '1.0.0',
    description: `## ADAB B2C/B2B Seller Portal REST API Documentation
Complete interactive API reference containing all **95 endpoints** from the Shabbir API Postman Guide.

### How to Authenticate & Test in Swagger:
1. Scroll down to **1. Authentication** -> **POST /api/v1/seller/auth/login**.
2. Click **Try it out** -> **Execute** (default test seller credentials are prefilled).
3. Copy the **token** value from the JSON response.
4. Click the green **Authorize** 🔓 button at the top right of this page.
5. Paste the token into the box and click **Authorize**.
6. Now you can click **Try it out** and **Execute** on any protected endpoint!`,
    contact: {
      name: 'ADAB Engineering Team'
    }
  },
  servers: [
    {
      url: 'http://localhost:5003',
      description: 'Local Seller Portal Backend (Port 5003)'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your JWT token here (obtained from POST /api/v1/seller/auth/login).'
      }
    }
  },
  tags: [
    { name: '1. Authentication', description: 'Seller Login, Registration & OTP Verification' },
    { name: '2. Dashboard & Analytics', description: 'Real-time Metrics, Sales Charts & Performance' },
    { name: '3. Store & Profile Settings', description: 'Profile, Store Configuration, Notifications & Audio Alerts' },
    { name: '4. Products & Listings', description: 'Product Catalog Management, Multi-SKU Variants & Cloudinary Media' },
    { name: '5. Pricing & Price Engine', description: 'Bulk Pricing Waterfalls, Scheduling, Dynamic Rules & Outbox History' },
    { name: '6. Marketing & Promotions', description: 'Coupons, Promo Banners & Overlap Validations' },
    { name: '7. Customer Orders & Returns', description: 'Customer Order Lifecycles, Fulfillment & Return Handling' },
    { name: '8. B2B Restock & Brand Resale', description: 'B2B Wholesale Purchases, Multi-Carton Checkout, Brand Resale & Partner Kirby' },
    { name: '9. Store Wallet & Settlements', description: 'Ledger Orders, Khata Repayments, Payout Settlements & Bank Withdrawals' },
    { name: '10. Messaging & Support', description: 'Real-time Chat Threads & Read Receipts' },
    { name: '11. Master FMCG & Categories', description: 'Master Catalog, Barcode Scanner & Dynamic Category Trees' }
  ],
  paths: {}
};

function categorizeEndpoint(endpointNum, rawPath, page) {
  const num = parseInt(endpointNum, 10);
  if ([49, 50, 51, 63].includes(num) || rawPath.includes('/auth/')) return '1. Authentication';
  if ([1, 39].includes(num) || rawPath.includes('/dashboard')) return '2. Dashboard & Analytics';
  if ([2, 3, 4, 5, 6, 7, 8, 9, 10].includes(num) || rawPath.includes('/profile') || rawPath.includes('/store') || rawPath.includes('/settings') || rawPath.includes('/notifications')) return '3. Store & Profile Settings';
  if ([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 30, 31, 32, 40, 44, 47, 48, 64].includes(num) || rawPath.includes('/listings') || rawPath.includes('/inventory')) return '4. Products & Listings';
  if ([23, 24, 25, 33, 34, 45, 61, 62].includes(num) || rawPath.includes('/pricing')) return '5. Pricing & Price Engine';
  if ([26, 27, 28, 29, 35, 36, 37, 38, 46].includes(num) || rawPath.includes('/coupons') || rawPath.includes('/promotions')) return '6. Marketing & Promotions';
  if ([79, 80, 81, 82].includes(num) || rawPath.includes('/orders') && !rawPath.includes('/b2b')) return '7. Customer Orders & Returns';
  if ([52, 53, 54, 55, 56, 57, 58, 59, 65, 66, 67, 68, 69, 70, 71, 72, 85, 86, 87, 88, 90, 91].includes(num) || rawPath.includes('/b2b') || rawPath.includes('/kirana') || rawPath.includes('/resale')) return '8. B2B Restock & Brand Resale';
  if ([73, 74, 75, 76, 77, 78, 89].includes(num) || rawPath.includes('/finance') || rawPath.includes('/wallet') || rawPath.includes('/khata') || rawPath.includes('/settlements')) return '9. Store Wallet & Settlements';
  if ([41, 42, 43, 60].includes(num) || rawPath.includes('/threads') || rawPath.includes('/messages')) return '10. Messaging & Support';
  if ([83, 84, 92, 93, 94, 95].includes(num) || rawPath.includes('/catalog') || rawPath.includes('/barcode')) return '11. Master FMCG & Categories';
  return page || 'General';
}

const sections = content.split(/\n(?=### \d+\.)/);

sections.forEach((section) => {
  const matchTitle = section.match(/^### (\d+)\.\s*(.+)/m);
  if (!matchTitle) return;

  const endpointNum = matchTitle[1];
  const endpointTitle = matchTitle[2].trim();

  const matchPage = section.match(/- \*\*Page\*\*:\s*(.+)/);
  const matchApiFor = section.match(/- \*\*Api for\*\*:\s*(.+)/);
  const matchEndpoint = section.match(/- \*\*Endpoint\*\*:\s*(https?:\/\/[^\s\n]+|\/[^\s\n]+)/);
  const matchMethod = section.match(/- \*\*Method\*\*:\s*([A-Z]+)/);
  const matchToken = section.match(/- \*\*Required Token\*\*:\s*(.+)/i);

  if (!matchEndpoint || !matchMethod) return;

  let rawUrl = matchEndpoint[1].trim();
  let endpointPath = rawUrl.replace(/^https?:\/\/[^\/]+/, '');
  
  let queryParams = [];
  if (endpointPath.includes('?')) {
    const parts = endpointPath.split('?');
    endpointPath = parts[0];
    const qs = parts[1];
    const pairs = qs.split('&');
    pairs.forEach(p => {
      const [k, v] = p.split('=');
      if (k) {
        queryParams.push({
          name: k,
          in: 'query',
          required: false,
          schema: { type: 'string' },
          example: v ? decodeURIComponent(v) : undefined
        });
      }
    });
  }

  const pathParams = [];
  endpointPath = endpointPath.replace(/:([a-zA-Z0-9_]+)/g, (match, paramName) => {
    pathParams.push({
      name: paramName,
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `Target ${paramName}`
    });
    return `{${paramName}}`;
  });

  const method = matchMethod[1].toLowerCase();
  const page = matchPage ? matchPage[1].trim() : 'General';
  const apiFor = matchApiFor ? matchApiFor[1].trim() : endpointTitle;
  const tag = categorizeEndpoint(endpointNum, endpointPath, page);
  const requiresAuth = matchToken && !matchToken[1].toLowerCase().includes('none') && !matchToken[1].toLowerCase().includes('public');

  let requestBody = undefined;

  // Handle Form-Data Upload endpoints
  if (endpointPath.includes('upload-image')) {
    requestBody = {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              image: {
                type: 'string',
                format: 'binary',
                description: 'Product or store image to upload to Cloudinary (JPG, PNG, WebP)'
              },
              folder: {
                type: 'string',
                default: 'adab/products',
                description: 'Target Cloudinary folder (e.g. adab/products, adab/sellers/branding)'
              }
            },
            required: ['image']
          }
        }
      }
    };
  } else if (endpointPath.includes('bulk-upload')) {
    requestBody = {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'CSV file containing bulk catalog listings'
              }
            },
            required: ['file']
          }
        }
      }
    };
  } else if (endpointPath.includes('documents') && method === 'post') {
    requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              document_type: { type: 'string', example: 'FSSAI_LICENSE' },
              file_url: { type: 'string', example: 'https://res.cloudinary.com/dqjb134t9/image/upload/v1/adab/sellers/kyc/doc.pdf' }
            },
            required: ['document_type', 'file_url']
          }
        }
      }
    };
  } else {
    // Normal JSON Body
    const reqBodyMatch = section.match(/\*\(Request Body(?:[^\)]*)\)\*:\s*`{1,4}(?:json)?\s*([\s\S]*?)`{1,4}/);
    if (reqBodyMatch && ['post', 'put', 'patch'].includes(method)) {
      try {
        const parsedBody = JSON.parse(reqBodyMatch[1].trim());
        requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: parsedBody
              }
            }
          }
        };
      } catch (_) {
        requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        };
      }
    }
  }

  // Response extraction
  let responseExample = { status: 'success' };
  const respMatch = section.match(/\*\(Expected Response\)\*:\s*`{1,4}(?:json)?\s*([\s\S]*?)`{1,4}/);
  if (respMatch) {
    try {
      responseExample = JSON.parse(respMatch[1].trim());
    } catch (_) {
      responseExample = { raw: respMatch[1].trim() };
    }
  }

  // Update upload response example for Cloudinary
  if (endpointPath.includes('upload-image')) {
    responseExample = {
      url: 'https://res.cloudinary.com/dqjb134t9/image/upload/v1795238571/adab/products/dhdsflo1tkanzxynd1uj.gif',
      image_url: 'https://res.cloudinary.com/dqjb134t9/image/upload/v1795238571/adab/products/dhdsflo1tkanzxynd1uj.gif',
      public_id: 'adab/products/dhdsflo1tkanzxynd1uj',
      image_public_id: 'adab/products/dhdsflo1tkanzxynd1uj'
    };
  }

  if (!openapi.paths[endpointPath]) {
    openapi.paths[endpointPath] = {};
  }

  const allParams = [...pathParams, ...queryParams];

  openapi.paths[endpointPath][method] = {
    tags: [tag],
    summary: `#${endpointNum} - ${endpointTitle}`,
    description: `**Api Purpose**: ${apiFor}\n\n**Postman Guide Section**: Endpoint #${endpointNum} (${page})`,
    operationId: `endpoint_${endpointNum}_${method}`,
    parameters: allParams.length > 0 ? allParams : undefined,
    requestBody: requestBody,
    responses: {
      '200': {
        description: 'Successful Response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              example: responseExample
            }
          }
        }
      },
      '201': {
        description: 'Created Successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              example: responseExample
            }
          }
        }
      },
      '400': { description: 'Validation Error or Bad Request' },
      '401': { description: 'Unauthorized - Missing or invalid JWT Bearer token' },
      '403': { description: 'Forbidden - Insufficient permissions' },
      '404': { description: 'Resource Not Found' },
      '500': { description: 'Internal Server Error' }
    },
    security: requiresAuth ? [{ bearerAuth: [] }] : []
  };
});

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(openapi, null, 2), 'utf8');
console.log(`✅ Generated categorized Swagger spec at: ${outputPath}`);
console.log(`   Registered paths: ${Object.keys(openapi.paths).length}`);
