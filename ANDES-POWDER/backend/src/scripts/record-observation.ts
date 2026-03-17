/**
 * Script to record current observations from resorts
 * Usage: npx tsx src/scripts/record-observation.ts cerro-catedral 11
 */

import { observationService } from '../services/observation-service';

async function recordObservation() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx tsx src/scripts/record-observation.ts <resort-slug> <base-temp> [mid-temp] [summit-temp]');
    console.error('Example: npx tsx src/scripts/record-observation.ts cerro-catedral 11 5 -2');
    process.exit(1);
  }
  
  const [resortSlug, baseTempStr, midTempStr, summitTempStr] = args;
  
  const baseTemp = parseFloat(baseTempStr);
  const midTemp = midTempStr ? parseFloat(midTempStr) : undefined;
  const summitTemp = summitTempStr ? parseFloat(summitTempStr) : undefined;
  
  console.log('='.repeat(60));
  console.log('Recording Observation');
  console.log('='.repeat(60));
  console.log(`Resort: ${resortSlug}`);
  console.log(`Base temperature: ${baseTemp}°C`);
  if (midTemp !== undefined) console.log(`Mid temperature: ${midTemp}°C`);
  if (summitTemp !== undefined) console.log(`Summit temperature: ${summitTemp}°C`);
  console.log('');
  
  try {
    await observationService.recordCurrentConditions(
      resortSlug,
      baseTemp,
      midTemp,
      summitTemp
    );
    
    console.log('');
    console.log('✓ Observation recorded successfully!');
    console.log('The correction profile has been updated based on this observation.');
    console.log('Future forecasts will be more accurate.');
  } catch (error) {
    console.error('Error recording observation:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

recordObservation();
