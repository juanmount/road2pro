// Test para ver datos del SÁBADO 18 ABRIL 2026
const fetch = require('node-fetch');

const lat = -41.15;
const lon = -71.40;
const summitElevation = 2100;

async function testSaturday() {
  console.log('='.repeat(80));
  console.log('TEST: Datos del SÁBADO 18 ABRIL 2026 en SUMMIT (2100m)');
  console.log('='.repeat(80));
  console.log('');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall&forecast_days=7&past_days=1&timezone=auto&models=best_match`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  console.log('Total horas en respuesta:', data.hourly.time.length);
  console.log('Primera hora:', data.hourly.time[0]);
  console.log('Última hora:', data.hourly.time[data.hourly.time.length - 1]);
  console.log('');
  
  // Filtrar SÁBADO 18 abril
  const saturdayData = data.hourly.time
    .map((time, idx) => {
      const baseTemp = data.hourly.temperature_2m[idx];
      const precip = data.hourly.precipitation[idx];
      
      // Ajustar temperatura por elevación
      const tempAdjust = -(summitElevation - 840) * 0.0065;
      const temp = baseTemp + tempAdjust;
      
      // Calcular nieve
      let snow = 0;
      if (precip > 0.01) {
        if (temp <= -1) {
          snow = precip * 1.0;
        } else if (temp > -1 && temp <= 2) {
          const snowRatio = (2 - temp) / 3;
          snow = precip * snowRatio * 1.0;
        }
      }
      
      return {
        time,
        baseTemp,
        adjustedTemp: temp,
        precip,
        snow
      };
    })
    .filter(h => {
      const date = new Date(h.time);
      return date.getDate() === 18 && date.getMonth() === 3; // Abril = mes 3
    });

  console.log('HORAS DEL SÁBADO 18 ABRIL:');
  console.log('Total horas:', saturdayData.length);
  console.log('');
  
  const hoursWithPrecip = saturdayData.filter(h => h.precip > 0.01);
  console.log('Horas con precipitación (>0.01mm):', hoursWithPrecip.length);
  console.log('');
  
  if (hoursWithPrecip.length > 0) {
    console.log('HORAS CON PRECIPITACIÓN:');
    hoursWithPrecip.forEach(h => {
      const hour = h.time.split('T')[1].substring(0, 5);
      console.log(`  ${hour} → Base: ${h.baseTemp.toFixed(1)}°C, Summit: ${h.adjustedTemp.toFixed(1)}°C, Precip: ${h.precip.toFixed(2)}mm, Snow: ${h.snow.toFixed(2)}cm`);
    });
  } else {
    console.log('❌ NO HAY HORAS CON PRECIPITACIÓN EN EL SÁBADO');
  }
  
  console.log('');
  const totalPrecip = saturdayData.reduce((sum, h) => sum + h.precip, 0);
  const totalSnow = saturdayData.reduce((sum, h) => sum + h.snow, 0);
  console.log('TOTAL DEL SÁBADO 18 ABRIL:');
  console.log(`  Precipitación: ${totalPrecip.toFixed(2)}mm`);
  console.log(`  Nieve en SUMMIT (2100m): ${totalSnow.toFixed(2)}cm`);
  console.log('');
}

testSaturday();
