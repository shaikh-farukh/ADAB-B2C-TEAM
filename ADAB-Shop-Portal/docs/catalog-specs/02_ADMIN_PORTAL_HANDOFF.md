# ADAB B2C Catalog Architecture — Document 2
# Admin Portal Technical Handoff Specification

**Target Team:** ADAB-Admin-Portal Engineering Team (Their Responsibility)  
**Target Codebase:** `ADAB-Admin-Portal/Admin-Backend` & `ADAB-Admin-Portal/Admin-Frontend`  
**Shared Database:** PostgreSQL (`adab_b2c_team`)  
**Version:** 2.0.0 (Production-Ready Architecture Specification — Aligned across all 3 Portals)

---

## ⚠️ MANDATORY FIRST STEP: Audit Your Own Codebase First

> [!IMPORTANT]
> **To the Admin Portal Engineering Team:**  
> Before writing any new code or creating new files, **first inspect and audit your own existing codebase**:
> 1. Check your existing routes in `Admin-Backend/routes/adminRoutes.js` and `Admin-Backend/src/routes/adminRoutes.js`.
> 2. Inspect your existing controllers (`adminApprovalController.js`, `productBoundaryController.js`, etc.) to see what listing approval endpoints already exist.
> 3. Inspect your existing frontend pages in `Admin-Frontend/src/pages/` (e.g. `ApprovalQueue.jsx`, `Settings.jsx`, `Reports.jsx`).
> 4. Identify exactly what is already working and what remains to be built according to this specification. Do not assume your repository is completely empty or completely updated—verify first against your local Git history.

---

## 1. Shared Database Governance & Migration Plan

> [!NOTE]
> **Database Ownership & Joint Approval Protocol:**  
> All three portals share a single PostgreSQL database (`adab_b2c_team`).  
> 1. **Shop Portal Prepares Migrations:** The Shop Portal engineering team has authored the consolidated DDL migration script:  
>    `ADAB-Shop-Portal/Shop-Backend/migrations/004_catalog_dynamic_attributes_and_variants.sql`.
> 2. **Review & Sign-Off:** Before executing this migration in production, all three portal leads (Shop, Admin, Customer) must review and approve the schema changes.
> 3. **Zero Migration Burden for Admin Team:** The Admin team does **NOT** need to write or run database DDL scripts. Once the migration is executed by the designated DB lead, your team's responsibility is solely to build the backend queries, Admin API endpoints, and the React UI components.

---

## 2. Complete Page-to-API-to-Table Mapping (Admin Portal)

Use this table as your exact architectural guide for connecting Admin Portal pages to database tables:

