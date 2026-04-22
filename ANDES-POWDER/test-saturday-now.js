// Test para ver datos REALES del sábado 18 abril AHORA
const fetch = require('node-fetch');

const lat = -41.15;
const lon = -71.40;

async function testSaturdayNow() {
  console.log('='.repeat(80));
  console.log('TEST: Datos REALES del sábado 18 abril - AHORA (9:59am)');
  console.log('='.repeat(80));
  console.log('');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall,windspeed_10m,winddirection_10m,relativehumidity_2m,freezinglevel_height,cloudcover&forecast_days=7&timezone=auto&models=best_match`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  // Filtrar sábado 18 abril
  const saturdayData = data.hourly.time
    .map((time, idx) => ({
      time,
      baseTemp: data.hourly.temperature_2m[idx],
      precip: data.hourly.precipitation[idx],
      snow: data.hourly.snowfall[idx],
      wind: data.hourly.windspeed_10m[idx],
      humidity: data.hourly.relativehumidity_2m[idx],
      frz: data.hourly.freezinglevel_height[idx],
      cloud: data.hourly.cloudcover[idx]
    }))
    .filter(h => h.time.startsWith('2026-04-18'));

  console.log('HORAS DEL SÁBADO 18 ABRIL:');
  console.log('');
  
  saturdayData.forEach((h, idx) => {
    const hour = h.time.split('T')[1];
    
    // Calcular temp en MID (1600m)
    const lapseRate = 0.0065;
    const tempMid = h.baseTemp - (1600 - 840) * lapseRate;
    
    // Determinar phase
    let phase = 'clear';
    if (h.precip > 0.01) {
      if (tempMid <= -1) phase = 'snow';
      else if (tempMid > -1 && tempMid <= 2) phase = 'mixed';
      else phase = 'rain';
    }
    
    const icon = phase === 'snow' ? '❄️' : phase === 'rain' ? '🌧️' : phase === 'mixed' ? '🌨️' : h.cloud > 50 ? '☁️' : '☀️';
    
    console.log(`${hour} ${icon} | Base: ${h.baseTemp.toFixed(1)}°C, MID: ${tempMid.toFixed(1)}°C | Precip: ${h.precip.toFixed(3)}mm | Snow: ${h.snow.toFixed(2)}cm | Cloud: ${h.cloud}% | Phase: ${phase}`);
  });
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  
  const totalPrecip = saturdayData.reduce((sum, h) => sum + h.precip, 0);
  const totalSnow = saturdayData.reduce((sum, h) => sum + h.snow, 0);
  const hoursWithPrecip = saturdayData.filter(h => h.precip > 0.01).length;
  
  console.log('RESUMEN DEL DÍA:');
  console.log(`  Total precipitación: ${totalPrecip.toFixed(2)} mm`);
  console.log(`  Total nieve (Open-Meteo): ${totalSnow.toFixed(2)} cm`);
  console.log(`  Horas con precipitación (>0.01mm): ${hoursWithPrecip}`);
  console.log('');
  
  console.log('💡 DIAGNÓSTICO:');
  console.log('');
  if (hoursWithPrecip === 0) {
    console.log('  ❌ Open-Meteo NO detecta precipitación horaria');
    console.log('  → Puede haber precipitación total del día pero distribuida tan fino que cada hora es <0.01mm');
    console.log('  → O el modelo cambió y ya no predice precipitación para hoy');
  } else {
    console.log(`  ✅ Open-Meteo detecta ${hoursWithPrecip} horas con precipitación`);
    console.log('  → El código debería mostrar iconos de nieve/lluvia');
    console.log('  → Si no los muestra, hay un problema de propagación del phase');
  }
  console.log('');
}

testSaturdayNow();
