const productService = require('../services/adminProductService');
const { ProductFilterDto, ProductModerationDto, ProductModerationResponseDto } = require('../dtos/productDto');

class AdminProductController {
  async getProducts(req, res) {
    try {
      const filters = new ProductFilterDto(req.query);
      const result = await productService.getProducts(filters);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error fetching admin products:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
  }

  async getProductDetails(req, res) {
    try {
      const { id } = req.params;
      const product = await productService.getProductDetails(id);
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      
      res.json({ success: true, data: product });
    } catch (error) {
      console.error('Error fetching admin product details:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch product details' });
    }
  }

  async approveProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await productService.moderateProduct(id, 'APPROVE');
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.json(new ProductModerationResponseDto(true, 'Product approved successfully', product));
    } catch (error) {
      console.error('Error approving product:', error);
      res.status(500).json({ success: false, message: 'Failed to approve product' });
    }
  }

  async rejectProduct(req, res) {
    try {
      const { id } = req.params;
      const moderationDto = new ProductModerationDto(req.body);
      
      const validationError = moderationDto.validate('REJECT');
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const product = await productService.moderateProduct(id, 'REJECT', moderationDto.reason);
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.json(new ProductModerationResponseDto(true, 'Product rejected successfully', product));
    } catch (error) {
      console.error('Error rejecting product:', error);
      res.status(500).json({ success: false, message: 'Failed to reject product' });
    }
  }

  async requestChangesProduct(req, res) {
    try {
      const { id } = req.params;
      const moderationDto = new ProductModerationDto(req.body);
      
      const validationError = moderationDto.validate('REQUEST_CHANGES');
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const product = await productService.moderateProduct(id, 'REQUEST_CHANGES', moderationDto.reason);
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.json(new ProductModerationResponseDto(true, 'Changes requested successfully', product));
    } catch (error) {
      console.error('Error requesting changes:', error);
      res.status(500).json({ success: false, message: 'Failed to request changes' });
    }
  }

  async suspendProduct(req, res) {
    try {
      const { id } = req.params;
      const moderationDto = new ProductModerationDto(req.body);
      
      // Suspend might require a reason too
      const product = await productService.moderateProduct(id, 'SUSPEND', moderationDto.reason);
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.json(new ProductModerationResponseDto(true, 'Product suspended successfully', product));
    } catch (error) {
      console.error('Error suspending product:', error);
      res.status(500).json({ success: false, message: 'Failed to suspend product' });
    }
  }
}

module.exports = new AdminProductController();
