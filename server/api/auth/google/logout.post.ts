import { google } from 'googleapis';

/**
 * POST /api/auth/google/logout
 * Logout from Google and clear session
 */

export default defineEventHandler(async (event) => {
  try {
    const accessToken = getCookie(event, 'google_access_token');

    // Revoke Google token if exists
    if (accessToken) {
      try {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        await oauth2Client.revokeCredentials();
      } catch (err) {
        console.error('Error revoking Google token:', err);
        // Continue with logout even if revoke fails
      }
    }

    // Clear all cookies
    deleteCookie(event, 'google_access_token');
    deleteCookie(event, 'google_refresh_token');
    deleteCookie(event, 'google_user');

    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('Logout error:', error);

    throw createError({
      statusCode: 500,
      message: 'Failed to logout'
    });
  }
});
