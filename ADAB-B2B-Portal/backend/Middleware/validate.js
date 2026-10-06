import { validationResult } from 'express-validator';

/**
 * Validation middleware — checks express-validator results.
 * Use after validation chains in routes to avoid repeating
 * the same boilerplate in every controller function.
 *
 * Usage in routes:
 *   router.post('/signup', signupValidation, validate, controller.signup);
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export default validate;
