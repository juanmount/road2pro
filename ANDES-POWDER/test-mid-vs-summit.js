// Test para comparar MID vs SUMMIT hoy
const fetch = require('node-fetch');

const lat = -41.15;
const lon = -71.40;

async function testMidVsSummit() {
  console.log('='.repeat(80));
  console.log('COMPARACIÓN: MID (1600m) vs SUMMIT (2100m) - Sábado 18 Abril');
  console.log('='.repeat(80));
  console.log('');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall,windspeed_10m,relativehumidity_2m,cloudcover&forecast_days=7&timezone=auto&models=best_match`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  // Filtrar sábado 18 abril
  const saturdayData = data.hourly.time
    .map((time, idx) => ({
      time,
      baseTemp: data.hourly.temperature_2m[idx],
      precip: data.hourly.precipitation[idx],
      snow: data.hourly.snowfall[idx],
      cloud: data.hourly.cloudcover[idx]
    }))
    .filter(h => {
      const date = new Date(h.time);
      return date.getDate() === 18 && date.getMonth() === 3;
    });

  console.log('HORA | MID (1600m) | SUMMIT (2100m)');
  console.log('-'.repeat(80));
  
  let totalPrecipMid = 0;
  let totalSnowMid = 0;
  let totalPrecipSummit = 0;
  let totalSnowSummit = 0;
  
  saturdayData.forEach((h) => {
    const hour = h.time.split('T')[1].substring(0, 5);
    
    // Calcular temp en MID (1600m)
    const lapseRate = 0.0065;
    const tempMid = h.baseTemp - (1600 - 840) * lapseRate;
    const tempSummit = h.baseTemp - (2100 - 840) * lapseRate;
    
    // Determinar phase y snowfall para MID
    let phaseMid = 'clear';
    let snowMid = 0;
    if (h.precip > 0.01) {
      totalPrecipMid += h.precip;
      if (tempMid <= -1) {
        phaseMid = 'snow';
        snowMid = h.precip * 1.0;
      } else if (tempMid > -1 && tempMid <= 2) {
        phaseMid = 'mixed';
        const snowRatio = Math.max(0, (2 - tempMid) / 3);
        snowMid = h.precip * snowRatio * 1.0;
      } else {
        phaseMid = 'rain';
        snowMid = 0;
      }
      totalSnowMid += snowMid;
    }
    
    // Determinar phase y snowfall para SUMMIT
    let phaseSummit = 'clear';
    let snowSummit = 0;
    if (h.precip > 0.01) {
      totalPrecipSummit += h.precip;
      if (tempSummit <= -1) {
        phaseSummit = 'snow';
        snowSummit = h.precip * 1.0;
      } else if (tempSummit > -1 && tempSummit <= 2) {
        phaseSummit = 'mixed';
        const snowRatio = Math.max(0, (2 - tempSummit) / 3);
        snowSummit = h.precip * snowRatio * 1.0;
      } else {
        phaseSummit = 'rain';
        snowSummit = 0;
      }
      totalSnowSummit += snowSummit;
    }
    
    const iconMid = phaseMid === 'snow' ? '❄️' : phaseMid === 'mixed' ? '🌨️' : phaseMid === 'rain' ? '🌧️' : h.cloud > 50 ? '☁️' : '☀️';
    const iconSummit = phaseSummit === 'snow' ? '❄️' : phaseSummit === 'mixed' ? '🌨️' : phaseSummit === 'rain' ? '🌧️' : h.cloud > 50 ? '☁️' : '☀️';
    
    if (h.precip > 0.01 || snowMid > 0 || snowSummit > 0) {
      console.log(`${hour} | ${iconMid} ${tempMid.toFixed(1)}°C ${snowMid.toFixed(1)}cm | ${iconSummit} ${tempSummit.toFixed(1)}°C ${snowSummit.toFixed(1)}cm`);
    }
  });
  
  console.log('-'.repeat(80));
  console.log('');
  console.log('TOTALES DEL DÍA:');
  console.log(`  MID (1600m):    ${totalPrecipMid.toFixed(1)}mm precip → ${totalSnowMid.toFixed(1)}cm nieve`);
  console.log(`  SUMMIT (2100m): ${totalPrecipSummit.toFixed(1)}mm precip → ${totalSnowSummit.toFixed(1)}cm nieve`);
  console.log('');
  console.log('💡 CONCLUSIÓN:');
  console.log('');
  if (totalSnowMid < 1 && totalSnowSummit > 5) {
    console.log('  → En MID (1600m) cayó POCA o NADA de nieve (temperatura muy cálida)');
    console.log('  → En SUMMIT (2100m) SÍ nevó significativamente');
    console.log('  → Las cámaras muestran nieve en SUMMIT, no en MID');
    console.log('  → El usuario debe cambiar a SUMMIT para ver la nieve en el forecast');
  } else if (totalSnowMid > 1) {
    console.log('  → En MID SÍ nevó');
    console.log('  → El usuario debe scrollear hacia la IZQUIERDA en el modal');
    console.log('  → Para ver las horas de la mañana (08:00-12:00) donde nevó');
  } else {
    console.log('  → No hubo nieve significativa en ninguna elevación');
  }
  console.log('');
}

testMidVsSummit();
