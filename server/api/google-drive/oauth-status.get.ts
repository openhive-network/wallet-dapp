/**
 * GET /api/google-drive/oauth-status
 * Check Google Drive OAuth authentication status
 * This is an alias for /api/auth/google/status
 */

export default defineEventHandler((event) => {
  const accessToken = getCookie(event, 'google_access_token');
  const userCookie = getCookie(event, 'google_user');

  if (!accessToken) {
    return {
      authenticated: false,
      user: null
    };
  }

  let user = null;
  if (userCookie) {
    try {
      user = JSON.parse(userCookie);
    }
    catch (err) {
      console.error('Error parsing user cookie:', err);
    }
  }

  return {
    authenticated: true,
    user
  };
});
