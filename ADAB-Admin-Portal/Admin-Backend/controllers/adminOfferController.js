const offerService = require('../services/adminOfferService');

async function getOffers(req, res) {
  try {
    const result = await offerService.getOffers(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
}

async function createOffer(req, res) {
  try {
    const result = await offerService.createOffer(req.body);
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }
    return res.status(201).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
}

async function updateOffer(req, res) {
  try {
    const result = await offerService.updateOffer(req.params.id, req.body);
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
}

async function deleteOffer(req, res) {
  try {
    const result = await offerService.deleteOffer(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
}

async function activateOffer(req, res) {
  try {
    const result = await offerService.toggleOfferStatus(req.params.id, true);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
}

async function pauseOffer(req, res) {
  try {
    const result = await offerService.toggleOfferStatus(req.params.id, false);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
}

async function validateOffer(req, res) {
  try {
    const result = await offerService.validateOffer(req.body);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
}

module.exports = {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  activateOffer,
  pauseOffer,
  validateOffer
};
