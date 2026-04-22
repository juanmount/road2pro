const https = require('https');

const url = 'https://api.open-meteo.com/v1/forecast?latitude=-41.15&longitude=-71.4&current=temperature_2m&hourly=temperature_2m,freezinglevel_height&forecast_days=1&timezone=auto';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    
    const currentTime = json.current.time;
    const currentTemp = json.current.temperature_2m;
    
    let startIndex = json.hourly.time.findIndex(t => t === currentTime);
    if (startIndex === -1) startIndex = 0;
    
    const hourlyTemp = json.hourly.temperature_2m[startIndex];
    const hourlyFrz = json.hourly.freezinglevel_height[startIndex];
    
    console.log('=== OPEN-METEO API TEST ===');
    console.log('Current time:', currentTime);
    console.log('Current temp:', currentTemp, '°C');
    console.log('');
    console.log('Start index:', startIndex);
    console.log('Hourly time:', json.hourly.time[startIndex]);
    console.log('Hourly temp:', hourlyTemp, '°C');
    console.log('Hourly FRZ:', hourlyFrz, 'm');
    console.log('');
    
    // Calculate for BASE (1030m)
    const elevationMeters = 1030;
    const tempAdjust = -(elevationMeters - 840) * 0.0065;
    const finalTemp = hourlyTemp + tempAdjust;
    
    console.log('=== CALCULATION FOR BASE (1030m) ===');
    console.log('Base temp (Bariloche 840m):', hourlyTemp, '°C');
    console.log('Elevation adjustment:', tempAdjust.toFixed(2), '°C');
    console.log('Final temp:', (Math.round(finalTemp * 10) / 10), '°C');
    console.log('FRZ:', Math.floor(hourlyFrz), 'm');
    console.log('');
    console.log('Expected in app: ~' + (Math.round(finalTemp * 10) / 10) + '°C');
  });
});
