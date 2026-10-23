const { OAuth2Client } = require('google-auth-library');

class GoogleAuthService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '238782717135-jbafl6ffcgdhpcc33nj3tmtqr538paqr.apps.googleusercontent.com';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.client = new OAuth2Client(this.clientId, this.clientSecret);
  }

  getClientId() {
    return this.clientId;
  }

  async verifyGoogleToken({ credential, idToken, accessToken }) {
    const token = credential || idToken;

    if (token) {
      // 1. Verify ID Token using official google-auth-library
      try {
        const ticket = await this.client.verifyIdToken({
          idToken: token,
          audience: this.clientId,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new Error('Google ID token did not contain a valid email address');
        }
        return {
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture || null,
          googleId: payload.sub,
          emailVerified: Boolean(payload.email_verified)
        };
      } catch (err) {
        // Fallback: check tokeninfo endpoint in case of clock skew or cert fetch issues
        try {
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.email) {
              return {
                email: data.email.toLowerCase(),
                name: data.name || data.email.split('@')[0],
                picture: data.picture || null,
                googleId: data.sub,
                emailVerified: data.email_verified === 'true' || data.email_verified === true
              };
            }
          }
        } catch (_) {}
        throw new Error(`Google token verification failed: ${err.message}`);
      }
    }

    if (accessToken) {
      // 2. Verify Access Token via Google OAuth2 userinfo endpoint
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user profile from Google with access token');
      }
      const data = await res.json();
      if (!data || !data.email) {
        throw new Error('Google userinfo response did not contain an email');
      }
      return {
        email: data.email.toLowerCase(),
        name: data.name || data.email.split('@')[0],
        picture: data.picture || null,
        googleId: data.sub,
        emailVerified: Boolean(data.email_verified)
      };
    }

    throw new Error('No Google credentials provided (credential, idToken, or accessToken required)');
  }
}

module.exports = new GoogleAuthService();
