/**
 * Wind Transition Monitor
 * Tracks wind direction changes to validate forecast accuracy
 * Specifically monitoring NW → W/SW transition predicted by @greenguru.bariloche
 */

import axios from 'axios';

interface WindSnapshot {
  timestamp: Date;
  direction: number;
  speed: number;
  temperature: number;
  directionLabel: string;
}

const API_BASE = 'http://localhost:3000/api';

function getDirectionLabel(degrees: number): string {
  const dir = ((degrees % 360) + 360) % 360;
  if (dir >= 337.5 || dir < 22.5) return 'N';
  if (dir >= 22.5 && dir < 67.5) return 'NE';
  if (dir >= 67.5 && dir < 112.5) return 'E';
  if (dir >= 112.5 && dir < 157.5) return 'SE';
  if (dir >= 157.5 && dir < 202.5) return 'S';
  if (dir >= 202.5 && dir < 247.5) return 'SW';
  if (dir >= 247.5 && dir < 292.5) return 'W';
  if (dir >= 292.5 && dir < 337.5) return 'NW';
  return 'N';
}

function getWindPattern(degrees: number): string {
  const dir = ((degrees % 360) + 360) % 360;
  if (dir >= 260 && dir <= 325) return '🌊 PACIFIC MOISTURE (NW/W)';
  if (dir >= 210 && dir < 260) return '🌬️ POST-FRONTAL (SW/W)';
  if (dir >= 180 && dir < 210) return '🧊 COLD & DRY (S)';
  if (dir >= 10 && dir < 180) return '🚫 BLOCKED (E)';
  return '🔄 VARIABLE (N)';
}

async function captureWindSnapshot(): Promise<WindSnapshot | null> {
  try {
    const response = await axios.get(`${API_BASE}/resorts/cerro-catedral/forecast/hourly`);
    const current = response.data.hourly[0];
    
    return {
      timestamp: new Date(),
      direction: current.windDirection || 0,
      speed: current.windSpeed || 0,
      temperature: current.temperature || 0,
      directionLabel: getDirectionLabel(current.windDirection || 0)
    };
  } catch (error) {
    console.error('Error fetching wind data:', error);
    return null;
  }
}

async function monitorWindTransition() {
  console.log('🏔️  ANDES POWDER - Wind Transition Monitor');
  console.log('📍 Location: Cerro Catedral');
  console.log('🎯 Tracking: NW → W/SW transition (greenguru prediction)');
  console.log('⏰ Started:', new Date().toLocaleString('es-AR'));
  console.log('─'.repeat(80));
  console.log('');
  
  const snapshots: WindSnapshot[] = [];
  let previousDirection = 0;
  
  // Monitor every 10 minutes
  setInterval(async () => {
    const snapshot = await captureWindSnapshot();
    
    if (!snapshot) return;
    
    snapshots.push(snapshot);
    
    const pattern = getWindPattern(snapshot.direction);
    const change = previousDirection ? snapshot.direction - previousDirection : 0;
    const changeSymbol = change > 0 ? '↻' : change < 0 ? '↺' : '→';
    
    console.log(`[${snapshot.timestamp.toLocaleTimeString('es-AR')}]`);
    console.log(`  Direction: ${snapshot.direction}° ${snapshot.directionLabel} ${changeSymbol}`);
    console.log(`  Speed: ${snapshot.speed.toFixed(1)} km/h`);
    console.log(`  Temp: ${snapshot.temperature.toFixed(1)}°C`);
    console.log(`  Pattern: ${pattern}`);
    
    // Detect transition
    if (previousDirection >= 260 && previousDirection <= 325 && // Was NW/W
        snapshot.direction >= 210 && snapshot.direction < 260) { // Now SW/W
      console.log('');
      console.log('🎯 *** TRANSITION DETECTED ***');
      console.log('   NW/W → SW/W rotation confirmed!');
      console.log('   @greenguru.bariloche prediction validated ✅');
      console.log('');
    }
    
    console.log('─'.repeat(80));
    console.log('');
    
    previousDirection = snapshot.direction;
    
    // Save snapshots every hour
    if (snapshots.length % 6 === 0) {
      console.log(`📊 Captured ${snapshots.length} snapshots`);
      console.log(`   Range: ${Math.min(...snapshots.map(s => s.direction))}° - ${Math.max(...snapshots.map(s => s.direction))}°`);
      console.log('');
    }
  }, 10 * 60 * 1000); // Every 10 minutes
  
  // Initial snapshot
  const initial = await captureWindSnapshot();
  if (initial) {
    previousDirection = initial.direction;
    console.log('📸 Initial snapshot captured');
    console.log(`   Direction: ${initial.direction}° ${initial.directionLabel}`);
    console.log(`   Pattern: ${getWindPattern(initial.direction)}`);
    console.log('');
    console.log('⏳ Monitoring... (Ctrl+C to stop)');
    console.log('─'.repeat(80));
    console.log('');
  }
}

// Run monitor
monitorWindTransition().catch(console.error);
