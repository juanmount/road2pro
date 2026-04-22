const https = require('https');

const url = 'https://api.open-meteo.com/v1/forecast?latitude=-41.15&longitude=-71.4&current=temperature_2m&hourly=temperature_2m,freezinglevel_height&forecast_days=1&timezone=auto';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    
    // NEW LOGIC: Match by hour, not exact timestamp
    const currentTime = new Date(json.current.time);
    const currentHour = currentTime.getHours();
    const currentDate = currentTime.toISOString().split('T')[0];
    
    let startIndex = json.hourly.time.findIndex((t) => {
      const hourTime = new Date(t);
      return hourTime.toISOString().split('T')[0] === currentDate && 
             hourTime.getHours() === currentHour;
    });
    
    if (startIndex === -1) {
      const now = currentTime.getTime();
      for (let i = 0; i < json.hourly.time.length; i++) {
        if (new Date(json.hourly.time[i]).getTime() >= now) {
          startIndex = i;
          break;
        }
      }
    }
    
    if (startIndex === -1) startIndex = 0;
    
    const hourlyTemp = json.hourly.temperature_2m[startIndex];
    const hourlyFrz = json.hourly.freezinglevel_height[startIndex];
    
    console.log('=== FIXED LOGIC TEST ===');
    console.log('Current time:', json.current.time);
    console.log('Current temp:', json.current.temperature_2m, '°C');
    console.log('Current hour:', currentHour);
    console.log('');
    console.log('Start index:', startIndex);
    console.log('Matched hourly time:', json.hourly.time[startIndex]);
    console.log('Matched hourly temp:', hourlyTemp, '°C');
    console.log('Matched hourly FRZ:', hourlyFrz, 'm');
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
    console.log('✓ Should now show ~' + (Math.round(finalTemp * 10) / 10) + '°C in app');
  });
});
