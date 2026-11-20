# ADAB Platform: Cloudinary Asset & Folder Guidelines
**For Seller Portal & Admin Portal Development Teams**

---

## 1. Overview

All three ADAB portals (**Customer**, **Seller**, and **Admin**) share **one single Cloudinary account**. 

This ensures:
- Shared free-tier bandwidth and storage quota.
- Consistent image CDN URLs across all apps.
- Product and store images uploaded by sellers load instantly on customer-facing pages.

---

## 2. Environment Variables (.env)

Each portal backend must include the same three Cloudinary credentials in its `.env` file:

```bash
# Cloudinary Shared Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

> **Note:** The `CLOUDINARY_API_SECRET` must **never** be exposed in frontend React/Vue/client code. Always generate upload signatures or perform uploads via the backend.

---

## 3. Standard Folder Conventions

> **Important:** You **DO NOT** need to log in to the Cloudinary website to manually create folders. Cloudinary automatically creates folders the first time an image is uploaded with that folder path.

Please adhere to this platform folder hierarchy:

| Portal | Asset Type | Cloudinary `folder` Parameter | Max Size | Allowed Formats |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Portal** | Profile Photos / Avatars | `adab/profile-images` | 2 MB | JPG, JPEG, PNG, WebP |
| **Seller Portal** | Store Logos & Shop Fronts | `adab/sellers/branding` | 2 MB | JPG, JPEG, PNG, WebP |
| **Seller Portal** | KYC & Business Documents | `adab/sellers/kyc` | 5 MB | JPG, PNG, PDF |
| **Seller / Admin** | Product Catalog Images | `adab/products` | 5 MB | JPG, JPEG, PNG, WebP |
| **Admin Portal** | Marketing / Carousel Banners | `adab/marketing/banners` | 5 MB | JPG, JPEG, PNG, WebP |
| **Admin Portal** | Category Icons & Badges | `adab/categories` | 1 MB | JPG, PNG, WebP, SVG |

---

## 4. How to Implement in Your Backend

Whenever generating an upload signature or uploading an image, simply set the `folder` parameter to your designated folder:

### Example: Direct Upload / Signature Generation

```javascript
// Example in Node.js backend
const folder = 'adab/products'; // Change to match your portal's asset type

const paramsToSign = {
  folder: folder,
  public_id: `prod_${productId}_${Date.now()}`,
  timestamp: Math.floor(Date.now() / 1000)
};

// Cloudinary will automatically place the image inside "adab/products/"
```

---

## 5. Database Storage Best Practice

Whenever saving an image record to your database (e.g. Postgres / Neon), always save **two fields**:

1. **`image_url` (TEXT):** Cloudinary's `secure_url` (used by frontends to display the image).
2. **`image_public_id` (TEXT):** Cloudinary's `public_id` (e.g., `adab/products/prod_123_1710000000`).

### Why store the `public_id`?
When a seller or admin **deletes** or **replaces** a product or banner, your backend should call Cloudinary's destroy API:

```javascript
// Deletes the asset so you never keep orphaned files or waste Cloudinary storage
await cloudinary.uploader.destroy(image_public_id);
```

---

## 6. Image URL Optimization Tip (Free Feature)

Cloudinary automatically optimizes images on the fly via URL parameters. For fast page loads, recommend using automatic format and quality in your frontend image tags:

```
https://res.cloudinary.com/<cloud_name>/image/upload/f_auto,q_auto/<public_id>
```
- `f_auto`: Automatically serves WebP or AVIF to modern browsers.
- `q_auto`: Automatically compresses the file with zero visible loss in quality.

