import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { getOfflinePincodeHint, lookupPincode } from '../utils/pincode';
import CartView from '../components/CartView';

describe('Address & Pincode Auto-Detection Enhancements', () => {
  it('1. Instant offline pincode hint resolves Ahmedabad and Surat accurately', () => {
    const ahmedabadHint = getOfflinePincodeHint('380051');
    expect(ahmedabadHint).not.toBeNull();
    expect(ahmedabadHint.city).toBe('Ahmedabad');
    expect(ahmedabadHint.state).toBe('Gujarat');

    const suratHint = getOfflinePincodeHint('395002');
    expect(suratHint).not.toBeNull();
    expect(suratHint.city).toBe('Surat');
    expect(suratHint.state).toBe('Gujarat');

    const vadodaraHint = getOfflinePincodeHint('390001');
    expect(vadodaraHint.city).toBe('Vadodara');
  });

  it('2. Full pincode lookup returns district and state', async () => {
    const res = await lookupPincode('380051');
    expect(res).not.toBeNull();
    expect(res.city).toBe('Ahmedabad');
    expect(res.state).toBe('Gujarat');
  });

  it('3. CartView renders dynamic delivery address without hardcoding Surat when Ahmedabad address is provided', () => {
    const ahmedabadAddress = {
      id: 'addr_ahm_1',
      label: 'Home',
      type: 'Home',
      address_line: 'F-302 VEnus parkland, vejalpur',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380051',
      full_address: 'F-302 VEnus parkland, vejalpur, Ahmedabad, 380051',
      is_verified: true
    };

    const html = renderToString(
      <CartView
        cartData={{
          items: [{ cart_item_id: 'c1', product_name: 'Moong Dal 1kg', sell_price: 150, quantity: 1 }],
          summary: { subtotal: 150, grand_total: 179, delivery_fee: 29 }
        }}
        selectedDeliveryAddress={ahmedabadAddress}
      />
    );

    // Verify it displays the user's Ahmedabad address
    expect(html).toContain('Delivering to Home');
    expect(html).toContain('Ahmedabad');
    expect(html).toContain('F-302 VEnus parkland');
    expect(html).toContain('Change');
  });
});
