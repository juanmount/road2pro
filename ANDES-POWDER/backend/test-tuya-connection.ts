import dotenv from 'dotenv';
import { tuyaWeatherService } from './src/services/tuya-weather-service';

// Load Tuya credentials
dotenv.config({ path: '.env.tuya' });

async function testTuyaConnection() {
  console.log('=== TUYA WEATHER STATION CONNECTION TEST ===\n');
  
  console.log('Configuration:');
  console.log('- Access ID:', process.env.TUYA_ACCESS_ID);
  console.log('- Device ID:', process.env.TUYA_DEVICE_ID);
  console.log('- Data Center:', process.env.TUYA_DATA_CENTER);
  console.log('\n');

  try {
    console.log('Testing connection...');
    const connected = await tuyaWeatherService.testConnection();
    
    if (connected) {
      console.log('\n✅ Connection successful!\n');
      
      console.log('Fetching current weather data...');
      const weather = await tuyaWeatherService.getCurrentWeather();
      
      console.log('\n📊 Current Weather Data:');
      console.log('========================');
      console.log(`Temperature: ${weather.temperature}°C`);
      console.log(`Humidity: ${weather.humidity}%`);
      if (weather.pressure) console.log(`Pressure: ${weather.pressure} hPa`);
      if (weather.wind_speed) console.log(`Wind Speed: ${weather.wind_speed} km/h`);
      if (weather.wind_direction) console.log(`Wind Direction: ${weather.wind_direction}°`);
      if (weather.precipitation) console.log(`Precipitation: ${weather.precipitation} mm`);
      console.log(`Timestamp: ${weather.timestamp}`);
      console.log(`Source: ${weather.source}`);
      console.log('========================\n');
      
      console.log('✅ Test completed successfully!');
    } else {
      console.log('\n❌ Connection failed');
    }
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  }
}

testTuyaConnection();
