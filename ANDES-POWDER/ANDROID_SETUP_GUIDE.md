# Android Build Setup Guide - Andes Powder

## ✅ Completed Steps

### 1. Configuration Files
- ✅ Created `mobile/eas.json` with build profiles (development/preview/production)
- ✅ Updated `mobile/app.json` with Android permissions
- ✅ Generated real app icons and splash screens using sharp

### 2. Android Permissions Configured
- `ACCESS_FINE_LOCATION` - For geolocation features
- `ACCESS_COARSE_LOCATION` - For approximate location
- `INTERNET` - For API calls
- `VIBRATE` - For notification feedback
- `RECEIVE_BOOT_COMPLETED` - For notification scheduling
- `SCHEDULE_EXACT_ALARM` - For precise notifications

### 3. Assets Generated
- `icon.png` (1024x1024) - App icon
- `adaptive-icon.png` (1024x1024) - Android adaptive icon
- `splash.png` (1284x2778) - Splash screen
- `favicon.png` (48x48) - Web favicon

All generated from `Logo_horizontal.png` with background color #1a365d

---

## 📋 Next Steps

### Option A: Local Development Build (Recommended for Testing)

```bash
cd mobile
npm run android
```

This will:
- Install dependencies
- Build the APK locally
- Install on connected Android device/emulator
- Enable fast iteration with hot reload

**Requirements:**
- Android Studio installed
- Android SDK configured
- USB debugging enabled on device
- OR Android Emulator running

---

### Option B: EAS Preview Build (For Distribution)

```bash
cd mobile
eas build --platform android --profile preview
```

This will:
- Build APK on Expo servers
- Generate download link
- Can be installed on any Android device
- Takes ~10-20 minutes

**Requirements:**
- Expo account configured
- EAS CLI installed (✅ already installed)

---

### Option C: EAS Production Build (For Play Store)

```bash
cd mobile
eas build --platform android --profile production
```

This will:
- Build AAB (Android App Bundle) for Play Store
- Optimized for distribution
- Takes ~10-20 minutes

**Requirements:**
- Google Play Console account
- Service account key configured
- App created in Play Console

---

## 🔧 Google Play Console Setup (For Production)

### 1. Create Google Play Developer Account
- Cost: $25 one-time fee
- Link: https://play.google.com/console
- Takes 1-2 days for approval

### 2. Create App in Play Console
- App name: "Andes Powder"
- Package name: `com.andespowder.app`
- Category: Weather / Sports
- Content rating: Everyone

### 3. Generate Service Account Key
```bash
# Create service account in Google Cloud Console
# Download JSON key file
# Save as: mobile/google-service-account.json
```

### 4. Update eas.json
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

## 📱 Testing Checklist

### Before Production Build
- [ ] Test on physical Android device
- [ ] Test on different screen sizes
- [ ] Test on Android 10, 11, 12, 13, 14
- [ ] Verify notifications work
- [ ] Verify location permissions
- [ ] Test IAP (In-App Purchases)
- [ ] Verify Firebase Auth
- [ ] Test all screens and navigation

### Performance Testing
- [ ] Check app startup time
- [ ] Verify memory usage
- [ ] Test on low-end devices
- [ ] Check battery usage

---

## 🚀 Quick Start Commands

### Development Mode (Hot Reload)
```bash
cd mobile
npm start
# Press 'a' to open in Android emulator
```

### Local Build
```bash
cd mobile
npm run android
```

### EAS Preview Build
```bash
cd mobile
eas build --platform android --profile preview
```

### EAS Production Build
```bash
cd mobile
eas build --platform android --profile production
```

---

## 🔑 Important Notes

### Google Maps API Key
The app.json has a placeholder for Google Maps API key:
```json
"googleMaps": {
  "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
}
```

If using Google Maps features, replace with actual API key from Google Cloud Console.

### IAP Configuration
The app uses `react-native-iap` for In-App Purchases:
- Product ID: `com.andespowder.founder_season1`
- Configure in Google Play Console
- Test with License Testing account

### Firebase Configuration
Ensure Firebase Android configuration is set up:
- `google-services.json` should be in `mobile/`
- Download from Firebase Console
- Android package: `com.andespowder.app`

---

## 📞 Troubleshooting

### Build Failures
```bash
# Clear cache
eas build --platform android --profile preview --clear-cache
```

### Dependency Issues
```bash
cd mobile
rm -rf node_modules
npm install
```

### Android Studio Issues
- Ensure Android SDK is updated
- Check JAVA_HOME environment variable
- Verify ANDROID_HOME is set

---

## 🎯 Recommended Next Steps

1. **Test Locally First**
   ```bash
   npm run android
   ```
   - Connect Android device via USB
   - Enable USB debugging
   - Build and test on device

2. **EAS Preview Build**
   ```bash
   eas build --platform android --profile preview
   ```
   - Get APK for distribution
   - Test on multiple devices
   - Share with beta testers

3. **Play Store Setup**
   - Create Google Play Developer account
   - Create app in Play Console
   - Configure service account
   - Prepare store listing

4. **Production Build**
   ```bash
   eas build --platform android --profile production
   ```
   - Generate AAB for Play Store
   - Submit to internal testing
   - Review and publish

---

## 📄 Store Listing Requirements

### Screenshots Needed
- At least 2 screenshots
- Phone or tablet size
- 16:9 or 4:3 aspect ratio
- PNG or JPEG format
- Max 8MB per screenshot

### Description
- Short description (80 chars max)
- Full description (4000 chars max)

### Graphics
- Feature graphic (1024x500)
- High-res icon (512x512)
- Promo video (optional)

### Privacy Policy URL
- Required for apps collecting personal data
- Can use free privacy policy generators

---

## 🔐 Security Considerations

### API Keys
- Never commit API keys to git
- Use environment variables for sensitive data
- Restrict API keys to specific domains

### Code Signing
- EAS handles code signing automatically
- No need to manage keystore manually
- Keys stored securely in Expo

### Data Collection
- App uses Firebase for authentication
- Location data for weather features
- Ensure privacy policy reflects this
