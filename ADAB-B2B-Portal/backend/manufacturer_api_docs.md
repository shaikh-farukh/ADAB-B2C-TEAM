# 🏭 ADAB B2B Manufacturer API Route Documentation

This document describes all API endpoints designed for the **Manufacturer** role.
All routes require authentication via a JWT Bearer token and the user must have the `manufacturer` business role.

---

## 🔑 Global Headers
All API requests must include the following header:
```http
Authorization: Bearer <your-jwt-token>
```

---

## 📦 Standard Paginated Response Shape
For all list endpoints that return multiple items, pagination is implemented. The response matches this format:
```json
{
  "success": true,
  "pagination": {
    "totalItems": 25,
    "totalPages": 3,
    "currentPage": 1,
    "limit": 10
  },
  "data": [
    // Array of result items
  ]
}
```

---

## 📂 Route Groups

1. [Dashboard & Statistics](#1-dashboard--statistics)
2. [Distributor Directory](#2-distributor-directory)
3. [Partnership Access Requests](#3-partnership-access-requests)
4. [Product Catalog Management](#4-product-catalog-management)
5. [Order Management](#5-order-management)
6. [Categories & Subcategories](#6-categories--subcategories)

---

### 1. Dashboard & Statistics
Base URL path: `/api/manufacturers/dashboard`

#### `GET /`
Fetch manufacturer dashboard overview statistics.
- **Query Parameters**: None
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "products": {
        "total": 12,
        "active": 10,
        "inactive": 2,
        "updated_today": false
      },
      "orders": {
        "total": 45,
        "pending": 5,
        "processing": 12,
        "shipped": 8,
        "delivered": 18,
        "rejected": 2,
        "total_revenue": 154300.50,
        "delivered_revenue": 98450.00,
        "updated_today": true
      },
      "distributors": {
        "total": 8,
        "active": 6,
        "connected": true
      },
      "requests": {
        "pending": 3,
        "approved_by_distributor": 5,
        "rejected_by_distributor": 1,
        "approved_by_manufacturer": 6,
        "rejected_by_manufacturer": 0,
        "action_required": 3
      },
      "order_status_chart": [
        { "status": "delivered", "count": 18, "amount": 98450.00 },
        { "status": "processing", "count": 12, "amount": 42000.00 }
      ]
    }
  }
  ```

#### `GET /orders/summary`
Get breakdown of order statuses with counts, total amounts, and percentage ratios.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      { "status": "delivered", "count": 18, "total_amount": 98450.00, "percentage": 40.00 },
      { "status": "processing", "count": 12, "total_amount": 42000.00, "percentage": 26.67 }
    ]
  }
  ```

#### `GET /efficiency`
Fetch facility efficiency metrics.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "products_per_distributor": "1.50",
      "orders_per_distributor": "5.63",
      "delivery_rate": "40.00",
      "avg_order_value": "3428.90"
    }
  }
  ```

---

### 2. Distributor Directory
Base URL path: `/api/manufacturers/distributors`

#### `GET /`
Fetch list of approved/connected distributors.
- **Query Parameters**:
  - `page` (optional): Page number (default: `1`)
  - `limit` (optional): Number of records per page (default: `10`, max: `100`)
  - `search` (optional): Filter by distributor company name
  - `region` (optional): Filter by country/region
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "pagination": {
      "totalItems": 1,
      "totalPages": 1,
      "currentPage": 1,
      "limit": 10
    },
    "data": [
      {
        "id": 15,
        "distributor_name": "Apex Distribution Ltd",
        "company": "Apex Distribution Ltd",
        "region": "Saudi Arabia",
        "contact_info": {
          "email": "apex@distributor.com",
          "mobile": "+9661234567"
        },
        "active_since": "2026-05-15T08:30:00.000Z",
        "completed_orders": 5
      }
    ]
  }
  ```

#### `GET /regions`
Fetch all unique countries/regions where active distributors exist (useful for filter dropdowns).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": ["Saudi Arabia", "UAE", "Oman"]
  }
  ```

#### `GET /:id`
Get full details of a specific distributor.
- **Path Parameters**:
  - `id`: Integer (ID of the distributor user detail)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 15,
      "distributor_name": "Apex Distribution Ltd",
      "email": "apex@distributor.com",
      "mobile": "+9661234567",
      "country": "Saudi Arabia",
      "address": "789 Trade Lane, Riyadh",
      "gst_number": "GST-123456",
      "owner_name": "Hamad Al-Maktoum",
      "partnership_date": "2026-05-15T08:30:00.000Z",
      "total_orders": 7,
      "completed_orders": 5
    }
  }
  ```
- **Error Response (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      { "type": "field", "value": "xyz", "msg": "Distributor ID must be an integer", "path": "id", "location": "params" }
    ]
  }
  ```

---

### 3. Partnership Access Requests
Base URL path: `/api/manufacturers/requests`

#### `GET /`
Fetch partnership access requests received from distributors.
- **Query Parameters**:
  - `page` (optional): Page number (default: `1`)
  - `limit` (optional): Limit per page (default: `10`)
  - `search` (optional): Filter by distributor name or company name
  - `status` (optional): `PENDING`, `APPROVED`, or `REJECTED`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "pagination": { ... },
    "data": [
      {
        "id": 4,
        "email_distributer": "dist@agency.com",
        "distributor_name": "Agency Distribution",
        "company_name": "Agency Corp",
        "region": "UAE",
        "request_date": "2026-05-20T12:00:00.000Z",
        "manufacture_request": null,
        "distributer_request": 1,
        "status": "PENDING"
      }
    ]
  }
  ```