| Admin Page / View | Frontend Component | Backend API Endpoint | Database Tables Accessed | Operation (Read / Write) | Exact Columns & Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Category Tree Studio** | `TaxonomyStudio.jsx`<br>*(Tree Panel)* | `GET /api/v1/admin/taxonomy/tree`<br>`POST /api/v1/admin/taxonomy/categories`<br>`PUT /api/v1/admin/taxonomy/categories/:id` | `categories` | **READ & WRITE** | • **Read**: `id`, `name`, `slug`, `parent_id`, `level`, `materialized_path`, `is_leaf`, `is_active`, `display_order`<br>• **Write**: `INSERT` new nodes; `UPDATE` name, `parent_id`, `is_leaf`, `materialized_path` on move/rename. |
| **Category Reparenting & Move** | `TaxonomyStudio.jsx`<br>*(Drag-and-Drop / Move Modal)* | `PUT /api/v1/admin/taxonomy/categories/:id/move` | `categories` | **WRITE (Transaction)** | • **Update**: Recursively recalculates `level` and `materialized_path` for target node and all its descendants. Updates parent `is_leaf` flags. |
| **Category Merge Tool** | `TaxonomyStudio.jsx`<br>*(Merge Modal)* | `POST /api/v1/admin/taxonomy/categories/merge` | `categories`<br>`seller_listings`<br>`category_aliases` | **WRITE (Transaction)** | • **Update**: `seller_listings.category_id` (moves products from old to new category)<br>• **Copy**: `category_aliases` to target category<br>• **Update**: `categories.is_active = false` (soft-deactivates source category). |
| **Global Attribute Dictionary** | `AttributeDictionary.jsx`<br>*(or Studio Center)* | `GET /api/v1/admin/taxonomy/attributes`<br>`POST /api/v1/admin/taxonomy/attributes`<br>`PUT /api/v1/admin/taxonomy/attributes/:id` | `attribute_definitions` | **READ & WRITE** | • **Read**: `id`, `code`, `label`, `description`, `data_type`, `ui_type`, `allowed_values`, `unit_options`, `validation_regex`<br>• **Write**: `INSERT` new attribute; `UPDATE` allowed enum values or description. |
| **Category Attribute Binder & Inheritance** | `TaxonomyStudio.jsx`<br>*(Attribute Tab)* | `GET /api/v1/admin/taxonomy/categories/:id/attributes`<br>`POST /api/v1/admin/taxonomy/categories/:id/attributes` | `category_attributes`<br>`attribute_definitions`<br>`categories` | **READ & WRITE** | • **Read**: Recursive CTE joining `category_attributes` and `attribute_definitions` across category ancestors.<br>• **Write**: `INSERT` / `UPDATE` into `category_attributes` (`category_id`, `attribute_id`, `is_required`, `is_variant_key`, `is_filter_facet`, `section_group`, `display_order`). |
| **Search Aliases & Synonyms** | `TaxonomyStudio.jsx`<br>*(Aliases Tab)* | `GET /api/v1/admin/taxonomy/categories/:id/aliases`<br>`POST /api/v1/admin/taxonomy/categories/:id/aliases`<br>`DELETE /api/v1/admin/taxonomy/aliases/:id` | `category_aliases`<br>`search_synonyms` | **READ & WRITE** | • **Read**: `id`, `category_id`, `alias_term`, `language_code`<br>• **Write**: `INSERT` / `DELETE` aliases (e.g. "Gents Kurti" $\rightarrow$ Kurtas) and keyword clusters in `search_synonyms`. |
| **National Master Catalog Manager** | `MasterCatalogPage.jsx` | `GET /api/v1/admin/catalog/master`<br>`POST /api/v1/admin/catalog/master`<br>`POST /api/v1/admin/catalog/master/import-csv` | `master_catalog_items`<br>`categories` | **READ & WRITE** | • **Read**: `id`, `barcode`, `product_name`, `brand_name`, `category_id`, `printed_mrp`, `standard_unit`, `default_image_url`<br>• **Write**: `INSERT` new FMCG products (manual or bulk CSV import); `UPDATE` details. |
| **Product Approval Queue** | `ApprovalQueue.jsx`<br>*(Review Modal)* | `GET /api/v1/admin/approvals/queue`<br>`GET /api/v1/admin/approvals/:id`<br>`POST /api/v1/admin/approvals/:id/transition` | `seller_listings`<br>`listing_variants`<br>`product_images`<br>`product_approval_history`<br>`stores` | **READ & WRITE** | • **Read**: `seller_listings` (`title`, `mrp`, `sell_price`, `product_type`, `attributes JSONB`, `has_variants`, `master_catalog_id`, `manufacturer_product_id`), `listing_variants` (all child SKUs), `product_images`.<br>• **Write**: `UPDATE seller_listings.approval_status` (`APPROVED`, `PUBLISHED`, `CHANGES_REQUIRED`, `REJECTED`), `rejection_reason`; `INSERT` into `product_approval_history`. |
| **Promote Seller Item to Master Catalog** | `ApprovalQueue.jsx`<br>*(Action Button)* | `POST /api/v1/admin/catalog/master/promote-listing/:listingId` | `seller_listings`<br>`master_catalog_items`<br>`catalog_promotion_audit`<br>`product_images` | **WRITE (Transaction)** | • **Validate**: Check duplicate barcode with advisory lock. Reject if `product_type === 'OWN_BRAND'`.<br>• **Write**: `INSERT INTO master_catalog_items`, `UPDATE seller_listings.master_catalog_id = new_id`, `INSERT INTO catalog_promotion_audit`. |

---

## 3. Product Lifecycle & Approval State Machine

All three portals share the standardized 9-state lifecycle:

```
[DRAFT] ──> [SUBMITTED] ──> [UNDER_REVIEW] ──> [APPROVED] ──> [PUBLISHED]
                 │                 │                │
                 │                 ├──> [CHANGES_REQUIRED] ──> (Seller edits back to SUBMITTED)
                 │                 │
                 └──> [REJECTED] <─┘
                       
(Post-Publication Operational States: [SUSPENDED], [ARCHIVED])
```

