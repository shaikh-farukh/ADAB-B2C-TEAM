const googleAuthService = require('../../src/services/googleAuthService');

describe('GoogleAuthService', () => {
  it('should have client ID configured', () => {
    const clientId = googleAuthService.getClientId();
    expect(clientId).toBeDefined();
    expect(clientId).toContain('238782717135');
  });

  it('should throw error when no credentials provided', async () => {
    await expect(googleAuthService.verifyGoogleToken({})).rejects.toThrow(
      'No Google credentials provided'
    );
  });

  it('should reject invalid or malformed idToken gracefully', async () => {
    await expect(
      googleAuthService.verifyGoogleToken({ idToken: 'invalid_malformed_token_123' })
    ).rejects.toThrow();
  });
});
