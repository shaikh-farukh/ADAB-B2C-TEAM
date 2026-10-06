/**
 * Utility for normalizing application and PostgreSQL database errors into clean, friendly JSON responses
 */

function formatError(error) {
  let message = error.message || 'An unexpected error occurred.';
  let statusCode = 400;

  // Handle PostgreSQL specific error codes
  if (error.code) {
    switch (error.code) {
      case '23514': // check_violation
        message = 'Invalid input value: submitted data does not meet database constraint rules.';
        statusCode = 400;
        break;
      case '23503': // foreign_key_violation
        message = 'Referenced resource or ID was not found in the database.';
        statusCode = 404;
        break;
      case '23505': // unique_violation
        message = 'A record with this unique information already exists.';
        statusCode = 409;
        break;
      case '22P02': // invalid_text_representation (e.g. invalid UUID)
        message = 'Invalid format for identifier or numeric value.';
        statusCode = 400;
        break;
      case '08006': // connection_failure
      case '57P01': // admin_shutdown
        message = 'Database service temporarily unavailable. Please try again.';
        statusCode = 503;
        break;
      default:
        break;
    }
  }

  // Handle not found
  if (message.toLowerCase().includes('not found')) {
    statusCode = 404;
  }

  return {
    statusCode,
    response: {
      status: 'error',
      message
    }
  };
}

function validatePositiveQuantity(qty) {
  if (qty === undefined || qty === null) {
    return { valid: false, message: 'Quantity is required.' };
  }
  const num = Number(qty);
  if (isNaN(num) || num <= 0) {
    return { valid: false, message: 'Quantity must be a positive number greater than 0.' };
  }
  return { valid: true, value: num };
}

module.exports = {
  formatError,
  validatePositiveQuantity
};
