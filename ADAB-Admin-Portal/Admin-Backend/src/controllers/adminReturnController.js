const returnService = require('../services/adminReturnService');
const { ReturnFilterDto, ReturnActionDto } = require('../dtos/returnDto');

class AdminReturnController {
  async getReturns(req, res) {
    try {
      const filters = new ReturnFilterDto(req.query);
      const result = await returnService.getReturns(filters);
      res.json({ success: true, data: result.returns, pagination: { total: result.totalRecords, page: result.page, limit: result.limit, totalPages: result.totalPages } });
    } catch (error) {
      console.error('Error fetching admin returns:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch returns' });
    }
  }

  async getReturnDetails(req, res) {
    try {
      const { id } = req.params;
      const ret = await returnService.getReturnDetails(id);
      
      if (!ret) {
        return res.status(404).json({ success: false, message: 'Return not found' });
      }
      
      res.json({ success: true, data: ret });
    } catch (error) {
      console.error('Error fetching admin return details:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch return details' });
    }
  }

  async resolveReturn(req, res) {
    try {
      const { id } = req.params;
      const actionDto = new ReturnActionDto(req.body);
      
      const validationError = actionDto.validate();
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const ret = await returnService.resolveReturn(id, actionDto.action, actionDto.rejection_reason, actionDto.notes);
      
      if (!ret) {
        return res.status(404).json({ success: false, message: 'Return not found' });
      }

      res.json({ success: true, message: 'Return resolved successfully', data: ret });
    } catch (error) {
      console.error('Error resolving return:', error);
      res.status(500).json({ success: false, message: 'Failed to resolve return' });
    }
  }
}

module.exports = new AdminReturnController();
