export const getManufacturerDistributorsSubquery = (paramPlaceholder) => {
  return `(
    SELECT u.id
    FROM manage_b_to_b_userdetail u
    INNER JOIN manage_b_to_b_request_access r ON u.email = r.email_distributer
    WHERE r.manufacturer_id = ${paramPlaceholder}
      AND r.deleted_at IS NULL
      AND r.manufacture_request = 1
      AND r.distributer_request = 1
      AND u.deleted_at IS NULL
      AND u.business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Distributor' LIMIT 1)
      AND u.id != ${paramPlaceholder}
  )`;
};
