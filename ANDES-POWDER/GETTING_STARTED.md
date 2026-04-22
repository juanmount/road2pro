# Getting Started with Andes Powder

Complete guide to set up and run the Andes Powder snow intelligence app.

## Overview

Andes Powder consists of two main components:
1. **Backend**: Node.js API that fetches and processes weather data
2. **Mobile**: React Native iPhone app that displays snow conditions

## Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **Xcode** (for iOS development)
- **Expo CLI** (installed automatically with npm)

## Step 1: Backend Setup

### 1.1 Install Dependencies

```bash
cd backend
npm install
```

### 1.2 Set Up PostgreSQL

Create a new database:

```bash
createdb andes_powder
```

Or using psql:

```sql
CREATE DATABASE andes_powder;
```

### 1.3 Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/andes_powder
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
FORECAST_CRON_SCHEDULE=0 */3 * * *
```

### 1.4 Run Database Migrations

```bash
npm run db:migrate
```

This creates all tables and inserts the 4 MVP resorts:
- Cerro Catedral
- Cerro Chapelco
- Cerro Castor
- Las Leñas

### 1.5 Fetch Initial Forecast Data

Before starting the API, fetch forecast data:

```bash
npm run cron:forecast
```

This will:
- Call Open-Meteo API for each resort
- Calculate powder scores
- Determine best ski windows
- Store data in PostgreSQL

**Note**: This takes 1-2 minutes to complete.

### 1.6 Start the Backend

```bash
npm run dev
```

The API will be running at `http://localhost:3000`

Test it:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/resorts
```

## Step 2: Mobile App Setup

### 2.1 Install Dependencies

Open a new terminal window:

```bash
cd mobile
npm install
```

### 2.2 Configure API Endpoint

The default configuration in `config/api.ts` should work for development:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://your-production-api.com/api';
```

**For physical iPhone on same WiFi:**
Replace `localhost` with your computer's local IP address:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.100:3000/api'  // Your computer's IP
  : 'https://your-production-api.com/api';
```

To find your local IP:
- macOS: System Settings → Network → WiFi → Details
- Or run: `ipconfig getifaddr en0`

### 2.3 Start Expo

```bash
npm start
```

This opens the Expo DevTools in your browser.

### 2.4 Run on iOS Simulator

Press `i` in the terminal, or:

```bash
npm run ios
```

This will:
- Open Xcode Simulator
- Build and install the app
- Launch the app

### 2.5 Run on Physical iPhone (Optional)

1. Install **Expo Go** from the App Store
2. Scan the QR code from the terminal
3. Ensure your iPhone is on the same WiFi network
4. Update API_BASE_URL with your computer's local IP

## Step 3: Verify Everything Works

### Backend Verification

1. Check health endpoint:
```bash
curl http://localhost:3000/health
```

2. Get resorts:
```bash
curl http://localhost:3000/api/resorts
```

3. Get current conditions for Cerro Catedral:
```bash
curl http://localhost:3000/api/resorts/cerro-catedral/forecast/current
```

### Mobile Verification

1. App should show 4 resorts on home screen
2. Tap "Cerro Catedral"
3. Should see:
   - Powder score
   - Best ski window
   - Current conditions by elevation
4. Tap "Hourly Forecast" - should see 48-hour forecast
5. Tap "Daily Forecast" - should see 15-day forecast

## Common Issues

### Backend Issues

**"Cannot connect to database"**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env
- Ensure database exists: `psql -l | grep andes_powder`

**"No forecast data available"**
- Run the cron job: `npm run cron:forecast`
- Check for errors in the output
- Verify Open-Meteo API is accessible

**"Port 3000 already in use"**
- Change PORT in .env
- Or kill the process: `lsof -ti:3000 | xargs kill`

### Mobile Issues

**"Network request failed"**
- Ensure backend is running
- Check API_BASE_URL in config/api.ts
- For physical device, use local IP not localhost
- Verify firewall isn't blocking port 3000

**"Unable to resolve module"**
- Delete node_modules and reinstall:
  ```bash
  rm -rf node_modules
  npm install
  ```

**Expo DevTools not opening**
- Manually open: http://localhost:19002
- Or use Expo Go app and scan QR code

## Next Steps

### Development Workflow

1. **Backend changes**: 
   - Edit files in `backend/src/`
   - Server auto-restarts with `tsx watch`

2. **Mobile changes**:
   - Edit files in `mobile/app/`
   - App hot-reloads automatically

3. **Database changes**:
   - Edit `backend/database/schema.sql`
   - Re-run migrations

### Scheduled Forecast Updates

In production, forecasts update every 3 hours automatically via cron.

In development, the cron is disabled. Update manually:

```bash
cd backend
npm run cron:forecast
```

Or enable cron in development by removing this check in `src/index.ts`:

```typescript
// Remove this condition to enable cron in dev
if (process.env.NODE_ENV !== 'development') {
  forecastCronService.start();
}
```

### Testing Different Resorts

The app includes 4 resorts:
- **Cerro Catedral**: Bariloche, Patagonia
- **Cerro Chapelco**: San Martín de los Andes, Patagonia
- **Cerro Castor**: Ushuaia, Tierra del Fuego
- **Las Leñas**: Mendoza

Each has different elevations and weather patterns.

### Customizing Powder Score

Edit `backend/src/services/powder-score.ts` to adjust:
- Snowfall thresholds
- Temperature ranges
- Wind impact
- Freeze quality criteria

Changes take effect on next forecast update.

## Production Deployment

See individual README files:
- `backend/README.md` - Backend deployment
- `mobile/README.md` - iOS App Store submission

## Support

For issues or questions:
1. Check the ARCHITECTURE.md for system design
2. Review API documentation in backend/README.md
3. Check mobile app guide in mobile/README.md

## Quick Reference

**Start everything:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Mobile
cd mobile
npm start
```

**Update forecasts:**
```bash
cd backend
npm run cron:forecast
```

**Reset database:**
```bash
dropdb andes_powder
createdb andes_powder
cd backend
npm run db:migrate
npm run cron:forecast
```
