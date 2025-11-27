# @hiveio/wallet-dapp

A Nuxt-based wallet dApp for Hive blockchain with MetaMask Snap integration and Google Wallet/Drive support.

## Overview

This application provides a modern web interface for managing Hive blockchain wallets with multiple authentication methods.

## Prerequisites

- **Node.js**: `^20.18.1` or `>= 21.2`
- **pnpm**: `10.0.0` or higher
- **MetaMask**: [MetaMask](https://metamask.io/download) or [MetaMask Flask](https://docs.metamask.io/snaps/get-started/install-flask/) for development

## Setup

### 1. Clone the Repository

```bash
git clone https://gitlab.syncad.com/hive/wallet-dapp.git
cd wallet-dapp
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and configure the required variables (see [Google Integration Setup](#google-integration-setup) for details).

```bash
cp .env.example .env
```

### 4. Start Development Server

```bash
pnpm start
# or
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Development Notes

> **MetaMask Snap Logs**: To view MetaMask Snap logs in Chrome, navigate to [chrome://extensions](chrome://extensions), find "MetaMask Flask DEVELOPMENT BUILD", click Details, and inspect the `offscreen.html` console.

> **MetaMask Flask**: When developing a new version of the Snap (not yet accepted), use [MetaMask Flask](https://docs.metamask.io/snaps/get-started/install-flask/). **Remember to disable standard MetaMask before testing.**


## Google Integration Setup

To enable Google Wallet and Google Drive integration, you need to configure a Google Cloud Project and the Google Pay & Wallet Console.

### 1. Google Cloud Console Configuration

1.  **Create a Project**: Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2.  **Enable APIs**:
    *   Navigate to **APIs & Services > Library**.
    *   Search for and enable **Google Wallet API**.
    *   Search for and enable **Google Drive API**.
3.  **Configure OAuth Consent Screen**:
    *   Go to **APIs & Services > OAuth consent screen**.
    *   Select **External** (or Internal if you are in a Google Workspace organization).
    *   Fill in the required application details.
    *   Add the following scopes:
        *   `https://www.googleapis.com/auth/drive.appdata`
        *   `https://www.googleapis.com/auth/userinfo.profile`
        *   `https://www.googleapis.com/auth/userinfo.email`
    *   Add test users if your app is in "Testing" mode.
4.  **Create OAuth Credentials**:
    *   Go to **APIs & Services > Credentials**.
    *   Click **Create Credentials > OAuth client ID**.
    *   Application type: **Web application**.
    *   **Authorized redirect URIs**: Add your callback URL. For local development, this is usually:
        `http://localhost:3000/api/auth/google/callback`
        (Adjust the port if you are not running on 3000).
    *   Note down the **Client ID** and **Client Secret**.
5.  **Create Service Account (for Wallet)**:
    *   Go to **APIs & Services > Credentials**.
    *   Click **Create Credentials > Service account**.
    *   Name it (e.g., "wallet-issuer").
    *   Grant it the **Owner** or **Editor** role (or a specific role if you know exactly what is needed, but for Wallet API, basic access is often sufficient for the service account itself, as permissions are handled in the Pay Console).
    *   After creation, click on the service account email, go to the **Keys** tab.
    *   Click **Add Key > Create new key > JSON**.
    *   Save the downloaded JSON file. You will need the contents of this file for `NUXT_GOOGLE_APPLICATION_CREDENTIALS_JSON`.

### 2. Google Pay & Wallet Console Configuration

1.  Go to [Google Pay & Wallet Console](https://pay.google.com/business/console).
2.  Create a business profile if you don't have one.
3.  Request access to the **Google Wallet API**.
4.  **Create an Issuer Account**:
    *   Once access is granted, create an Issuer Account.
    *   Note down your **Issuer ID**.
5.  **Link Service Account**:
    *   In the Google Pay & Wallet Console, go to **Users**.
    *   Click **Invite a user**.
    *   Enter the **email address of the Service Account** you created in the Google Cloud Console (e.g., `wallet-issuer@your-project.iam.gserviceaccount.com`).
    *   Grant it **Developer** or **Admin** access. This is crucial for the API to work.

### 3. Environment Variables Configuration

Create a `.env` file in the root directory (copy from `.env.example`) and configure the following variables:

```ini
# Google Drive Integration (OAuth)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
# API Key is optional for some flows but good to have if using client-side libraries
GOOGLE_API_KEY=your-api-key
GOOGLE_DRIVE_STORAGE_FILE=profile_data.json

# Google Wallet Integration
# Your Issuer ID from Google Pay & Wallet Console
NUXT_GOOGLE_WALLET_ISSUER_ID=1234567890

# Service Account Credentials for Wallet API
# You can paste the entire JSON content here as a single line string.
# The application will automatically parse it.
NUXT_GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", "project_id": "...", ...}'
```

**Note on `NUXT_GOOGLE_APPLICATION_CREDENTIALS_JSON`**:
This variable expects the content of the Service Account JSON key file.
- You can paste the raw JSON string (ensure it is properly escaped if needed, though single quotes usually work for shells).
- Alternatively, in a production environment (like Vercel or Docker), you can set this variable to the JSON string value.

### 4. Application Configuration

Ensure your `nuxt.config.ts` or runtime environment has the correct `NUXT_PUBLIC_APP_URL` set, as this is used for OAuth redirects.

```ini
NUXT_PUBLIC_APP_URL=http://localhost:3000
```
