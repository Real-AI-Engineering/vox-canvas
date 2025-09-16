# Google Speech-to-Text API Setup Guide

## 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Note your Project ID

## 2. Enable Speech-to-Text API

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Cloud Speech-to-Text API"
3. Click on it and press "ENABLE"

## 3. Create Service Account Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "CREATE CREDENTIALS" > "Service account"
3. Fill in:
   - Service account name: `vox-canvas-stt`
   - Service account ID: (auto-generated)
   - Description: "Service account for Vox Canvas STT"
4. Click "CREATE AND CONTINUE"
5. Grant role: "Cloud Speech Client" or "Cloud Speech Editor"
6. Click "CONTINUE" then "DONE"

## 4. Download JSON Key

1. Find your new service account in the credentials list
2. Click on it
3. Go to "KEYS" tab
4. Click "ADD KEY" > "Create new key"
5. Choose "JSON" format
6. Download the JSON file - **SAVE IT SECURELY**

## 5. Configure Backend

Save the JSON file as `/Users/vi/works/instinctools/vox-canvas/backend/google-credentials.json`

Or set environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"
```

## 6. Update .env File

In `/Users/vi/works/instinctools/vox-canvas/backend/.env`:
```
STT_ENGINE=google
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

## 7. Test Connection

Restart the backend server to apply changes.

## Important Notes

- Keep the JSON credentials file secure and never commit it to git
- Add `google-credentials.json` to `.gitignore`
- The service account needs billing enabled on the Google Cloud project
- Free tier includes 60 minutes of audio processing per month