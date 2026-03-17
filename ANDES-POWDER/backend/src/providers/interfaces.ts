/**
 * Provider Abstraction Layer
 * Defines interfaces for weather forecast providers
 */

import { Resort, NormalizedForecast, ModelName, ProviderName } from '../domain/models';

/**
 * Options for fetching forecasts
 */
export interface FetchOptions {
  models?: ModelName[];
  includeEnsemble?: boolean;
  maxHorizonHours?: number;
  variables?: string[];
}

/**
 * Model metadata
 */
export interface ModelMetadata {
  name: ModelName;
  provider: ProviderName;
  resolution: string;
  updateFrequency: string;
  maxHorizon: string;
  variables: string[];
}

/**
 * Raw forecast data from provider (before normalization)
 */
export interface RawForecastData {
  provider: ProviderName;
  model: ModelName;
  fetchedAt: Date;
  data: any; // Provider-specific format
}

/**
 * Main provider interface
 * All forecast providers must implement this
 */
export interface ForecastProvider {
  readonly name: ProviderName;
  readonly models: ModelName[];
  
  /**
   * Fetch raw forecast data from provider
   */
  fetchForecast(
    resort: Resort,
    timeRange: { start: Date; end: Date },
    options?: FetchOptions
  ): Promise<RawForecastData>;
  
  /**
   * Normalize provider-specific format to internal format
   */
  normalizeForecast(
    raw: RawForecastData,
    resort: Resort
  ): Promise<NormalizedForecast>;
  
  /**
   * Get metadata about available models
   */
  getModelMetadata(): ModelMetadata[];
  
  /**
   * Check if provider is available
   */
  checkAvailability(): Promise<boolean>;
}

/**
 * Provider registry for managing multiple providers
 */
export interface ProviderRegistry {
  register(provider: ForecastProvider): void;
  getProvider(name: ProviderName): ForecastProvider | undefined;
  getAllProviders(): ForecastProvider[];
  getProviderForModel(model: ModelName): ForecastProvider | undefined;
}
