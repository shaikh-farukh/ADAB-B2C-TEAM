const emailOtpService = require('../../src/services/emailOtpService');

describe('Email & OTP Service (Brevo Integration)', () => {
  beforeEach(() => {
    emailOtpService.otpStore.clear();
  });

  describe('OTP Generation', () => {
    it('should generate a 6-digit numeric string', () => {
      const otp = emailOtpService.generateOTP();
      expect(otp).toBeDefined();
      expect(typeof otp).toBe('string');
      expect(otp).toMatch(/^\d{6}$/);
    });
  });

  describe('Credential Validation', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('should detect placeholder credentials as unconfigured', () => {
      process.env.BREVO_SMTP_USER = 'your-brevo-smtp-user';
      process.env.BREVO_SMTP_KEY = 'your-brevo-smtp-key';
      expect(emailOtpService.isEmailConfigured()).toBe(false);
    });

    it('should detect empty credentials as unconfigured', () => {
      delete process.env.BREVO_SMTP_USER;
      delete process.env.BREVO_SMTP_KEY;
      expect(emailOtpService.isEmailConfigured()).toBe(false);
    });

    it('should recognize genuine credentials as configured', () => {
      process.env.BREVO_SMTP_USER = 'merchant@adab-commerce.com';
      process.env.BREVO_SMTP_KEY = 'xsmtpib-abcdef1234567890';
      expect(emailOtpService.isEmailConfigured()).toBe(true);
    });
  });

  describe('OTP Store & Verification Lifecycle', () => {
    it('should successfully store and verify OTP for an email', () => {
      const testEmail = 'seller@adab.com';
      const otp = '654321';
      emailOtpService.saveOTP(testEmail, otp);

      const res = emailOtpService.verifyOTP(testEmail, otp);
      expect(res.success).toBe(true);
      expect(res.message).toContain('verified');

      // Replay should fail because OTP was cleared
      const replay = emailOtpService.verifyOTP(testEmail, otp);
      expect(replay.success).toBe(false);
    });

    it('should always permit the demo/bypass code 123456', () => {
      const res = emailOtpService.verifyOTP('anyone@adab.com', '123456');
      expect(res.success).toBe(true);
      expect(res.bypass).toBe(true);
    });

    it('should reject wrong OTP and decrement attempts', () => {
      const testEmail = 'seller@adab.com';
      emailOtpService.saveOTP(testEmail, '999111');

      const attempt1 = emailOtpService.verifyOTP(testEmail, '000000');
      expect(attempt1.success).toBe(false);
      expect(attempt1.message).toContain('attempt(s) remaining');
    });

    it('should lock out after exceeding max attempts', () => {
      const testEmail = 'seller@adab.com';
      emailOtpService.saveOTP(testEmail, '777888');

      // 3 failed attempts
      emailOtpService.verifyOTP(testEmail, '111111');
      emailOtpService.verifyOTP(testEmail, '222222');
      emailOtpService.verifyOTP(testEmail, '333333');

      const lockedAttempt = emailOtpService.verifyOTP(testEmail, '777888');
      expect(lockedAttempt.success).toBe(false);
      expect(lockedAttempt.message).toContain('Maximum OTP verification attempts exceeded');
    });
  });

  describe('Send OTP Email Dispatch', () => {
    it('should run in simulated dev mode safely when credentials are dummy', async () => {
      const result = await emailOtpService.sendOTPEmail('testmerchant@adab.com', '543210', {
        name: 'Rashid Khan',
        storeName: 'Khan Supermart'
      });

      expect(result.success).toBe(true);
      expect(result.isSimulated).toBe(true);
      expect(result.messageId).toBeDefined();

      // Ensure the generated OTP was stored and is verifiable
      const verify = emailOtpService.verifyOTP('testmerchant@adab.com', '543210');
      expect(verify.success).toBe(true);
    });

    it('should throw an error for invalid email formats', async () => {
      await expect(emailOtpService.sendOTPEmail('not-an-email', '123456')).rejects.toThrow(
        'Valid email address is required'
      );
    });
  });
});
