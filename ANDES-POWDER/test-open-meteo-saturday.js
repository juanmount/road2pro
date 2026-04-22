// Script para investigar pronóstico del sábado 18 abril 2026
// Compara diferentes modelos de Open-Meteo

const fetch = require('node-fetch');

// Coordenadas Cerro Catedral
const lat = -41.15;
const lon = -71.40;

async function testOpenMeteo() {
  console.log('='.repeat(80));
  console.log('INVESTIGACIÓN: Pronóstico Sábado 18 Abril 2026 - Cerro Catedral');
  console.log('='.repeat(80));
  console.log('');

  // Test 1: Modelo por defecto (ICON)
  console.log('📊 TEST 1: Modelo por defecto (ICON)');
  console.log('-'.repeat(80));
  const url1 = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall,windspeed_10m,winddirection_10m,relativehumidity_2m,freezinglevel_height&forecast_days=7&timezone=auto`;
  
  try {
    const res1 = await fetch(url1);
    const data1 = await res1.json();
    
    // Buscar sábado 18 abril
    const saturdayData = data1.hourly.time
      .map((time, idx) => ({
        time,
        temp: data1.hourly.temperature_2m[idx],
        precip: data1.hourly.precipitation[idx],
        snow: data1.hourly.snowfall[idx],
        wind: data1.hourly.windspeed_10m[idx],
        windDir: data1.hourly.winddirection_10m[idx],
        humidity: data1.hourly.relativehumidity_2m[idx],
        frz: data1.hourly.freezinglevel_height[idx]
      }))
      .filter(h => h.time.startsWith('2026-04-18'));
    
    console.log(`Horas encontradas para sábado: ${saturdayData.length}`);
    console.log('');
    console.log('Resumen del día:');
    const totalPrecip = saturdayData.reduce((sum, h) => sum + (h.precip || 0), 0);
    const totalSnow = saturdayData.reduce((sum, h) => sum + (h.snow || 0), 0);
    const avgWind = saturdayData.reduce((sum, h) => sum + h.wind, 0) / saturdayData.length;
    const avgWindDir = saturdayData.reduce((sum, h) => sum + h.windDir, 0) / saturdayData.length;
    const avgHumidity = saturdayData.reduce((sum, h) => sum + h.humidity, 0) / saturdayData.length;
    
    console.log(`  Precipitación total: ${totalPrecip.toFixed(1)} mm`);
    console.log(`  Nieve total: ${totalSnow.toFixed(1)} cm`);
    console.log(`  Viento promedio: ${avgWind.toFixed(1)} km/h`);
    console.log(`  Dirección viento: ${avgWindDir.toFixed(0)}° (${getWindDirection(avgWindDir)})`);
    console.log(`  Humedad promedio: ${avgHumidity.toFixed(0)}%`);
    console.log('');
    
    // Mostrar primeras 6 horas
    console.log('Primeras 6 horas del sábado:');
    saturdayData.slice(0, 6).forEach(h => {
      console.log(`  ${h.time.split('T')[1]} → Temp: ${h.temp}°C, Precip: ${h.precip}mm, Snow: ${h.snow}cm, Wind: ${h.wind}km/h ${getWindDirection(h.windDir)}, Humidity: ${h.humidity}%`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('');
  console.log('='.repeat(80));
  
  // Test 2: Con best_match
  console.log('📊 TEST 2: Con best_match (GFS + ECMWF + ICON)');
  console.log('-'.repeat(80));
  const url2 = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall,windspeed_10m,winddirection_10m,relativehumidity_2m,freezinglevel_height&forecast_days=7&timezone=auto&models=best_match`;
  
  try {
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    
    const saturdayData2 = data2.hourly.time
      .map((time, idx) => ({
        time,
        temp: data2.hourly.temperature_2m[idx],
        precip: data2.hourly.precipitation[idx],
        snow: data2.hourly.snowfall[idx],
        wind: data2.hourly.windspeed_10m[idx],
        windDir: data2.hourly.winddirection_10m[idx],
        humidity: data2.hourly.relativehumidity_2m[idx],
        frz: data2.hourly.freezinglevel_height[idx]
      }))
      .filter(h => h.time.startsWith('2026-04-18'));
    
    console.log(`Horas encontradas para sábado: ${saturdayData2.length}`);
    console.log('');
    console.log('Resumen del día:');
    const totalPrecip2 = saturdayData2.reduce((sum, h) => sum + (h.precip || 0), 0);
    const totalSnow2 = saturdayData2.reduce((sum, h) => sum + (h.snow || 0), 0);
    const avgWind2 = saturdayData2.reduce((sum, h) => sum + h.wind, 0) / saturdayData2.length;
    const avgWindDir2 = saturdayData2.reduce((sum, h) => sum + h.windDir, 0) / saturdayData2.length;
    const avgHumidity2 = saturdayData2.reduce((sum, h) => sum + h.humidity, 0) / saturdayData2.length;
    
    console.log(`  Precipitación total: ${totalPrecip2.toFixed(1)} mm`);
    console.log(`  Nieve total: ${totalSnow2.toFixed(1)} cm`);
    console.log(`  Viento promedio: ${avgWind2.toFixed(1)} km/h`);
    console.log(`  Dirección viento: ${avgWindDir2.toFixed(0)}° (${getWindDirection(avgWindDir2)})`);
    console.log(`  Humedad promedio: ${avgHumidity2.toFixed(0)}%`);
    console.log('');
    
    // Mostrar primeras 6 horas
    console.log('Primeras 6 horas del sábado:');
    saturdayData2.slice(0, 6).forEach(h => {
      console.log(`  ${h.time.split('T')[1]} → Temp: ${h.temp}°C, Precip: ${h.precip}mm, Snow: ${h.snow}cm, Wind: ${h.wind}km/h ${getWindDirection(h.windDir)}, Humidity: ${h.humidity}%`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('💡 ANÁLISIS:');
  console.log('');
  console.log('Si ambos modelos muestran 0mm/0cm:');
  console.log('  → Open-Meteo no detecta la tormenta');
  console.log('  → Snow-Forecast usa otros modelos (probablemente GFS directo o ECMWF)');
  console.log('  → Necesitamos agregar fuentes adicionales');
  console.log('');
  console.log('Si viento es del Este (<90° o >270°):');
  console.log('  → Tormenta bloqueada (rain shadow)');
  console.log('  → Storm Crossing Score correcto al detectar condiciones pero no precipitación');
  console.log('');
  console.log('Si viento es del Oeste (240-330°):');
  console.log('  → Tormenta debería cruzar');
  console.log('  → Open-Meteo está fallando en detectar precipitación');
  console.log('');
}

function getWindDirection(degrees) {
  if (degrees >= 337.5 || degrees < 22.5) return 'N';
  if (degrees >= 22.5 && degrees < 67.5) return 'NE';
  if (degrees >= 67.5 && degrees < 112.5) return 'E';
  if (degrees >= 112.5 && degrees < 157.5) return 'SE';
  if (degrees >= 157.5 && degrees < 202.5) return 'S';
  if (degrees >= 202.5 && degrees < 247.5) return 'SW';
  if (degrees >= 247.5 && degrees < 292.5) return 'W';
  if (degrees >= 292.5 && degrees < 337.5) return 'NW';
  return '?';
}

testOpenMeteo();
