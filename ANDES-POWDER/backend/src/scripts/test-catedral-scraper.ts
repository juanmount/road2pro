/**
 * Test Catedral Scraper
 * Tests the web scraping service for Cerro Catedral
 */

import { CatedralScraperService } from '../services/catedral-scraper-service';

async function testCatedralScraper() {
  console.log('='.repeat(60));
  console.log('Testing Catedral Web Scraper');
  console.log('='.repeat(60));
  console.log();
  
  const scraper = new CatedralScraperService();
  
  // Test 1: Scrape current conditions
  console.log('Test 1: Scraping current conditions...');
  const data = await scraper.scrapeCurrentConditions();
  
  if (data) {
    console.log('✓ Successfully scraped data:');
    console.log(`  Timestamp: ${data.timestamp.toISOString()}`);
    console.log(`  Temperature: ${data.temperatura !== undefined ? data.temperatura + '°C' : 'N/A'}`);
    console.log(`  Snow 24h: ${data.nieve24h !== undefined ? data.nieve24h + 'cm' : 'N/A'}`);
    console.log(`  Snow 48h: ${data.nieve48h !== undefined ? data.nieve48h + 'cm' : 'N/A'}`);
    console.log(`  Wind: ${data.viento !== undefined ? data.viento + 'km/h' : 'N/A'}`);
  } else {
    console.log('✗ Failed to scrape data');
  }
  
  console.log();
  
  // Test 2: Sync to observations
  console.log('Test 2: Syncing data to observation system...');
  try {
    await scraper.syncToObservations('cerro-catedral');
    console.log('✓ Successfully synced to observations');
  } catch (error) {
    console.log('✗ Failed to sync:', error);
  }
  
  console.log();
  
  // Test 3: Take screenshot for debugging
  console.log('Test 3: Taking screenshot for debugging...');
  try {
    await scraper.takeScreenshot('/tmp/catedral-debug.png');
    console.log('✓ Screenshot saved to /tmp/catedral-debug.png');
  } catch (error) {
    console.log('✗ Failed to take screenshot:', error);
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('✓ Catedral Scraper Test Complete');
  console.log('='.repeat(60));
}

// Run test
testCatedralScraper()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