### 3.1 Status Definitions & Semantic Rules:
1. `DRAFT`: Seller is authoring the listing in Shop Portal. Not visible to Admin or Customer.
2. `SUBMITTED`: Seller submitted listing for marketplace review. Appears in Admin Approval Queue.
3. `UNDER_REVIEW`: Admin reviewer has locked/opened the listing to inspect specifications.
4. `APPROVED`: Admin has verified that category, brand, and specifications meet marketplace standards. (Internal approval state).
5. `PUBLISHED`: Listing is actively indexable and visible on Customer Portal app.
   - *Auto-Publish Rule:* When Admin sets status to `APPROVED`, if the seller's store is verified and active (`stores.is_active = true`), the listing immediately transitions to `PUBLISHED`.
   - *Manual Publish Option:* Admin may also approve while holding publication if store onboarding is pending.
6. `CHANGES_REQUIRED`: Admin specifies corrections required from the seller (e.g. "Upload clearer back label with FSSAI logo"). Seller receives feedback in Shop Portal and can resubmit (`SUBMITTED`).
7. `REJECTED`: Permanently rejected due to policy violations, counterfeit claims, or banned substances.
8. `SUSPENDED`: Temporarily deactivated due to customer complaints or seller compliance review.
9. `ARCHIVED`: Soft-deleted or permanently discontinued by seller or admin.

### 3.2 Audit Trail Enforcement (`product_approval_history`)
Every status transition performed by an admin **MUST** insert a row into `product_approval_history`:
```sql
INSERT INTO product_approval_history (
    id, listing_id, previous_status, new_status, changed_by, notes, created_at
) VALUES (
    gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
);
```

---

## 4. Category Hierarchy & Materialized Path Maintenance

The `categories` table uses an adjacency list (`parent_id`) combined with a `materialized_path` (dot-delimited path of category IDs, e.g. `8.81.811`) to enable instant subtree lookups without recursive queries during customer browsing.

### 4.1 Schema Definition
```sql
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    level INT NOT NULL DEFAULT 1,
    materialized_path VARCHAR(500),
    is_leaf BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    google_product_category_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_materialized_path ON categories(materialized_path);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
```

### 4.2 Maintenance Engine & Tree Operations

#### Operation A: Creating a New Category Node
```javascript
// POST /api/v1/admin/taxonomy/categories
async function createCategory(client, { name, slug, parent_id, is_leaf = true, display_order = 0 }) {
  let level = 1;
  let materialized_path = null;

  if (parent_id) {
    const parentRes = await client.query(
      `SELECT id, level, materialized_path, is_leaf FROM categories WHERE id = $1 FOR UPDATE`,
      [parent_id]
    );
    if (parentRes.rows.length === 0) throw new Error('Parent category not found');
    const parent = parentRes.rows[0];

    level = parent.level + 1;
    // If parent was previously marked as leaf, flip is_leaf to false
    if (parent.is_leaf) {
      await client.query(`UPDATE categories SET is_leaf = false, updated_at = NOW() WHERE id = $1`, [parent_id]);
    }

    const insertRes = await client.query(
      `INSERT INTO categories (name, slug, parent_id, level, is_leaf, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, slug, parent_id, level, is_leaf, display_order]
    );
    const newId = insertRes.rows[0].id;
    materialized_path = parent.materialized_path ? `${parent.materialized_path}.${newId}` : `${parent.id}.${newId}`;

    await client.query(`UPDATE categories SET materialized_path = $1 WHERE id = $2`, [materialized_path, newId]);
    return { id: newId, name, slug, level, materialized_path };
  } else {
    // Top-level root category
    const insertRes = await client.query(
      `INSERT INTO categories (name, slug, parent_id, level, is_leaf, display_order)
       VALUES ($1, $2, NULL, 1, $3, $4) RETURNING id`,
      [name, slug, is_leaf, display_order]
    );
    const newId = insertRes.rows[0].id;
    await client.query(`UPDATE categories SET materialized_path = $1 WHERE id = $2`, [newId.toString(), newId]);
    return { id: newId, name, slug, level: 1, materialized_path: newId.toString() };
  }
}
```

#### Operation B: Moving / Re-Parenting a Category Subtree
When a category is moved to a new parent:
1. Prevent circular parent loops (a node cannot be moved under its own descendant).
2. Calculate the path difference (`old_path` vs `new_path`).
3. Atomically update the node and **all descendants** using string replacement:
```sql
-- Move category :node_id to :new_parent_id
UPDATE categories
SET 
  materialized_path = $new_parent_path || '.' || $node_id || SUBSTRING(materialized_path FROM LENGTH($old_node_path) + 1),
  level = level + ($new_parent_level + 1 - $old_node_level),
  updated_at = NOW()
