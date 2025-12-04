import { google } from 'googleapis';

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);

  const code = query.code as string;
  const error = query.error as string;
  const returnUrl = (query.state as string) || '/';

  if (error)
    return sendRedirect(event, `${config.public.appUrl}${returnUrl}?error=${encodeURIComponent(error)}`);


  if (!code)
    return sendRedirect(event, `${config.public.appUrl}${returnUrl}?error=no_code`);


  try {
    const oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      `${config.public.appUrl}/api/auth/google/callback`
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token)
      throw new Error('No access token received');


    // Set credentials
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Store tokens in httpOnly cookies
    setCookie(event, 'google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    if (tokens.refresh_token) {
      setCookie(event, 'google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    } else {
      // If no refresh token in response, check if we have an old one
      // This can happen when user re-authenticates without revoking access
      const existingRefreshToken = getCookie(event, 'google_refresh_token');
      if (!existingRefreshToken)
        console.warn('No refresh token received and no existing refresh token found');
    }

    // Store user info in a readable cookie (not sensitive)
    setCookie(event, 'google_user', JSON.stringify({
      name: userInfo.data.name,
      email: userInfo.data.email,
      picture: userInfo.data.picture
    }), {
      httpOnly: false, // Readable by client
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    // Redirect back to the page user was on
    return sendRedirect(event, `${config.public.appUrl}${returnUrl}?auth=success`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return sendRedirect(event, `${config.public.appUrl}${returnUrl}?error=auth_failed`);
  }
});
