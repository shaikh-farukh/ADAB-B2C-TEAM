/**
 * Responsibility: Shared validation logic for consistent UI error messaging across the portal.
 * Pattern: Functions return null on success or a string error message on failure.
 */

/**
 * Validates that a field is not empty or just whitespace.
 */
export const requiredField = (value: any, fieldName: string = 'This field'): string | null => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validates corporate email formats.
 */
export const validateEmail = (value: string): string | null => {
  if (!value) return 'Email address is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Please enter a valid corporate email format (e.g., name@company.com)';
  }
  return null;
};

/**
 * Validates mobile numbers (Generic international/domestic 10-15 digits).
 */
export const validateMobile = (value: string): string | null => {
  if (!value) return 'Mobile number is required';
  const mobileRegex = /^\+?[\d\s-]{10,15}$/;
  if (!mobileRegex.test(value)) {
    return 'Please enter a valid mobile number (10-15 digits)';
  }
  return null;
};

/**
 * Validates enterprise password policy.
 * Requirements: Min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character.
 */
export const validatePassword = (value: string): string | null => {
  if (!value) return 'Password is required';

  if (value.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecialChar = /[@$!%*?&]/.test(value);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return 'Must include uppercase, lowercase, number, and special character (@$!%*?&)';
  }

  return null;
};

/**
 * Validates Indian GST Number format (15 characters).
 */
export const validateGST = (value: string): string | null => {
  if (!value) return 'GST Number is required';
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(value.toUpperCase())) {
    return 'Please enter a valid 15-digit GST identification number';
  }
  return null;
};

/**
 * Validates that a value is a valid number and optionally non-negative.
 */
export const validateNumber = (value: any, fieldName: string = 'Value', min: number = 0): string | null => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (num < min) {
    return `${fieldName} cannot be less than ${min}`;
  }
  return null;
}