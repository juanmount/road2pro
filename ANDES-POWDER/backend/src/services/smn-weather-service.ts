/**
 * SMN (Servicio Meteorológico Nacional) Argentina Weather Service
 * Fetches real weather data from Argentine weather stations
 */

import axios from 'axios';
import { ObservationService } from './observation-service';
import pool from '../config/database';

interface SMNStationData {
  _id: string;
  int_number: number;
  name: string;
  province: string;
  lat: string;
  lon: string;
  updated: number;
  weather: {
    temp: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wing_deg: string;
    visibility: number;
    description: string;
  };
}

interface SMNWeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: string;
  timestamp: Date;
  stationName: string;
  stationElevation: number;
}

export class SMNWeatherService {
  private readonly SMN_BASE_URL = 'https://ws.smn.gob.ar';
  private readonly BARILOCHE_STATION = '87715'; // Aeropuerto Bariloche
  private readonly BARILOCHE_ELEVATION = 840; // meters
  private observationService: ObservationService;
  
  constructor() {
    this.observationService = new ObservationService();
  }
  
  /**
   * Fetch current weather data from SMN station
   */
  async fetchStationData(stationId: string = this.BARILOCHE_STATION): Promise<SMNWeatherData | null> {
    try {
      console.log(`Fetching SMN data for station ${stationId}...`);
      
      // Get all stations and find the one we want
      const response = await axios.get<SMNStationData[]>(
        `${this.SMN_BASE_URL}/map_items/weather`,
        {
          timeout: 10000,
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      const stations = response.data;
      const station = stations.find(s => s.int_number.toString() === stationId);
      
      if (!station || !station.weather || !station.weather.temp) {
        console.warn('SMN station not found or incomplete data');
        return null;
      }
      
      return {
        temperature: station.weather.temp,
        humidity: station.weather.humidity,
        pressure: station.weather.pressure,
        windSpeed: station.weather.wind_speed,
        windDirection: station.weather.wing_deg,
        timestamp: new Date(station.updated * 1000), // Unix timestamp to Date
        stationName: station.name,
        stationElevation: this.BARILOCHE_ELEVATION
      };
    } catch (error) {
      console.error('Error fetching SMN data:', error);
      return null;
    }
  }
  
  /**
   * Adjust temperature for elevation difference
   * Uses standard atmospheric lapse rate: ~6.5°C per 1000m
   */
  private adjustTemperatureForElevation(
    temperature: number,
    fromElevation: number,
    toElevation: number
  ): number {
    const LAPSE_RATE = 6.5; // °C per 1000m
    const elevationDiff = toElevation - fromElevation;
    const adjustment = (elevationDiff / 1000) * -LAPSE_RATE;
    return temperature + adjustment;
  }
  
  /**
   * Sync SMN data to observation system for all elevation bands
   */
  async syncToObservations(resortSlug: string = 'cerro-catedral'): Promise<void> {
    try {
      const data = await this.fetchStationData();
      
      if (!data) {
        console.warn('No SMN data available, skipping sync');
        return;
      }
      
      console.log(`✓ Fetched SMN data: ${data.temperature}°C at ${data.stationName}`);
      
      // Get resort elevations
      const resortElevations = {
        base: 1030,
        mid: 1600,
        summit: 2100
      };
      
      // Sync temperature for each elevation band
      for (const [band, elevation] of Object.entries(resortElevations)) {
        const adjustedTemp = this.adjustTemperatureForElevation(
          data.temperature,
          data.stationElevation,
          elevation
        );
        
        // Get resort ID first
        const resortResult = await pool.query(
          'SELECT id FROM resorts WHERE slug = $1',
          [resortSlug]
        );
        
        if (resortResult.rows.length === 0) {
          console.warn(`Resort ${resortSlug} not found`);
          continue;
        }
        
        const resortId = resortResult.rows[0].id;
        
        await this.observationService.recordObservation({
          resortId,
          observedAt: new Date(), // Use current time, not SMN's timestamp (often outdated)
          observationType: 'temperature',
          value: adjustedTemp,
          unit: '°C',
          elevationBand: band as 'base' | 'mid' | 'summit',
          source: `SMN-${data.stationName}`,
          reliability: 'high'
        });
        
        console.log(`  → Recorded ${band}: ${adjustedTemp.toFixed(1)}°C (adjusted from ${data.temperature}°C)`);
      }
      
      console.log('✓ SMN data synced to observations');
    } catch (error) {
      console.error('Error syncing SMN data:', error);
      throw error;
    }
  }
  
  /**
   * Get all available SMN stations
   */
  async getAvailableStations(): Promise<SMNStationData[]> {
    try {
      const response = await axios.get<SMNStationData[]>(
        `${this.SMN_BASE_URL}/map_items/weather`,
        {
          timeout: 10000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching SMN stations:', error);
      return [];
    }
  }
  
  /**
   * Find nearest station to given coordinates
   */
  async findNearestStation(lat: number, lon: number): Promise<SMNStationData | null> {
    const stations = await this.getAvailableStations();
    
    if (stations.length === 0) {
      return null;
    }
    
    // Calculate distance using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
    
    // Find closest station
    let nearest = stations[0];
    let minDistance = calculateDistance(lat, lon, parseFloat(nearest.lat), parseFloat(nearest.lon));
    
    for (const station of stations) {
      const distance = calculateDistance(lat, lon, parseFloat(station.lat), parseFloat(station.lon));
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }
    
    console.log(`Nearest station: ${nearest.name} (${minDistance.toFixed(1)}km away)`);
    return nearest;
  }
}
