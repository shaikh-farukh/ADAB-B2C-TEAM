# 🚚 ADAB B2B Distributor API Route Documentation

This document describes all API endpoints designed for the **Distributor** role.
All routes require authentication via a JWT Bearer token and the user must have the `distributor` business role.

---

## 🔑 Global Headers
All API requests must include the following header:
```http
Authorization: Bearer <your-jwt-token>
```

---

## 📂 Route Groups

1. [Dashboard & Health Scan](#1-dashboard--health-scan)
2. [Manufacturers Discovery](#2-manufacturers-discovery)
3. [Partnership Access Requests](#3-partnership-access-requests)
4. [Catalog & Products](#4-catalog--products)
5. [Cart Management](#5-cart-management)
6. [Order & Invoice Management](#6-order--invoice-management)

---

### 1. Dashboard & Health Scan
Base URL path: `/api/distributors/dashboard`

#### `GET /`
Fetch distributor dashboard overview statistics, including order statuses and spending volume analysis.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "procurement_metrics": {
        "connected_manufacturers": 3,
        "total_orders": 12,
        "pending_orders": 2,
        "approved_orders": 8,
        "pending_payments": 450.00,
        "total_spent": 12450.00
      },
      "order_lifecycle": [
        { "status": "pending", "count": 2 },
        { "status": "processing", "count": 1 },
        { "status": "delivered", "count": 8 }
      ],
      "recent_orders": [
        {
          "id": 42,
          "order_number": "ORD-179834279-ABC",
          "manufacturer_name": "Premium Foods Ltd",
          "order_date": "2026-05-22T10:30:00.000Z",
          "total_amount": 1500.00,
          "status": "PENDING",
          "items_count": 2
        }
      ],
      "volume_analysis": [
        {
          "date": "2026-05-20",
          "order_count": 1,
          "total_amount": 500.00
        }
      ]
    }
  }
  ```

#### `GET /health`
Get procurement health scan metrics including completion rate, rejection rate, and average order value.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "completion_rate": "66.67",
      "rejection_rate": "8.33",
      "avg_order_value": "1037.50",
      "active_manufacturers": 3
    }
  }
  ```

---

### 2. Manufacturers Discovery
Base URL path: `/api/distributors/manufacturers`

#### `GET /`
Fetch a list of all active manufacturers in the system to discover and apply for partnerships.
- **Query Parameters**:
  - `search` (optional): Filter manufacturers by company name.
  - `category` (optional): Filter manufacturers by product specialty categories.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": 1,
        "manufacturer_name": "Premium Foods Ltd",
        "country": "India",
        "specialties": ["Grains", "Oils", "Spices"],
        "market_reach": "INTERNATIONAL",
        "international_business": "Yes"
      }
    ]
  }
  ```

#### `GET /categories`
Fetch all unique categories listed across active manufacturers (for discovery filters).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": ["Beverages", "Grains", "Oils", "Spices"]
  }
  ```

#### `GET /:id`
Get full details of a specific manufacturer, including its unique specialties and the current partnership status relative to the requesting distributor.
- **Path Parameters**:
  - `id`: Integer (ID of the manufacturer user detail)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "manufacturer_name": "Premium Foods Ltd",
      "email": "info@premiumfoods.com",
      "mobile": "+919876543210",
      "country": "India",
      "address": "45 Industrial Zone, Mumbai",
      "gst_number": "GSTIN9876A",
      "owner_name": "Rajesh Kumar",
      "market_reach": "INTERNATIONAL",
      "international_business": "Yes",
      "specialties": ["Grains", "Oils", "Spices"],
      "partnership": {
        "status": "PENDING", // PENDING, REJECTED, APPROVED, or NOT_CONNECTED
        "request_id": 18,     // null if NOT_CONNECTED
        "unique_request_id": "REQ-1782947239-DA83", // null if NOT_CONNECTED
        "request_date": "2026-05-23T11:00:00.000Z" // null if NOT_CONNECTED
      }
    }
  }
  ```
- **Error Response (404 Not Found)**:
  ```json
  {
    "success": false,
    "message": "Manufacturer not found or inactive"
  }
  ```

---

### 3. Partnership Access Requests
Base URL path: `/api/distributors/requests`

#### `POST /`
Send a B2B access request to a manufacturer to unlock their product catalog.
- **Request Body (JSON)**:
  - `manufacturer_id` (required): Integer (ID of the manufacturer)
  - `name` (optional): String (custom request moniker or name, defaults to manufacturer name)
  - `description` (optional): String (brief note introducing your distribution business)
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Request sent successfully",
    "data": {
      "id": 18,
      "manufacturer_id": 1,
      "name": "Premium Foods Ltd",
      "created_at": "2026-05-23T11:00:00.000Z"
    }
  }
  ```
