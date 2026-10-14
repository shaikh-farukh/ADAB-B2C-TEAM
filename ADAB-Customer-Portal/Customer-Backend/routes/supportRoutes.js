const express = require('express');
const supportController = require('../controllers/supportController');

const router = express.Router();

// POST /api/v1/support/tickets — Create ticket
router.post('/tickets', supportController.createTicket);

// GET /api/v1/support/tickets — List tickets
router.get('/tickets', supportController.getCustomerTickets);

// GET /api/v1/support/tickets/:id — Get ticket details & messages
router.get('/tickets/:id', supportController.getTicketDetails);

// POST /api/v1/support/tickets/:id/messages — Send reply message
router.post('/tickets/:id/messages', supportController.sendTicketMessage);

// PATCH /api/v1/support/tickets/:id — Update ticket status
router.patch('/tickets/:id', supportController.updateTicketStatus);

module.exports = router;
