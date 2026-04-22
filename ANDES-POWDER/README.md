# Andes Powder Forecast

Snow intelligence app for Argentine ski resorts.

## Project Overview

Andes Powder helps skiers understand when the best ski conditions will happen during the day at Argentine ski resorts. Not a generic weather app - focused on credible, practical snow intelligence.

### Target Resorts (MVP)
- Cerro Catedral (Bariloche)
- Cerro Chapelco
- Cerro Castor
- Las Leñas

### Core Features
- Powder Score (0-10)
- Best ski window of the day
- Snowfall by elevation (Base, Mid, Summit)
- Snow line tracking
- Overnight freeze quality
- Wind impact analysis
- Mountain zone recommendations
- Hourly, daily, and 15-day forecasts

## Architecture

### Frontend
- **Platform**: iPhone (React Native + Expo)
- **Navigation**: Expo Router
- **Language**: TypeScript
- **State**: Lightweight context-based

### Backend
- **Runtime**: Node.js + TypeScript
- **Database**: PostgreSQL
- **API**: REST
- **Cron**: Forecast fetching every 3 hours
- **Data Source**: Open-Meteo API

### Key Design Principle
Weather data is fetched and processed server-side every 3 hours. iPhone app only reads processed forecast data - no per-user API calls.

## Project Structure

```
andes-powder/
├── mobile/           # Expo React Native app
├── backend/          # Node.js API + forecast service
└── README.md
```

## Getting Started

### Backend
```bash
cd backend
npm install
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

## Data Flow

1. **Backend Cron** (every 3 hours)
   - Fetch Open-Meteo forecast for all resorts
   - Calculate Powder Score
   - Determine best ski windows
   - Analyze snow line, freeze, wind
   - Store processed data in PostgreSQL

2. **iPhone App**
   - Fetch processed forecast from backend API
   - Display ski-focused interpretations
   - Show hourly/daily/extended views
   - Provide elevation-specific conditions

## Local Mountain Intelligence

The app is designed to eventually understand mountains like a local guide:
- Sun exposure by slope orientation
- Wind effects on upper lifts
- Freeze overnight + sun timing patterns
- Snow quality transitions (hard/heavy)
- Time-of-day zone recommendations

Starting with Cerro Catedral as the reference case.