#### `GET /:id`
Get full details of a specific request.
- **Path Parameters**:
  - `id`: Integer (Request ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 4,
      "manufacturer_id": 1,
      "email_distributer": "dist@agency.com",
      "name": "Agency Distribution",
      "description": "Looking to distribute organic food items.",
      "unique_request_id": "REQ-17823984-ABC4",
      "manufacture_request": null,
      "distributer_request": 1,
      "status": "PENDING",
      "company_name": "Agency Corp",
      "country": "UAE",
      "address": "456 Marina Blvd, Dubai"
    }
  }
  ```

#### `PATCH /:id/accept`
Accept a partnership request.
- **Path Parameters**:
  - `id`: Integer (Request ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Request accepted successfully",
    "data": {
      "id": 4,
      "manufacture_request": 1
    }
  }
  ```

#### `PATCH /:id/reject`
Reject a partnership request.
- **Path Parameters**:
  - `id`: Integer (Request ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Request rejected successfully",
    "data": {
      "id": 4,
      "manufacture_request": 0
    }
  }
  ```

---

### 4. Product Catalog Management
Base URL path: `/api/manufacturers/products`

#### `GET /`
Fetch manufacturer's product list.
- **Query Parameters**:
  - `page` (optional): Page number (default: `1`)
  - `limit` (optional): Limit per page (default: `10`)
  - `status` (optional): `active` or `inactive`
  - `category` (optional): Category name string
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "pagination": { ... },
    "data": [
      {
        "id": 8,
        "product_name": "Organic Honey 500g",
        "price": 15.00,
        "moq": 100,
        "stock_quantity": 500,
        "status": "active"
      }
    ]
  }
  ```

#### `GET /stats`
Get products count summary (total, active, inactive, international, total stock).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "total_products": "12",
      "active_products": "10",
      "inactive_products": "2",
      "international_products": "3",
      "total_stock": "2500"
    }
  }
  ```

#### `GET /:id`
Get single product details.
- **Path Parameters**:
  - `id`: Integer (Product ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 8,
      "manufacturer_id": 1,
      "product_name": "Organic Honey 500g",
      "product_image": "http://example.com/honey.jpg",
      "category": "Food & Beverage",
      "sub_category": "Sweeteners",
      "description": "100% pure organic honey.",
      "price": 15.00,
      "moq": 100,
      "stock_quantity": 500,
      "international_selling": true,
      "international_price": 18.50,
      "export_hs_code": "0409.00",
      "status": "active"
    }
  }
  ```

#### `POST /`
Add a new product.
- **Request Body (JSON)**:
  - `product_name` (required): String
  - `price` (required): Number (minimum: `0`)
  - `moq` (required): Integer (minimum: `1`)
  - `stock_quantity` (optional): Integer (minimum: `0`, default: `0`)
  - `product_image` (optional): String (image URL)
  - `category` (optional): String (category name)
  - `sub_category` (optional): String (subcategory name)
  - `description` (optional): String
  - `international_selling` (optional): Boolean (default: `false`)
  - `international_price` (optional): Number (required if `international_selling` is true)
  - `export_hs_code` (optional): String
  - `status` (optional): `active` or `inactive` (default: `active`)
- **Success Response (211 Created)**:
  ```json
  {
    "success": true,
    "message": "Product added successfully",
    "data": { ... }
  }
  ```

