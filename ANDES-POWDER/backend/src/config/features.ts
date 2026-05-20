export const FEATURES = {
  USE_FORECAST_HISTORY: process.env.USE_FORECAST_HISTORY === 'true',
  USE_T850: process.env.USE_T850 === 'true',
};

export function logFeatureFlags() {
  console.log('[Features] Feature flags status:');
  console.log(`  - USE_FORECAST_HISTORY: ${FEATURES.USE_FORECAST_HISTORY}`);
  console.log(`  - USE_T850: ${FEATURES.USE_T850}`);
}
