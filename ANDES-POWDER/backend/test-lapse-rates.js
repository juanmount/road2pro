const https = require('https');

const BASE = 1030;
const MID = 1600;
const SUMMIT = 2100;
const BARILOCHE = 840;

const url = 'https://api.open-meteo.com/v1/forecast?latitude=-41.15&longitude=-71.4&current=temperature_2m&hourly=temperature_2m&forecast_days=1&timezone=auto';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const currentTemp = json.current.temperature_2m;
    
    console.log('=== TEMPERATURE LAPSE RATE ANALYSIS ===');
    console.log('Bariloche (840m):', currentTemp.toFixed(1), '°C\n');
    
    const rates = [
      { name: 'Dry adiabatic', rate: 0.0098 },
      { name: 'Standard (our app)', rate: 0.0065 },
      { name: 'Moist adiabatic', rate: 0.005 }
    ];
    
    rates.forEach(r => {
      const baseTemp = currentTemp - (BASE - BARILOCHE) * r.rate;
      const midTemp = currentTemp - (MID - BARILOCHE) * r.rate;
      const summitTemp = currentTemp - (SUMMIT - BARILOCHE) * r.rate;
      
      console.log(r.name + ' (-' + (r.rate * 1000).toFixed(1) + '°C/1000m):');
      console.log('  BASE   (1030m):', baseTemp.toFixed(1), '°C');
      console.log('  MID    (1600m):', midTemp.toFixed(1), '°C');
      console.log('  SUMMIT (2100m):', summitTemp.toFixed(1), '°C');
      console.log('');
    });
    
    console.log('=== SUMMIT TEMPERATURE DIFFERENCES ===');
    const drySum = currentTemp - (SUMMIT - BARILOCHE) * 0.0098;
    const stdSum = currentTemp - (SUMMIT - BARILOCHE) * 0.0065;
    const moistSum = currentTemp - (SUMMIT - BARILOCHE) * 0.005;
    
    console.log('Dry vs Standard:', (drySum - stdSum).toFixed(1), '°C colder with dry rate');
    console.log('Standard vs Moist:', (stdSum - moistSum).toFixed(1), '°C colder with standard rate');
    console.log('Dry vs Moist:', (drySum - moistSum).toFixed(1), '°C total range');
    console.log('');
    console.log('If other forecasts show 5°C warmer at SUMMIT, they may be using:');
    console.log('- Moist air lapse rate (-5°C/1000m)');
    console.log('- Different elevation reference');
    console.log('- Model-specific adjustments');
  });
});
