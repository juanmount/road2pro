const axios = require('axios');

async function testOpenMeteo() {
  const params = {
    latitude: -41.15,
    longitude: -71.40,
    elevation: 1600,
    models: 'ecmwf_ifs04',
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'snowfall',
      'windspeed_10m',
      'windgusts_10m',
      'winddirection_10m',
      'relativehumidity_2m',
      'cloudcover',
      'pressure_msl',
      'freezinglevel_height'
    ].join(','),
    timezone: 'America/Argentina/Buenos_Aires',
    forecast_days: 3
  };
  
  console.log('Fetching from Open-Meteo with params:', JSON.stringify(params, null, 2));
  
  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', { params });
    
    console.log('\n=== RESPONSE STATUS ===');
    console.log('Status:', response.status);
    
    console.log('\n=== HOURLY DATA STRUCTURE ===');
    console.log('Keys:', Object.keys(response.data.hourly));
    console.log('Time array length:', response.data.hourly.time?.length);
    console.log('Temperature array length:', response.data.hourly.temperature_2m?.length);
    
    console.log('\n=== FIRST 5 HOURS ===');
    for (let i = 0; i < 5; i++) {
      console.log(`\nHour ${i}:`);
      console.log('  Time:', response.data.hourly.time[i]);
      console.log('  Temperature:', response.data.hourly.temperature_2m[i]);
      console.log('  Precipitation:', response.data.hourly.precipitation[i]);
      console.log('  Snowfall:', response.data.hourly.snowfall[i]);
      console.log('  Wind Speed:', response.data.hourly.windspeed_10m[i]);
      console.log('  Humidity:', response.data.hourly.relativehumidity_2m[i]);
      console.log('  Cloud Cover:', response.data.hourly.cloudcover[i]);
      console.log('  Freezing Level:', response.data.hourly.freezinglevel_height[i]);
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testOpenMeteo();
