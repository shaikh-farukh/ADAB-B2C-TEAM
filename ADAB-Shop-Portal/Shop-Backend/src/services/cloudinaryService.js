const crypto = require('crypto');

class CloudinaryService {
  constructor() {
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dqjb134t9';
    this.apiKey = process.env.CLOUDINARY_API_KEY || '791155926953727';
    this.apiSecret = process.env.CLOUDINARY_API_SECRET || 'CxhCxoEYb6-n_2XDG81eI8iIIpc';
  }

  isConfigured() {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  /**
   * Generates a SHA-1 signature for Cloudinary API requests
   * @param {Object} params - Key-value map of parameters to sign
   * @returns {string} Hex signature
   */
  generateSignature(params) {
    const sortedKeys = Object.keys(params)
      .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .sort();
    const strToSign = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + this.apiSecret;
    return crypto.createHash('sha1').update(strToSign).digest('hex');
  }

  /**
   * Upload an image buffer to Cloudinary adhering to ADAB platform folder hierarchy
   * @param {Buffer} fileBuffer - The image file buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File mime type (e.g. image/jpeg, image/png, image/webp)
   * @param {Object} [options] - Optional upload parameters
   * @param {string} [options.folder='adab/products'] - Cloudinary folder (e.g. 'adab/products', 'adab/sellers/branding', 'adab/sellers/kyc', 'adab/profile-images')
   * @param {string} [options.publicId] - Optional custom public ID
   * @returns {Promise<{ url: string, secure_url: string, public_id: string, format: string, width: number, height: number, bytes: number }>}
   */
  async uploadImage(fileBuffer, originalName, mimeType = 'image/jpeg', options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured.');
    }

    const folder = typeof options === 'string' ? options : (options?.folder || 'adab/products');
    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign = {
      folder,
      timestamp: String(timestamp)
    };

    if (options.publicId) {
      paramsToSign.public_id = options.publicId;
    }

    const signature = this.generateSignature(paramsToSign);

    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const bodyParams = {
      file: dataUri,
      api_key: this.apiKey,
      signature,
      ...paramsToSign
    };

    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
      method: 'POST',
      body: new URLSearchParams(bodyParams)
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`Cloudinary upload failed: ${data.error?.message || res.statusText}`);
    }

    return {
      url: data.secure_url,
      secure_url: data.secure_url,
      public_id: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
      bytes: data.bytes
    };
  }

  /**
   * Delete an image from Cloudinary by its public ID to prevent orphaned files
   * @param {string} publicId - The Cloudinary public_id
   * @returns {Promise<{ result: string }>}
   */
  async destroyImage(publicId) {
    if (!this.isConfigured() || !publicId) {
      return { result: 'skipped' };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      public_id: publicId,
      timestamp: String(timestamp)
    };
    const signature = this.generateSignature(paramsToSign);

    const bodyParams = {
      ...paramsToSign,
      api_key: this.apiKey,
      signature
    };

    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, {
      method: 'POST',
      body: new URLSearchParams(bodyParams)
    });

    const data = await res.json();
    return data;
  }

  /**
   * Alias for destroyImage to maintain backward compatibility
   */
  async deleteImage(publicId) {
    return this.destroyImage(publicId);
  }
}

module.exports = new CloudinaryService();
