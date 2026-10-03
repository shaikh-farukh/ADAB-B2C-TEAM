/**
 * Format user data for API responses.
 * Strips sensitive fields and provides a consistent shape
 * used by login, OTP-verify, and other auth responses.
 *
 * @param {object} user - Raw user row from DB (must include JOIN on user_type)
 * @returns {object} Sanitised user object safe for the client
 */
const formatUserResponse = (user) => {
  if (user.shop_name !== undefined) {
    return {
      id: user.id,
      company_name: user.shop_name,
      business_type: 'Shop',
      role: 'shop',
      business_type_id: 3,
      email: user.email_id,
      mobile: user.mobile_no,
      owner_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Shop Owner',
      country: user.fk_country || 'India',
      gst_number: user.gst_id || null,
      address: user.shop_address || user.address || null,
      international_business: false,
      company_logo: user.shop_image || user.user_image || null
    };
  }
  return {
    id: user.id,
    company_name: user.company_name,
    business_type: user.business_type_name || null,
    role: user.business_type_name ? user.business_type_name.toLowerCase() : null,
    business_type_id: user.business_type_id,
    email: user.email,
    mobile: user.mobile,
    owner_name: user.owner_name,
    country: user.country || null,
    gst_number: user.gst_number || null,
    address: user.address || null,
    international_business: user.international_business || false,
    company_logo: user.company_logo || null
  };
};

export default formatUserResponse;
