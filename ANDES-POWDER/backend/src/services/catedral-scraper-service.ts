/**
 * Catedral Scraper Service
 * Scrapes real-time snow and weather data from Cerro Catedral's website
 */

import puppeteer from 'puppeteer';
import { ObservationService } from './observation-service';
import pool from '../config/database';

interface CatedralWeatherData {
  temperatura?: number;
  nieve24h?: number;
  nieve48h?: number;
  viento?: number;
  timestamp: Date;
  estadoPistas?: string;
  estadoMedios?: string;
}

export class CatedralScraperService {
  private observationService: ObservationService;
  private readonly CATEDRAL_URL = 'https://catedralaltapatagonia.com/parte-de-nieve/';
  
  constructor() {
    this.observationService = new ObservationService();
  }
  
  /**
   * Scrape current conditions from Catedral website
   */
  async scrapeCurrentConditions(): Promise<CatedralWeatherData | null> {
    let browser;
    
    try {
      console.log('Launching browser to scrape Catedral data...');
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set timeout and user agent
      await page.setDefaultNavigationTimeout(30000);
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      console.log(`Navigating to ${this.CATEDRAL_URL}...`);
      await page.goto(this.CATEDRAL_URL, { waitUntil: 'networkidle2' });
      
      // Wait for the parte de nieve widget to load
      await page.waitForSelector('#parte-de-nieve-ca', { timeout: 15000 });
      
      // Wait for dynamic content to load (React app)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('Widget loaded, extracting data...');
      
      // Extract data from the page
      const data = await page.evaluate(() => {
        const result: any = {
          timestamp: new Date().toISOString()
        };
        
        // Get the widget container
        const widget = document.querySelector('#parte-de-nieve-ca');
        if (!widget) {
          result.error = 'Widget not found';
          return result;
        }
        
        // Get all text from widget
        const widgetText = widget.textContent || '';
        result.widgetText = widgetText.substring(0, 1000);
        
        // Try to extract temperature (look for °C or ° pattern)
        const tempMatch = widgetText.match(/(-?\d+)\s*°[Cc]?/);
        if (tempMatch) {
          result.temperatura = parseFloat(tempMatch[1]);
        }
        
        // Try to extract snow data (look for cm pattern)
        const snowMatch24 = widgetText.match(/24\s*(?:h|hs|horas)[^\d]*(\d+)\s*cm/i);
        const snowMatch48 = widgetText.match(/48\s*(?:h|hs|horas)[^\d]*(\d+)\s*cm/i);
        
        if (snowMatch24) {
          result.nieve24h = parseFloat(snowMatch24[1]);
        }
        if (snowMatch48) {
          result.nieve48h = parseFloat(snowMatch48[1]);
        }
        
        // Try to extract wind (look for km/h pattern)
        const windMatch = widgetText.match(/(\d+)\s*km\s*\/?\s*h/i);
        if (windMatch) {
          result.viento = parseFloat(windMatch[1]);
        }
        
        // Also try to find in the whole page
        const pageText = document.body.innerText;
        result.pageText = pageText.substring(0, 500);
        
        return result;
      });
      
      console.log('Scraped data:', data);
      
      await browser.close();
      
      return {
        temperatura: data.temperatura,
        nieve24h: data.nieve24h,
        nieve48h: data.nieve48h,
        viento: data.viento,
        timestamp: new Date(data.timestamp)
      };
      
    } catch (error) {
      console.error('Error scraping Catedral data:', error);
      if (browser) {
        await browser.close();
      }
      return null;
    }
  }
  
  /**
   * Sync scraped data to observation system
   */
  async syncToObservations(resortSlug: string = 'cerro-catedral'): Promise<void> {
    try {
      const data = await this.scrapeCurrentConditions();
      
      if (!data) {
        console.warn('No Catedral data available, skipping sync');
        return;
      }
      
      console.log(`✓ Scraped Catedral data at ${data.timestamp.toISOString()}`);
      
      // Get resort ID
      const resortResult = await pool.query(
        'SELECT id FROM resorts WHERE slug = $1',
        [resortSlug]
      );
      
      if (resortResult.rows.length === 0) {
        console.warn(`Resort ${resortSlug} not found`);
        return;
      }
      
      const resortId = resortResult.rows[0].id;
      
      // Record temperature if available
      if (data.temperatura !== undefined) {
        // Assume mid elevation for scraped data
        await this.observationService.recordObservation({
          resortId,
          observedAt: data.timestamp,
          observationType: 'temperature',
          value: data.temperatura,
          unit: '°C',
          elevationBand: 'mid',
          source: 'Catedral-Web-Scraper',
          reliability: 'high'
        });
        
        console.log(`  → Recorded temperature: ${data.temperatura}°C`);
      }
      
      // Record snowfall if available
      if (data.nieve24h !== undefined && data.nieve24h > 0) {
        await this.observationService.recordObservation({
          resortId,
          observedAt: data.timestamp,
          observationType: 'snowfall',
          value: data.nieve24h,
          unit: 'cm',
          elevationBand: 'mid',
          source: 'Catedral-Web-Scraper',
          reliability: 'high'
        });
        
        console.log(`  → Recorded snowfall 24h: ${data.nieve24h}cm`);
      }
      
      // Record wind if available
      if (data.viento !== undefined) {
        await this.observationService.recordObservation({
          resortId,
          observedAt: data.timestamp,
          observationType: 'wind',
          value: data.viento,
          unit: 'km/h',
          elevationBand: 'summit',
          source: 'Catedral-Web-Scraper',
          reliability: 'medium'
        });
        
        console.log(`  → Recorded wind: ${data.viento}km/h`);
      }
      
      console.log('✓ Catedral scraper data synced to observations');
    } catch (error) {
      console.error('Error syncing Catedral scraper data:', error);
      throw error;
    }
  }
  
  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(outputPath: string = '/tmp/catedral-screenshot.png'): Promise<void> {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(this.CATEDRAL_URL, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({ path: outputPath, fullPage: true });
      
      console.log(`Screenshot saved to ${outputPath}`);
      
      await browser.close();
    } catch (error) {
      console.error('Error taking screenshot:', error);
      if (browser) {
        await browser.close();
      }
    }
  }
}
