// Test para verificar cálculo de nieve por elevación
const fetch = require('node-fetch');

const lat = -41.15;
const lon = -71.40;

async function testElevationSnow() {
  console.log('='.repeat(80));
  console.log('TEST: Cálculo de nieve por elevación - Sábado 18 Abril');
  console.log('='.repeat(80));
  console.log('');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall,windspeed_10m,winddirection_10m,relativehumidity_2m,freezinglevel_height&forecast_days=7&timezone=auto&models=best_match`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  // Filtrar sábado
  const saturdayData = data.hourly.time
    .map((time, idx) => ({
      time,
      baseTemp: data.hourly.temperature_2m[idx],
      precip: data.hourly.precipitation[idx],
      wind: data.hourly.windspeed_10m[idx],
      humidity: data.hourly.relativehumidity_2m[idx],
      frz: data.hourly.freezinglevel_height[idx]
    }))
    .filter(h => h.time.startsWith('2026-04-18'));

  console.log('Elevaciones Cerro Catedral:');
  console.log('  BASE: 1030m');
  console.log('  MID: 1600m');
  console.log('  SUMMIT: 2100m');
  console.log('');

  const elevations = [
    { name: 'BASE', meters: 1030 },
    { name: 'MID', meters: 1600 },
    { name: 'SUMMIT', meters: 2100 }
  ];

  elevations.forEach(elev => {
    console.log(`${'='.repeat(80)}`);
    console.log(`${elev.name} (${elev.meters}m)`);
    console.log(`${'-'.repeat(80)}`);
    
    let totalSnow = 0;
    let totalPrecip = 0;
    let snowHours = 0;
    
    saturdayData.forEach(h => {
      // Aplicar lapse rate
      const lapseRate = 0.0065; // -6.5°C/1000m
      const tempAdjust = -(elev.meters - 840) * lapseRate;
      const temp = h.baseTemp + tempAdjust;
      
      // Calcular nieve
      let snow = 0;
      let phase = 'clear';
      
      if (h.precip > 0.1) {
        if (temp <= -1) {
          snow = h.precip * 1.0; // 100% nieve
          phase = 'snow';
        } else if (temp > -1 && temp <= 2) {
          const snowRatio = Math.max(0, (2 - temp) / 3);
          snow = h.precip * snowRatio * 1.0;
          phase = 'mixed';
        } else {
          snow = 0;
          phase = 'rain';
        }
        
        totalSnow += snow;
        totalPrecip += h.precip;
        if (snow > 0.1) snowHours++;
      }
    });
    
    console.log(`  Precipitación total: ${totalPrecip.toFixed(1)} mm`);
    console.log(`  Nieve total: ${totalSnow.toFixed(1)} cm`);
    console.log(`  Horas con nieve: ${snowHours}`);
    console.log('');
    
    // Mostrar primeras 6 horas con detalle
    console.log('  Primeras 6 horas:');
    saturdayData.slice(0, 6).forEach(h => {
      const lapseRate = 0.0065;
      const tempAdjust = -(elev.meters - 840) * lapseRate;
      const temp = h.baseTemp + tempAdjust;
      
      let snow = 0;
      let phase = '☀️';
      
      if (h.precip > 0.1) {
        if (temp <= -1) {
          snow = h.precip * 1.0;
          phase = '❄️';
        } else if (temp > -1 && temp <= 2) {
          const snowRatio = Math.max(0, (2 - temp) / 3);
          snow = h.precip * snowRatio * 1.0;
          phase = '🌨️';
        } else {
          snow = 0;
          phase = '☔';
        }
      }
      
      console.log(`    ${h.time.split('T')[1]} ${phase} Temp: ${temp.toFixed(1)}°C, Precip: ${h.precip.toFixed(1)}mm, Snow: ${snow.toFixed(1)}cm`);
    });
    console.log('');
  });
  
  console.log('='.repeat(80));
  console.log('');
  console.log('💡 CONCLUSIÓN:');
  console.log('');
  console.log('Si SUMMIT muestra ~18cm de nieve:');
  console.log('  ✅ El cálculo está correcto');
  console.log('  ✅ Coincide con Snow-Forecast');
  console.log('  ✅ La app debería mostrar esto');
  console.log('');
  console.log('Si BASE muestra 0cm:');
  console.log('  ✅ Correcto - hace 7°C, es lluvia');
  console.log('  ✅ Pronóstico realista y científico');
  console.log('');
}

testElevationSnow();