WHERE materialized_path LIKE $old_node_path || '.%' OR id = $node_id;
```

#### Operation C: Consolidating / Merging Categories
```sql
BEGIN;
  -- 1. Reassign all active seller listings to target category
  UPDATE seller_listings 
  SET category_id = $target_id, updated_at = NOW() 
  WHERE category_id = $source_id;

  -- 2. Copy aliases to target category (skip duplicates)
  INSERT INTO category_aliases (category_id, alias_term, language_code)
  SELECT $target_id, alias_term, language_code 
  FROM category_aliases 
  WHERE category_id = $source_id
  ON CONFLICT DO NOTHING;

  -- 3. Soft-deactivate source category
  UPDATE categories 
  SET is_active = false, updated_at = NOW() 
  WHERE id = $source_id;
COMMIT;
```

---

## 5. Attribute Inheritance & Validation Rules

Category attributes follow top-down inheritance from Root Department $\rightarrow$ Sub-Category $\rightarrow$ Leaf Category.

### 5.1 Inheritance Architecture:
* **Ancestor Attributes Cascade Down:** An attribute assigned to `Fashion & Apparel` (e.g. `brand_name`, `country_of_origin`) applies to all descendants (`Men's Clothing`, `Kurtas & Ethnic Sets`).
* **Child Overrides & Specialization:**
  * If an ancestor marks an attribute as optional (`is_required = false`), a leaf category can override it to mandatory (`is_required = true`). For example: `fabric_material` is optional in `Fashion`, but mandatory in `Kurtas & Ethnic Sets`.
  * **Regulatory Immutability:** If an ancestor marks an attribute as legally mandatory (`is_required = true`, e.g. FSSAI License in Food), child categories **CANNOT** relax it to optional.
  * **Allowed Values Restriction:** A leaf category may provide a restricted subset of enum values from the global dictionary.

### 5.2 Dynamic Attribute Inheritance Query (Recursive CTE)
To fetch the complete resolved attribute contract for any category:
```sql
WITH RECURSIVE cat_tree AS (
    SELECT id, parent_id, 1 as depth
    FROM categories
    WHERE id = $1
    UNION ALL
    SELECT c.id, c.parent_id, ct.depth + 1
    FROM categories c
    JOIN cat_tree ct ON c.id = ct.parent_id
)
SELECT DISTINCT ON (ad.code)
    ad.id AS attribute_id,
    ad.code,
    ad.label,
    ad.data_type,
    ad.ui_type,
    ad.allowed_values,
    ad.unit_options,
    ad.validation_regex,
    ca.section_group,
    ca.display_order,
    -- If any category in hierarchy requires it, it is required (leaf takes precedence)
    BOOL_OR(ca.is_required) OVER (PARTITION BY ad.code) AS is_required,
    BOOL_OR(ca.is_variant_key) OVER (PARTITION BY ad.code) AS is_variant_key,
    BOOL_OR(ca.is_filter_facet) OVER (PARTITION BY ad.code) AS is_filter_facet,
    c.name AS assigned_at_category
FROM cat_tree ct
JOIN category_attributes ca ON ct.id = ca.category_id
JOIN attribute_definitions ad ON ca.attribute_id = ad.id
JOIN categories c ON ca.category_id = c.id
ORDER BY ad.code, ct.depth ASC;
```

---

## 6. Master Catalog Curation & Promotion Engine

The `master_catalog_items` table stores verified FMCG items (e.g. Tata Salt, Maggi, Coca-Cola).

### 6.1 Unindexed Seller Item Promotion Endpoint
When an admin reviews a listing where `product_type === 'PACKED_ITEM'` and both `master_catalog_id` and `manufacturer_product_id` are null, the admin can click **"Promote to Master Catalog"**.

