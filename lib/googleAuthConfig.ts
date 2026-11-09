// lib/googleAuthConfig.ts
// Milestone 12 — Google Sign-In configuration.
//
// EDIT THIS FILE ONCE: replace the placeholder below with your real OAuth
// Client ID from Google Cloud Console (APIs & Services > Credentials >
// OAuth client ID > Web application). It looks like:
//   123456789-abc123xyz.apps.googleusercontent.com
//
// This value is NOT a secret — it is safe to ship in a static, client-side
// bundle (this app has output: 'export', no backend). Do NOT put a
// "Client secret" here; this app never uses one.
export const GOOGLE_CLIENT_ID = 'REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com';

// Minimal scope: the app can only see/write files IT created via Drive,
// never the teacher's whole Drive. Matches lib/googleDrive.ts's design
// comment and must match what you enabled in the OAuth consent screen.
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// URL of the Google Identity Services script, loaded once via
// app/layout.tsx's <Script> tag.
export const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';