#### `PUT /:id`
Update an existing product (fields are partial/optional).
- **Path Parameters**:
  - `id`: Integer (Product ID)
- **Request Body (JSON)**:
  - Any parameter from the `POST /` list can be optionally passed.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Product updated successfully",
    "data": { ... }
  }
  ```

#### `PATCH /:id/status`
Toggle product active status.
- **Path Parameters**:
  - `id`: Integer (Product ID)
- **Request Body (JSON)**:
  - `status` (required): `active` or `inactive`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Product activated successfully",
    "data": { ... }
  }
  ```

#### `DELETE /:id`
Soft delete a product.
- **Path Parameters**:
  - `id`: Integer (Product ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Product deleted successfully"
  }
  ```

---

### 5. Order Management
Base URL path: `/api/manufacturers/orders`

#### `GET /`
Fetch manufacturer's orders.
- **Query Parameters**:
  - `page` (optional): Page number (default: `1`)
  - `limit` (optional): Limit per page (default: `10`)
  - `status` (optional): `pending`, `processing`, `shipped`, `delivered`, `rejected`
  - `distributor_id` (optional): Integer (distributor's ID)
  - `start_date` (optional): Format `YYYY-MM-DD`
  - `end_date` (optional): Format `YYYY-MM-DD`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "pagination": { ... },
    "data": [
      {
        "id": 142,
        "order_number": "ORD-17182987-99",
        "distributor_id": 15,
        "distributor_name": "Apex Distribution Ltd",
        "order_date": "2026-05-22T08:00:00.000Z",
        "total_amount": 25000.00,
        "status": "pending",
        "item_count": 3
      }
    ]
  }
  ```

#### `GET /summary`
Get overall order counts and revenue statistics.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "total_orders": "45",
      "pending_orders": "5",
      "processing_orders": "12",
      "shipped_orders": "8",
      "delivered_orders": "18",
      "rejected_orders": "2",
      "total_revenue": "154300.50",
      "delivered_revenue": "98450.00",
      "average_order_value": "3428.90"
    }
  }
  ```

#### `GET /:id`
Get full details of a specific order (including items).
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "order": {
        "id": 142,
        "order_number": "ORD-17182987-99",
        "distributor_id": 15,
        "total_amount": 25000.00,
        "status": "pending",
        "shipping_address": "Riyadh Logistics Center, Warehouse 4",
        "status_notes": null,
        "distributor_company_name": "Apex Distribution Ltd",
        "distributor_email": "apex@distributor.com"
      },
      "items": [
        {
          "id": 431,
          "product_id": 8,
          "product_name": "Organic Honey 500g",
          "quantity": 100,
          "unit_price": 15.00,
          "subtotal": 1500.00
        }
      ]
    }
  }
  ```

#### `GET /:id/history`
Get the full timeline/status history of an order.
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 921,
        "order_id": 142,
        "status": "processing",
        "notes": "Order accepted and processing",
        "changed_by": 1,
        "changed_by_name": "Honey Manufacturers Ltd",
        "changed_at": "2026-05-22T09:15:00.000Z"
      },
      {
        "id": 901,
        "order_id": 142,
        "status": "pending",
        "notes": "Order created by distributor",
        "changed_by": 15,
        "changed_by_name": "Apex Distribution Ltd",
        "changed_at": "2026-05-22T08:00:00.000Z"
      }
    ]
  }
  ```

#### `PATCH /:id/status`
Manually update order status. Custom state transitions must follow this flow:
`pending` ➔ `processing` OR `rejected`  
`processing` ➔ `shipped` OR `rejected`  
`shipped` ➔ `delivered`
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Request Body (JSON)**:
  - `status` (required): `pending`, `processing`, `shipped`, `delivered`, `rejected`
  - `notes` (optional): String
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Order status updated successfully",
    "data": { ... }
  }
  ```
- **Error Response (400 Bad Request - Invalid Transition)**:
  ```json
  {
    "success": false,
    "message": "Cannot transition order status from 'delivered' to 'pending'"
  }
  ```

#### `PATCH /:id/accept`
Accept a pending order and transition it to `processing` status.
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Request Body (JSON)**:
  - `estimated_delivery_date` (optional): Date string (e.g., `"2026-06-01"`)
  - `notes` (optional): String
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Order accepted successfully",
    "data": { ... }
  }
  ```

#### `PATCH /:id/reject`
Reject a pending order and transition it to `rejected` status.
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Request Body (JSON)**:
  - `rejection_reason` (required): String
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Order rejected successfully",
    "data": { ... }
  }
  ```

