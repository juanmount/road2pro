// Test para ver datos exactos de AHORA (3:15pm sábado 18 abril)
const fetch = require('node-fetch');

const lat = -41.15;
const lon = -71.40;

async function testCurrentTime() {
  console.log('='.repeat(80));
  console.log('TEST: Datos AHORA - 3:15pm Sábado 18 Abril 2026');
  console.log('='.repeat(80));
  console.log('');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall,windspeed_10m,winddirection_10m,relativehumidity_2m,freezinglevel_height,cloudcover&forecast_days=7&timezone=auto&models=best_match`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  // Hora actual: 15:00 (3pm)
  const currentHour = 15;
  
  // Filtrar desde hora actual en adelante
  const todayData = data.hourly.time
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
    .filter(h => {
      const date = new Date(h.time);
      return date.getDate() === 18 && date.getMonth() === 3 && date.getHours() >= currentHour;
    });

  console.log('HORAS DESDE AHORA (15:00) EN ADELANTE:');
  console.log('');
  
  todayData.slice(0, 8).forEach((h, idx) => {
    const hour = h.time.split('T')[1];
    
    // Calcular temp en MID (1600m)
    const lapseRate = 0.0065;
    const tempMid = h.baseTemp - (1600 - 840) * lapseRate;
    
    // Determinar phase según NUESTRO código
    let phase = 'clear';
    let snowfall = 0;
    
    if (h.precip > 0.01) {
      if (tempMid <= -1) {
        phase = 'snow';
        snowfall = h.precip * 1.0;
      } else if (tempMid > -1 && tempMid <= 2) {
        phase = 'mixed';
        const snowRatio = Math.max(0, (2 - tempMid) / 3);
        snowfall = h.precip * snowRatio * 1.0;
      } else {
        phase = 'rain';
        snowfall = 0;
      }
    }
    
    // Determinar icono según getWeatherIcon
    let icon = '☀️';
    if (phase === 'snow') icon = '❄️';
    else if (phase === 'rain') icon = '🌧️';
    else if (phase === 'mixed') icon = '🌨️';
    else if (h.cloud > 50) icon = '☁️';
    
    console.log(`${hour} ${icon} | Temp MID: ${tempMid.toFixed(1)}°C | Precip: ${h.precip.toFixed(3)}mm | Snow calc: ${snowfall.toFixed(2)}cm | Cloud: ${h.cloud}% | Phase: ${phase}`);
  });
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('💡 ANÁLISIS:');
  console.log('');
  
  const hoursWithPrecip = todayData.filter(h => h.precip > 0.01).length;
  
  if (hoursWithPrecip === 0) {
    console.log('  ❌ NO hay precipitación en las próximas horas');
    console.log('  → El modelo cambió su predicción');
    console.log('  → Ya no predice precipitación para esta tarde/noche');
    console.log('  → Por eso muestra sol (es correcto según el modelo actual)');
  } else {
    console.log(`  ✅ Hay ${hoursWithPrecip} horas con precipitación`);
    console.log('  → Deberían mostrar iconos de nieve/lluvia/mixto');
    console.log('  → Si muestra sol, el código no se está ejecutando');
  }
  console.log('');
  console.log('COMPARACIÓN CON REALIDAD:');
  console.log('  - Cámaras Catedral: Muestran nublado/precipitación');
  console.log('  - Tarjeta LIVE: Muestra precipitación');
  console.log('  - Open-Meteo: Ver arriba si predice precipitación o no');
  console.log('');
}

testCurrentTime();