- **Error Response (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Request already sent to this manufacturer and is pending approval"
  }
  ```

#### `GET /my-status`
Get a summary overview of all submitted partnership requests and their statuses.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 3,
    "stats": {
      "total_requests": 3,
      "pending": 1,
      "approved": 2,
      "rejected": 0
    },
    "data": [
      {
        "id": 18,
        "manufacturer_id": 1,
        "manufacturer_name": "Premium Foods Ltd",
        "region": "India",
        "request_date": "2026-05-23T11:00:00.000Z",
        "current_status": "PENDING"
      }
    ]
  }
  ```

#### `GET /:id`
Get full details of a specific partnership request.
- **Path Parameters**:
  - `id`: Integer (Request access ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 18,
      "manufacturer_id": 1,
      "email_distributer": "apex@distributor.com",
      "name": "Premium Foods Ltd",
      "description": "Looking to buy products in bulk.",
      "unique_request_id": "REQ-1782947239-DA83",
      "manufacture_request": null,
      "distributer_request": 1,
      "current_status": "PENDING",
      "manufacturer_company_name": "Premium Foods Ltd",
      "manufacturer_email": "info@premiumfoods.com",
      "manufacturer_mobile": "+919876543210",
      "country": "India"
    }
  }
  ```

---

### 4. Catalog & Products
Base URL path: `/api/distributors/catalog`
*Note: Catalog endpoints only return products from manufacturers with whom the distributor has an approved partnership.*

#### `GET /`
List products available from connected manufacturers.
- **Query Parameters**:
  - `search` (optional): Filter products by name.
  - `category` (optional): Filter products by category.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": 8,
        "product_name": "Organic Olive Oil 1L",
        "product_image": "http://example.com/oil.jpg",
        "category": "Oils",
        "price": 12.50,
        "moq": 50,
        "stock_quantity": 300,
        "international_selling": "Yes",
        "international_price": 14.00,
        "manufacturer_name": "Premium Foods Ltd",
        "manufacturer_id": 1
      }
    ]
  }
  ```

#### `GET /categories`
Get unique product categories available in your connected catalog.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": ["Oils", "Spices"]
  }
  ```

#### `GET /:id`
Get full details of a specific catalog product.
- **Path Parameters**:
  - `id`: Integer (Product ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 8,
      "manufacturer_id": 1,
      "product_name": "Organic Olive Oil 1L",
      "product_image": "http://example.com/oil.jpg",
      "category": "Oils",
      "sub_category": "Cooking Oils",
      "description": "Extra virgin cold pressed olive oil.",
      "price": 12.50,
      "moq": 50,
      "stock_quantity": 300,
      "international_selling": true,
      "international_price": 14.00,
      "export_hs_code": "1509.10",
      "status": "active",
      "manufacturer_name": "Premium Foods Ltd"
    }
  }
  ```

---

### 5. Cart Management
Base URL path: `/api/distributors/cart`
*Note: A distributor can only add products from manufacturers they have an approved relationship with. Stock and MOQ boundaries are validated on write.*

#### `POST /`
Add a product to the cart (or increment quantity if already present).
- **Request Body (JSON)**:
  - `product_id` (required): Integer
  - `quantity` (required): Integer (minimum: must be at least product MOQ)
- **Success Response (201 Created - New Item)**:
  ```json
  {
    "success": true,
    "message": "Product added to cart successfully",
    "data": {
      "id": 11,
      "distributor_id": 15,
      "product_id": 8,
      "quantity": 50,
      "price": "12.50"
    }
  }
  ```
- **Success Response (200 OK - Updated Quantity)**:
  ```json
  {
    "success": true,
    "message": "Cart updated successfully",
    "data": {
      "id": 11,
      "quantity": 100
    }
  }
  ```

#### `GET /`
Retrieve all cart items, grouped with subtotal calculations and order summaries.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": {
      "items": [
        {
          "cart_id": 11,
          "product_id": 8,
          "product_name": "Organic Olive Oil 1L",
          "product_image": "http://example.com/oil.jpg",
          "manufacturer_name": "Premium Foods Ltd",
          "manufacturer_id": 1,
          "quantity": 50,
          "price": 12.50,
          "moq": 50,
          "stock_quantity": 300,
          "subtotal": 625.00
        }
      ],
      "summary": {
        "items_subtotal": 625.00,
        "estimated_fees": 31.25,
        "shipping": 0.00,
        "total_amount": 656.25
      }
    }
  }
  ```

#### `PUT /:id`
Update the quantity of a specific cart line item.
- **Path Parameters**:
  - `id`: Integer (Cart Item ID, `cart_id`)
- **Request Body (JSON)**:
  - `quantity` (required): Integer (must be $\ge$ MOQ and $\le$ Stock)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Cart updated successfully",
    "data": {
      "id": 11,
      "quantity": 75
    }
  }
  ```

