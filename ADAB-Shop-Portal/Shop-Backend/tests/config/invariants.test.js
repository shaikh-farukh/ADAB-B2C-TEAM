const dns = require('dns');

describe('Critical Infrastructure Invariants', () => {
  it('must not force ipv4first unconditionally in db.js', () => {
    // If someone reverts db.js to hardcoded dns.setDefaultResultOrder('ipv4first'), this fails
    expect(dns.getDefaultResultOrder()).not.toBe('ipv4first');
  });

  it('verifies DNS_IPV4_FIRST defaults to false or undefined', () => {
    expect(['false', undefined]).toContain(process.env.DNS_IPV4_FIRST);
  });
});