#### Strict Safeguards Implemented in Promotion:
1. **Advisory Lock on Barcode:** Uses `pg_advisory_xact_lock(hashtext(barcode))` to eliminate duplicate inserts if multiple admins review simultaneous submissions.
2. **Duplicate Check:** If the barcode already exists in `master_catalog_items`, the endpoint links the existing `master_catalog_id` to the seller listing instead of creating a duplicate row.
3. **Strict Privacy Security Rule:** Throws `400 Bad Request` if `sl.product_type === 'OWN_BRAND'`. Store-exclusive private label items must **NEVER** be promoted to the public master catalog!
4. **Primary Image Copying:** Copies the verified primary image from `product_images`.
5. **Audit Logging:** Inserts a record into `catalog_promotion_audit`.

#### Production Promotion Implementation:
```javascript
// POST /api/v1/admin/catalog/master/promote-listing/:listingId
async function promoteListingToMasterCatalog(req, res) {
  const { listingId } = req.params;
  const adminId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch listing details
    const listingRes = await client.query(
      `SELECT id, title, barcode, brand_tag, category_id, mrp, unit, product_type, store_id
       FROM seller_listings WHERE id = $1 FOR UPDATE`,
      [listingId]
    );
    if (listingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const listing = listingRes.rows[0];

    // PRIVACY ENFORCEMENT
    if (listing.product_type === 'OWN_BRAND') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Security Policy Violation: Own Brand private label items cannot be promoted to shared Master Catalog'
      });
    }

    if (!listing.barcode || !/^[0-9]{8,14}$/.test(listing.barcode)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Listing must have a valid 8-14 digit numeric EAN/UPC barcode for master catalog indexing'
      });
    }

    // 2. Concurrency Lock on Barcode
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [listing.barcode]);

    // 3. Duplicate Barcode Detection
    const dupRes = await client.query(
      `SELECT id FROM master_catalog_items WHERE barcode = $1`,
      [listing.barcode]
    );

    let masterCatalogId;
    if (dupRes.rows.length > 0) {
      // Barcode already exists in Master Catalog -> Link existing ID
      masterCatalogId = dupRes.rows[0].id;
    } else {
      // 4. Fetch primary image
      const imgRes = await client.query(
        `SELECT image_url FROM product_images WHERE product_id = $1 AND is_primary = true LIMIT 1`,
        [listingId]
      );
      const primaryImage = imgRes.rows.length > 0 ? imgRes.rows[0].image_url : null;

      // 5. Insert new Master Catalog Item
      const insertRes = await client.query(
        `INSERT INTO master_catalog_items (
           barcode, product_name, brand_name, category_id, printed_mrp, standard_unit, default_image_url, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id`,
        [listing.barcode, listing.title, listing.brand_tag || 'Generic', listing.category_id, listing.mrp, listing.unit, primaryImage]
      );
      masterCatalogId = insertRes.rows[0].id;
    }

    // 6. Link seller listing to Master Catalog
    await client.query(
      `UPDATE seller_listings SET master_catalog_id = $1, updated_at = NOW() WHERE id = $2`,
      [masterCatalogId, listingId]
    );

    // 7. Audit Log
    await client.query(
      `INSERT INTO catalog_promotion_audit (
         id, listing_id, master_catalog_id, promoted_by, promoted_barcode, created_at
       ) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
      [listingId, masterCatalogId, adminId, listing.barcode]
    );

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'Product successfully promoted to National Master Catalog',
      masterCatalogId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
}
```

---

## 7. Barcode vs Manufacturer SKU & Verified Badging

The Admin Portal must distinguish between Barcodes and Manufacturer SKUs:

| Field | Typical Value | Semantic Purpose | Master Catalog Indexed? |
| :--- | :--- | :--- | :--- |
| **Barcode** | `8901030383749` (8–14 digits numeric) | Global GS1 standard (EAN/UPC) representing physical product packaging. | **YES** (`master_catalog_items.barcode`). |
| **Manufacturer SKU** | `DUB-M-001` (Alphanumeric) | Manufacturer's internal B2B production code from `manage_manufacturer_products`. | **NO** (Only stored in `manage_manufacturer_products.sku` or `listing_variants.sku`). |

### Approval Queue Sourcing Badges:
1. `[National Master Catalog - Verified]`: `master_catalog_id` is NOT NULL. Verified standard FMCG item.
2. `[B2B Manufacturer - Verified]`: `manufacturer_product_id` is NOT NULL. Sourced directly from registered B2B manufacturer. Displays manufacturer company name and SKU.
3. `[Store Private Label - Own Brand]`: `product_type === 'OWN_BRAND'`. Displays store name; disables "Promote to Master" button.
4. `[Manual Packed Item - Unverified]`: `product_type === 'PACKED_ITEM'` and both IDs are NULL. Displays "Promote to Master Catalog" action button.

---

## 8. Admin-Frontend Component Architecture

The Admin Frontend team must implement a dedicated **Taxonomy Studio** and update the existing Product Approval Queue.

### 8.1 New Page: Taxonomy Studio (`src/pages/TaxonomyStudio.jsx`)
* **Left Panel (Category Tree Navigator)**:
  * Collapsible tree structure showing Department $\rightarrow$ Category $\rightarrow$ Leaf.
  * Search bar to instantly jump to any node.
  * Node badge showing `is_leaf` status and active listing count.
  * Drag-and-drop or modal trigger for node reparenting.
* **Center Panel (Node Properties & Attribute Binder)**:
  * Displays selected category's metadata.
  * **Inherited Attributes Section**: Lists attributes flowing down from ancestors (read-only indicator with override toggle).
  * **Assigned Attributes Section**: Directly mapped attributes with toggles:
    * `[✓] Mandatory (is_required)`
    * `[✓] Variation Axis (is_variant_key)`
    * `[✓] Search Facet (is_filter_facet)`
* **Right Panel (Aliases & Vernacular Synonyms)**:
  * Chip input list of search keywords mapped to this category (e.g. "Gents Kurti" $\rightarrow$ Kurtas).
  * Synonyms cluster management connecting to `search_synonyms`.

### 8.2 Updates to [`ApprovalQueue.jsx`](file:///C:/Users/SHABBIR%20G/Desktop/ADAB-B2C-TEAM/ADAB-Admin-Portal/Admin-Frontend/src/pages/ApprovalQueue.jsx)
When an admin reviews a product:
1. **Sourcing Badge**: Renders the 4 sourcing tiers outlined in Section 7.
2. **Dynamic Attributes Table**: Renders key-value table from `listing.attributes`.
3. **Variants Grid**: If `listing.has_variants === true`, renders table of all child SKUs from `listing_variants` showing `sku`, `barcode`, `mrp`, `sell_price`, `stock_qty`, and attribute swatches.
4. **Transition Controls**:
   * Approve (`APPROVED` / `PUBLISHED`)
   * Request Changes (`CHANGES_REQUIRED` with comment modal)
   * Reject (`REJECTED` with reason modal)

---

## 9. Testing & Acceptance Criteria for Admin Portal Team

| Test ID | Area | Scenario | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-ADM-01** | Tree | Create a 4th-level child category under "Men's Clothing". | Node saved with `level: 4`, correct `materialized_path`, and `is_leaf: true`. Parent `is_leaf` toggled to `false`. |
| **TC-ADM-02** | Reparenting | Move "Casual Shirts" from "Men's Clothing" to "Unisex Apparel". | Category and all sub-nodes updated with new `materialized_path` and `level` in a single atomic transaction. |
| **TC-ADM-03** | Master Cat | Admin imports CSV of 500 new FMCG products. | Records inserted into `master_catalog_items`; immediately searchable across all portals. |
| **TC-ADM-04** | Promotion | Admin clicks "Promote to Master Catalog" on manual packed item. | Item inserted into `master_catalog_items`; seller listing updated with `master_catalog_id`; logged in `catalog_promotion_audit`. |
| **TC-ADM-05** | Privacy | Admin attempts to promote an `OWN_BRAND` Kurti to Master Catalog. | Backend rejects action with `400: Security Policy Violation: Own Brand private label items cannot be promoted to shared Master Catalog`. |
| **TC-ADM-06** | Approval | Admin reviews multi-variant Kurti in Approval Queue and approves it. | Renders specifications table and 6-row variant matrix; status transitions to `PUBLISHED`; audit record written to `product_approval_history`. |