#### `PATCH /:id/ship`
Mark a processing order as shipped.
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Request Body (JSON)**:
  - `tracking_number` (optional): String
  - `shipping_provider` (optional): String
  - `notes` (optional): String
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Order marked as shipped successfully",
    "data": { ... }
  }
  ```

#### `PATCH /:id/deliver`
Mark a shipped order as delivered.
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Request Body (JSON)**:
  - `notes` (optional): String
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Order marked as delivered successfully",
    "data": { ... }
  }
  ```

#### `GET /:id/invoice`
Generate and download billing/invoice data for the frontend to render.
- **Path Parameters**:
  - `id`: Integer (Order ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Invoice data generated successfully",
    "data": {
      "order": { ... },
      "items": [ ... ],
      "invoice_number": "INV-ORD-17182987-99",
      "invoice_date": "2026-05-23T10:45:00.000Z"
    }
  }
  ```

---

### 6. Categories & Subcategories
Base URL path: `/api/manufacturers`

#### `GET /categories`
Fetch paginated list of categories.
- **Query Parameters**:
  - `page` (optional): Page number (default: `1`)
  - `limit` (optional): Limit per page (default: `10`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "pagination": { ... },
    "data": [
      {
        "id": 1,
        "category_name": "Food & Beverage",
        "description": "Organic beverages and snacks.",
        "active": true,
        "subcategory_count": 4,
        "product_count": 10,
        "created_at": "2026-05-01T06:00:00.000Z"
      }
    ]
  }
  ```

#### `GET /categories/:id`
Get single category along with its subcategories list.
- **Path Parameters**:
  - `id`: Integer (Category ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "category": {
        "id": 1,
        "category_name": "Food & Beverage",
        "description": "Organic beverages and snacks.",
        "active": true
      },
      "subcategories": [
        {
          "id": 10,
          "category_id": 1,
          "subcategory_name": "Sweeteners",
          "description": "Natural sweetening agents",
          "active": true
        }
      ]
    }
  }
  ```

#### `POST /categories`
Create a new category.
- **Request Body (JSON)**:
  - `category_name` (required): String (max: `100` chars)
  - `description` (optional): String (max: `500` chars)
- **Success Response (211 Created)**:
  ```json
  {
    "success": true,
    "message": "Category created successfully",
    "data": { ... }
  }
  ```

#### `PUT /categories/:id`
Update an existing category's name, description, or status.
- **Path Parameters**:
  - `id`: Integer (Category ID)
- **Request Body (JSON)**:
  - `category_name` (optional): String (cannot be empty if sent)
  - `description` (optional): String
  - `active` (optional): Boolean
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Category updated successfully",
    "data": { ... }
  }
  ```

#### `DELETE /categories/:id`
Soft-delete a category (cascades soft-delete to all of its subcategories).
- **Rule**: Fails if there are active products assigned to this category.
- **Path Parameters**:
  - `id`: Integer (Category ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Category and its subcategories deleted successfully"
  }
  ```
- **Error Response (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Cannot delete category with existing products. Please reassign or delete products first."
  }
  ```

#### `GET /categories/:category_id/subcategories`
Get list of subcategories nested under a specific category.
- **Path Parameters**:
  - `category_id`: Integer
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": 10,
        "subcategory_name": "Sweeteners",
        "description": "Natural sweeteners",
        "active": true,
        "product_count": 3,
        "created_at": "2026-05-02T08:00:00.000Z"
      }
    ]
  }
  ```

#### `POST /categories/:category_id/subcategories`
Create a new subcategory nested under a category.
- **Path Parameters**:
  - `category_id`: Integer
- **Request Body (JSON)**:
  - `subcategory_name` (required): String (max: `100` chars)
  - `description` (optional): String (max: `500` chars)
- **Success Response (211 Created)**:
  ```json
  {
    "success": true,
    "message": "Subcategory created successfully",
    "data": { ... }
  }
  ```

#### `PUT /subcategories/:id`
Update an existing subcategory.
- **Path Parameters**:
  - `id`: Integer (Subcategory ID)
- **Request Body (JSON)**:
  - `subcategory_name` (optional): String
  - `description` (optional): String
  - `active` (optional): Boolean
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Subcategory updated successfully",
    "data": { ... }
  }
  ```

#### `DELETE /subcategories/:id`
Soft-delete a subcategory.
- **Rule**: Fails if there are active products assigned to this subcategory.
- **Path Parameters**:
  - `id`: Integer (Subcategory ID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Subcategory deleted successfully"
  }
  ```
