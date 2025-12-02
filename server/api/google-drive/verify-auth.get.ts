import { google } from 'googleapis';

/**
 * GET /api/google-drive/verify-auth
 * Verify Google authentication by making a test request to Google Drive API
 * Returns 401 if authentication has expired or is invalid
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const accessToken = getCookie(event, 'google_access_token');
  const refreshToken = getCookie(event, 'google_refresh_token');

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'GOOGLE_AUTH_EXPIRED',
      message: 'Not authenticated with Google'
    });
  }

  try {
    // Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      `${config.public.appUrl}/api/auth/google/callback`
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    // Handle token refresh - update cookies with new tokens
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        setCookie(event, 'google_access_token', tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7
        });
      }
      if (tokens.refresh_token) {
        setCookie(event, 'google_refresh_token', tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30
        });
      }
    });

    // Make a test request to Google Drive API to verify authentication
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Simple test request - just get info about user's Drive
    await drive.about.get({ fields: 'user' });

    return {
      authenticated: true,
      valid: true
    };
  } catch (error) {
    const err = error as { code?: number; message?: string };

    // Check for invalid_grant error (refresh token expired or revoked)
    if (err.message?.includes('invalid_grant')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'GOOGLE_AUTH_EXPIRED',
        message: 'Google authentication has expired or been revoked. Please reconnect your account.'
      });
    }

    // If we get 401 or 403, authentication is invalid/expired
    if (err.code === 401 || err.code === 403) {
      throw createError({
        statusCode: 401,
        statusMessage: 'GOOGLE_AUTH_EXPIRED',
        message: 'Google authentication has expired or is invalid'
      });
    }

    // Other errors
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to verify Google authentication'
    });
  }
});
