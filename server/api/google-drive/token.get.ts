import { google } from 'googleapis';

/**
 * GET /api/google-drive/token
 * Get fresh Google access token for Google Drive operations
 * This endpoint handles token refresh automatically
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const accessToken = getCookie(event, 'google_access_token');
  const refreshToken = getCookie(event, 'google_refresh_token');

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated with Google'
    });
  }

  try {
    // Setup OAuth2 client with token refresh capability
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

    // This will trigger token refresh if needed
    const currentToken = oauth2Client.credentials.access_token;

    if (!currentToken) {
      throw createError({
        statusCode: 401,
        message: 'Failed to get valid access token'
      });
    }

    return {
      success: true,
      token: currentToken
    };
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to get access token'
    });
  }
});
