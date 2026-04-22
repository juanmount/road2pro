# Firebase Setup for Andes Powder

This guide shows how to set up Firebase Authentication for user management.

## Why Firebase Auth + PostgreSQL?

- **Firebase Auth**: Easy user authentication (email/password, Google, Apple)
- **PostgreSQL**: Store user profiles, favorites, notification preferences, forecast data

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name: `Andes Powder`
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable sign-in methods:
   - ✓ **Email/Password** (enable)
   - ✓ **Google** (optional, for future)
   - ✓ **Apple** (required for App Store)

## Step 3: Register iOS App

1. In Firebase Console, click the iOS icon
2. iOS bundle ID: `com.andespowder.app` (must match app.json)
3. Download `GoogleService-Info.plist`
4. Save it to: `mobile/GoogleService-Info.plist`

## Step 4: Get Firebase Config for Backend

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Go to **Service accounts** tab
3. Click "Generate new private key"
4. Save the JSON file as `backend/firebase-service-account.json`
5. **IMPORTANT**: Add to `.gitignore` (already done)

## Step 5: Install Dependencies

### Backend
```bash
cd backend
npm install firebase-admin
```

### Mobile
```bash
cd mobile
npm install firebase @react-native-firebase/app @react-native-firebase/auth
```

## Step 6: Configure Environment Variables

Add to `backend/.env`:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Or use the service account file path:
```
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

## Security Rules

Firebase Auth tokens will be verified by the backend before accessing user-specific endpoints.

## User Flow

1. User opens app
2. If not logged in → Show login/signup screen
3. User signs up with email/password
4. Firebase creates auth user
5. Backend creates user profile in PostgreSQL
6. User can now:
   - Mark favorite resorts
   - Set notification preferences
   - Save custom alerts
   - Track visit history

## Next Steps

After Firebase is configured:
1. Run the setup script to add auth tables
2. Test login/signup flow
3. Add user-specific features
