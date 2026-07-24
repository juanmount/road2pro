export const FEATURES = {
  USE_FORECAST_HISTORY: false, // Temporarily disabled - DB schema issue with forecast_time column
  USE_T850: process.env.USE_T850 !== 'false', // default ON — ECMWF always provides T850 data
};

export function logFeatureFlags() {
  console.log('[Features] Feature flags status:');
  console.log(`  - USE_FORECAST_HISTORY: ${FEATURES.USE_FORECAST_HISTORY}`);
  console.log(`  - USE_T850: ${FEATURES.USE_T850}`);
}
