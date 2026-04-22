// Test para verificar si past_days=1 funciona
const fetch = require('node-fetch');

const lat = -41.15;
const lon = -71.40;

async function testPastDays() {
  console.log('='.repeat(80));
  console.log('TEST: Open-Meteo con past_days=1');
  console.log('='.repeat(80));
  console.log('');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall&forecast_days=7&past_days=1&timezone=auto&models=best_match`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  console.log('Total horas en respuesta:', data.hourly.time.length);
  console.log('');
  
  // Filtrar sábado 18 abril
  const saturdayData = data.hourly.time
    .map((time, idx) => ({
      time,
      precip: data.hourly.precipitation[idx],
      snow: data.hourly.snowfall[idx]
    }))
    .filter(h => {
      const date = new Date(h.time);
      return date.getDate() === 18 && date.getMonth() === 3;
    });

  console.log('HORAS DEL SÁBADO 18 ABRIL:');
  console.log('Total horas del sábado:', saturdayData.length);
  console.log('');
  
  const hoursWithPrecip = saturdayData.filter(h => h.precip > 0.01);
  console.log('Horas con precipitación (>0.01mm):', hoursWithPrecip.length);
  console.log('');
  
  if (hoursWithPrecip.length > 0) {
    console.log('HORAS CON PRECIPITACIÓN:');
    hoursWithPrecip.forEach(h => {
      const hour = h.time.split('T')[1];
      console.log(`  ${hour} → ${h.precip.toFixed(2)}mm precip, ${h.snow.toFixed(2)}cm snow`);
    });
  } else {
    console.log('❌ NO HAY HORAS CON PRECIPITACIÓN');
    console.log('');
    console.log('Primeras 5 horas del sábado:');
    saturdayData.slice(0, 5).forEach(h => {
      const hour = h.time.split('T')[1];
      console.log(`  ${hour} → ${h.precip.toFixed(2)}mm precip, ${h.snow.toFixed(2)}cm snow`);
    });
  }
  
  console.log('');
  const totalPrecip = saturdayData.reduce((sum, h) => sum + h.precip, 0);
  const totalSnow = saturdayData.reduce((sum, h) => sum + h.snow, 0);
  console.log('TOTAL DEL DÍA:');
  console.log(`  Precipitación: ${totalPrecip.toFixed(2)}mm`);
  console.log(`  Nieve (Open-Meteo): ${totalSnow.toFixed(2)}cm`);
  console.log('');
}

testPastDays();
