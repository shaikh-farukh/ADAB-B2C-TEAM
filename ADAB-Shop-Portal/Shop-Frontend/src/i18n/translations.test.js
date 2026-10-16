import { describe, it, expect } from 'vitest';
import { translations } from './translations';

describe('i18n Translations Dictionary', () => {
  it('defines en, hi, and gu translations', () => {
    expect(translations.en).toBeDefined();
    expect(translations.hi).toBeDefined();
    expect(translations.gu).toBeDefined();
  });

  const enKeys = Object.keys(translations.en);

  it('contains essential keys in English', () => {
    expect(enKeys.length).toBeGreaterThan(50);
    expect(translations.en.appName).toBe('ADAB Seller');
    expect(translations.en.storeOpen).toBe('Store: Open');
    expect(translations.en.storeClosed).toBe('Store: Closed');
  });

  it('has corresponding keys for all English keys in Hindi (hi)', () => {
    const missingInHi = enKeys.filter(
      (key) => translations.hi[key] === undefined || translations.hi[key] === ''
    );
    expect(missingInHi).toEqual([]);
  });

  it('has corresponding keys for all English keys in Gujarati (gu)', () => {
    const missingInGu = enKeys.filter(
      (key) => translations.gu[key] === undefined || translations.gu[key] === ''
    );
    expect(missingInGu).toEqual([]);
  });

  it('preserves interpolation place-holders across languages', () => {
    // Check signOutModalDesc has {storeName}
    expect(translations.en.signOutModalDesc).toContain('{storeName}');
    expect(translations.hi.signOutModalDesc).toContain('{storeName}');
    expect(translations.gu.signOutModalDesc).toContain('{storeName}');

    // Check customerOrdersDesc has {city} and {radius}
    expect(translations.en.customerOrdersDesc).toContain('{city}');
    expect(translations.en.customerOrdersDesc).toContain('{radius}');
    expect(translations.hi.customerOrdersDesc).toContain('{city}');
    expect(translations.gu.customerOrdersDesc).toContain('{city}');
  });
});