#### `DELETE /:id`
Remove an item from the cart.
- **Path Parameters**:
  - `id`: Integer (Cart Item ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Item removed from cart successfully"
  }
  ```

#### `DELETE /`
Clear all items from the cart.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Cart cleared successfully"
  }
  ```

---

### 6. Order & Invoice Management
Base URL path: `/api/distributors/orders`

#### `POST /`
Checkout the cart. If the cart contains items from multiple manufacturers, separate orders are created automatically for each manufacturer. Stock levels are safely decremented under database locks.
- **Request Body (JSON)**:
  - `shipping_address` (required): String
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Order(s) placed successfully",
    "data": {
      "orders": [
        {
          "order_id": 87,
          "order_number": "ORD-179834279-XYZ",
          "manufacturer_id": 1,
          "total_amount": 625.00,
          "items_count": 1
        }
      ],
      "total_orders": 1
    }
  }
  ```

#### `GET /`
Get list of placed orders.
- **Query Parameters**:
  - `status` (optional): Filter by `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, or `REJECTED`.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": 87,
        "order_number": "ORD-179834279-XYZ",
        "manufacturer_id": 1,
        "manufacturer_name": "Premium Foods Ltd",
        "order_date": "2026-05-23T11:05:00.000Z",
        "total_amount": 625.00,
        "status": "PENDING",
        "tracking_number": null,
        "items_count": 1,
        "created_at": "2026-05-23T11:05:00.000Z"
      }
    ]
  }
  ```

#### `GET /:id`
Get full details of a specific order, including manufacturer contact info and line items.
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "order": {
        "id": 87,
        "order_number": "ORD-179834279-XYZ",
        "manufacturer_id": 1,
        "distributor_id": 15,
        "total_amount": 625.00,
        "shipping_address": "Main Distribution Warehouse, Riyadh",
        "status": "PENDING",
        "manufacturer_name": "Premium Foods Ltd",
        "manufacturer_email": "sales@premiumfoods.com",
        "manufacturer_mobile": "+919876543210",
        "manufacturer_address": "45 Industrial Zone, Mumbai"
      },
      "items": [
        {
          "id": 139,
          "order_id": 87,
          "product_id": 8,
          "product_name": "Organic Olive Oil 1L",
          "product_sku": "OIL-OLIVE-ORG-1L",
          "quantity": 50,
          "unit_price": 12.50,
          "product_image": "http://example.com/oil.jpg",
          "category": "Oils"
        }
      ]
    }
  }
  ```

#### `GET /:id/invoices`
Fetch financial invoice details for an order (after manufacturer has generated the invoice). Pulls subtotal, GST breakdowns, allocation balances, and full payout references.
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Invoice retrieved successfully",
    "data": {
      "invoice_id": 34,
      "invoice_number": "INV-2026-0089",
      "invoice_date": "2026-05-23T11:10:00.000Z",
      "due_date": "2026-06-23T11:10:00.000Z",
      "invoice_status": "unpaid",
      "order": {
        "order_id": 87,
        "order_number": "ORD-179834279-XYZ",
        "order_date": "2026-05-23T11:05:00.000Z",
        "shipping_address": "Main Distribution Warehouse, Riyadh",
        "order_status": "processing"
      },
      "manufacturer": {
        "id": 1,
        "company_name": "Premium Foods Ltd",
        "address": "45 Industrial Zone, Mumbai",
        "gst_number": "GSTIN9876A",
        "email": "sales@premiumfoods.com",
        "mobile": "+919876543210",
        "bank_details": "{\"bank_name\": \"HDFC\", \"account_no\": \"1234567890\"}"
      },
      "distributor": {
        "id": 15,
        "company_name": "Apex Distribution Ltd",
        "address": "789 Trade Lane, Riyadh",
        "gst_number": "GST-SA-543",
        "email": "apex@distributor.com",
        "mobile": "+9661234567"
      },
      "items": [
        {
          "id": 139,
          "product_id": 8,
          "product_name": "Organic Olive Oil 1L",
          "product_sku": "OIL-OLIVE-ORG-1L",
          "product_image": "http://example.com/oil.jpg",
          "category": "Oils",
          "quantity": 50,
          "unit_price": 12.50,
          "subtotal": 625.00
        }
      ],
      "financials": {
        "subtotal_amount": 625.00,
        "gst_percent": 18.00,
        "gst_amount": 112.50,
        "total_amount": 737.50,
        "total_paid": 0.00,
        "balance_due": 737.50
      },
      "payments": []
    }
  }
  ```
- **Error Response (404 Not Found - Invoice Not Yet Created)**:
  ```json
  {
    "success": false,
    "message": "Invoice not yet generated for this order. Please contact the manufacturer."
  }
  ```
