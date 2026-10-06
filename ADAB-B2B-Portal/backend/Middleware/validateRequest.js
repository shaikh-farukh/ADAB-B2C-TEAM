import logger from '../utils/logger.js';

/**
 * Universal Joi validation middleware.
 * Validates request properties (body, query, params) against provided schemas.
 * Rejects invalid requests with 422 Unprocessable Entity and strips unknown fields (if stripUnknown is set in schema options).
 *
 * @param {Object} schemas - An object containing Joi schemas for 'body', 'query', and/or 'params'.
 * @returns {Function} Express middleware function.
 */
export const validateRequest = (schemas) => {
    return (req, res, next) => {
        const validationOptions = {
            abortEarly: false, // Include all errors
            allowUnknown: false, // Reject unknown fields
            stripUnknown: true // Remove unknown fields
        };

        const errors = {};

        // Validate body
        if (schemas.body) {
            const { error, value } = schemas.body.validate(req.body, validationOptions);
            if (error) {
                errors.body = error.details.map(err => err.message);
            } else {
                req.body = value; // Replace with validated/stripped value
            }
        }

        // Validate query
        if (schemas.query) {
            const { error, value } = schemas.query.validate(req.query, validationOptions);
            if (error) {
                errors.query = error.details.map(err => err.message);
            } else {
                req.query = value;
            }
        }

        // Validate params
        if (schemas.params) {
            const { error, value } = schemas.params.validate(req.params, validationOptions);
            if (error) {
                errors.params = error.details.map(err => err.message);
            } else {
                req.params = value;
            }
        }

        // If any validation failed, return 422
        if (Object.keys(errors).length > 0) {
            logger.warn(`[VALIDATION_ERROR] Request validation failed on ${req.method} ${req.originalUrl}`);
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        next();
    };
};

export default validateRequest;
