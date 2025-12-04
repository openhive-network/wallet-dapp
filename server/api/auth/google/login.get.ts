import { google } from 'googleapis';

/**
 * GET /api/auth/google/login
 * Initiate Google OAuth flow
 */

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const returnUrl = (query.returnUrl as string) || '/';

  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    `${config.public.appUrl}/api/auth/google/callback`
  );

  // Generate the URL to redirect to for Google OAuth
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: [
      'https://www.googleapis.com/auth/drive.appdata',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent', // Force consent screen to always get refresh token
    include_granted_scopes: true,
    state: returnUrl // Pass returnUrl through OAuth flow
  });

  return sendRedirect(event, authUrl);
});
