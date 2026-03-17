# Andes Powder Mobile

iPhone app for Argentine ski resort snow intelligence.

## Features

- Real-time snow conditions for 4 Argentine resorts
- Powder Score (0-10) for ski quality
- Best ski window recommendations
- Hourly forecast (48 hours)
- Daily forecast (15 days)
- Elevation-specific data (Base, Mid, Summit)
- Clean, skier-focused UI

## Setup

### Prerequisites

- Node.js 18+
- iOS Simulator (Xcode) or physical iPhone
- Expo CLI

### Installation

```bash
npm install
```

### Running

**Start Expo:**
```bash
npm start
```

**iOS Simulator:**
```bash
npm run ios
```

**Physical iPhone:**
1. Install Expo Go app from App Store
2. Scan QR code from terminal

## Configuration

### Backend API

Edit `config/api.ts` to point to your backend:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development
  : 'https://your-api.com/api';   // Production
```

For iOS Simulator, use `localhost`.
For physical iPhone on same network, use your computer's local IP (e.g., `http://192.168.1.100:3000/api`).

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home / Resort list
│   └── resort/
│       ├── [id].tsx       # Resort detail
│       ├── [id]/
│       │   ├── hourly.tsx # Hourly forecast
│       │   └── daily.tsx  # Daily forecast
├── config/
│   └── api.ts             # API configuration
├── services/
│   └── resorts.ts         # API service layer
├── types/
│   └── index.ts           # TypeScript types
├── utils/
│   └── powder-score.ts    # UI utilities
└── package.json
```

## Screens

### Home (index.tsx)
- Lists all 4 resorts
- Quick powder score preview
- Tap to view resort detail

### Resort Detail ([id].tsx)
- Current powder score
- Best ski window
- Elevation selector (Base/Mid/Summit)
- Current conditions by elevation
- Navigate to hourly/daily forecasts

### Hourly Forecast ([id]/hourly.tsx)
- 48-hour forecast
- Grouped by date
- Temperature, snow, wind
- Powder score per hour
- Elevation selector

### Daily Forecast ([id]/daily.tsx)
- 15-day extended forecast
- Daily powder scores
- Temperature ranges
- Snowfall totals
- Best windows
- Freeze quality
- Conditions summaries

## Design System

### Colors

```typescript
Primary: '#1a365d'      // Deep blue
Accent: '#63b3ed'       // Powder blue
Background: '#f7fafc'   // Light gray
Success: '#48bb78'      // Green (high scores)
Warning: '#ed8936'      // Orange (medium scores)
Neutral: '#cbd5e0'      // Gray (low scores)
```

### Typography

- **Headers**: 28px, bold
- **Titles**: 20px, semibold
- **Body**: 16px, regular
- **Details**: 14px, regular
- **Small**: 12px, regular

### Powder Score Colors

- 8.0+: Green (#48bb78) - Excellent
- 6.0-7.9: Blue (#63b3ed) - Good
- 4.0-5.9: Orange (#ed8936) - Fair
- <4.0: Gray (#cbd5e0) - Poor

## API Integration

All API calls go through `services/resorts.ts`:

```typescript
// Get all resorts
const resorts = await resortsService.getAll();

// Get current conditions
const conditions = await resortsService.getCurrentConditions('cerro-catedral');

// Get hourly forecast
const hourly = await resortsService.getHourlyForecast('cerro-catedral', 'mid', 48);

// Get daily forecast
const daily = await resortsService.getDailyForecast('cerro-catedral', 'mid', 15);
```

## Building for Production

### iOS

1. Configure app.json with your bundle identifier
2. Build with EAS:

```bash
npm install -g eas-cli
eas build --platform ios
```

3. Submit to App Store:

```bash
eas submit --platform ios
```

### TestFlight

```bash
eas build --platform ios --profile preview
```

## Development Tips

- Use iOS Simulator for fast iteration
- Hot reload works automatically
- Check console for API errors
- Backend must be running for data to load

## Troubleshooting

**Can't connect to backend:**
- Check API_BASE_URL in config/api.ts
- Ensure backend is running on correct port
- For physical device, use local IP not localhost

**No data showing:**
- Check backend has forecast data (run cron job)
- Check network inspector in Expo DevTools
- Verify database has resort data

**TypeScript errors:**
- Run `npm install` to ensure all types are installed
- Check tsconfig.json extends expo/tsconfig.base
