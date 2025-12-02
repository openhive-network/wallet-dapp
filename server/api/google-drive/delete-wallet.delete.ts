import { google } from 'googleapis';

/**
 * DELETE /api/google-drive/delete-wallet
 * Delete the encrypted wallet file from Google Drive
 * Requires Google authentication
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

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Search for the wallet file
    const response = await drive.files.list({
      q: 'name=\'hivebridge_wallet.json\' and trashed=false',
      fields: 'files(id, name)',
      spaces: 'appDataFolder'
    });

    const files = response.data.files;

    if (!files || files.length === 0) {
      return {
        success: true,
        message: 'No wallet file found to delete'
      };
    }

    // Delete the file
    const fileId = files[0].id;
    if (fileId) {
      await drive.files.delete({
        fileId
      });
    }

    return {
      success: true,
      message: 'Wallet file deleted successfully'
    };
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };

    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to delete wallet file'
    });
  }
});
