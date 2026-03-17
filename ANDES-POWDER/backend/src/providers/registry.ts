/**
 * Provider Registry Implementation
 */

import { ForecastProvider, ProviderRegistry } from './interfaces';
import { ProviderName, ModelName } from '../domain/models';

export class DefaultProviderRegistry implements ProviderRegistry {
  private providers: Map<ProviderName, ForecastProvider> = new Map();
  
  register(provider: ForecastProvider): void {
    this.providers.set(provider.name, provider);
    console.log(`✓ Registered forecast provider: ${provider.name}`);
  }
  
  getProvider(name: ProviderName): ForecastProvider | undefined {
    return this.providers.get(name);
  }
  
  getAllProviders(): ForecastProvider[] {
    return Array.from(this.providers.values());
  }
  
  getProviderForModel(model: ModelName): ForecastProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.models.includes(model)) {
        return provider;
      }
    }
    return undefined;
  }
}

// Singleton instance
export const providerRegistry = new DefaultProviderRegistry();
