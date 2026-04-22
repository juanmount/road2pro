// Test para ver datos AHORA (6:55pm sábado 18 abril)
const fetch = require('node-fetch');

const lat = -41.15;
const lon = -71.40;

async function testNowEvening() {
  console.log('='.repeat(80));
  console.log('TEST: Datos AHORA - 6:55pm Sábado 18 Abril 2026');
  console.log('='.repeat(80));
  console.log('');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall,windspeed_10m,winddirection_10m,relativehumidity_2m,freezinglevel_height,cloudcover&forecast_days=7&timezone=auto&models=best_match`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  // Hora actual: 19:00 (7pm)
  const currentHour = 19;
  
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

  console.log('HORAS DESDE AHORA (19:00) EN ADELANTE - SÁBADO:');
  console.log('');
  
  todayData.forEach((h, idx) => {
    const hour = h.time.split('T')[1];
    
    // Calcular temp en SUMMIT (2100m) - donde nevó según cámaras
    const lapseRate = 0.0065;
    const tempSummit = h.baseTemp - (2100 - 840) * lapseRate;
    
    // Determinar phase
    let phase = 'clear';
    if (h.precip > 0.01) {
      if (tempSummit <= -1) phase = 'snow';
      else if (tempSummit > -1 && tempSummit <= 2) phase = 'mixed';
      else phase = 'rain';
    }
    
    const icon = phase === 'snow' ? '❄️' : phase === 'rain' ? '🌧️' : phase === 'mixed' ? '🌨️' : h.cloud > 50 ? '☁️' : '☀️';
    
    console.log(`${hour} ${icon} | SUMMIT: ${tempSummit.toFixed(1)}°C | Precip: ${h.precip.toFixed(3)}mm | Cloud: ${h.cloud}% | Phase: ${phase}`);
  });
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  
  // Ahora verificar las horas PASADAS de hoy (cuando SÍ nevó)
  const pastData = data.hourly.time
    .map((time, idx) => ({
      time,
      baseTemp: data.hourly.temperature_2m[idx],
      precip: data.hourly.precipitation[idx],
      snow: data.hourly.snowfall[idx],
      cloud: data.hourly.cloudcover[idx]
    }))
    .filter(h => {
      const date = new Date(h.time);
      return date.getDate() === 18 && date.getMonth() === 3 && date.getHours() >= 8 && date.getHours() <= 18;
    });
  
  console.log('HORAS PASADAS DE HOY (08:00-18:00) - CUANDO NEVÓ:');
  console.log('');
  
  pastData.forEach((h) => {
    const hour = h.time.split('T')[1];
    const lapseRate = 0.0065;
    const tempSummit = h.baseTemp - (2100 - 840) * lapseRate;
    
    let phase = 'clear';
    if (h.precip > 0.01) {
      if (tempSummit <= -1) phase = 'snow';
      else if (tempSummit > -1 && tempSummit <= 2) phase = 'mixed';
      else phase = 'rain';
    }
    
    const icon = phase === 'snow' ? '❄️' : phase === 'rain' ? '🌧️' : phase === 'mixed' ? '🌨️' : h.cloud > 50 ? '☁️' : '☀️';
    
    console.log(`${hour} ${icon} | SUMMIT: ${tempSummit.toFixed(1)}°C | Precip: ${h.precip.toFixed(3)}mm | Snow: ${h.snow.toFixed(2)}cm | Phase: ${phase}`);
  });
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('💡 CONCLUSIÓN:');
  console.log('');
  console.log('Si las horas pasadas (08:00-18:00) muestran precipitación/nieve pero');
  console.log('las horas futuras (19:00+) NO muestran precipitación, entonces:');
  console.log('');
  console.log('→ El modelo cambió su predicción (común en meteorología)');
  console.log('→ La nieve que cayó HOY ya pasó');
  console.log('→ El hourly forecast está CORRECTO mostrando sol para las próximas horas');
  console.log('→ La tarjeta LIVE muestra precipitación porque usa datos OBSERVADOS del pasado');
  console.log('');
  console.log('SOLUCIÓN: El hourly forecast debería mostrar las horas PASADAS también');
  console.log('para que el usuario vea que SÍ nevó más temprano hoy.');
  console.log('');
}

testNowEvening();
