# Plan de Integración con Estaciones Meteorológicas

## Objetivo
Conectar Andes Powder con estaciones meteorológicas reales para aprendizaje automático y mejora continua de precisión.

---

## 🎯 Prioridad 1: Cerro Catedral (Estación Local)

### Información de Contacto
**Resort:** Cerro Catedral
**Ubicación:** San Carlos de Bariloche, Río Negro, Argentina
**Website:** https://catedralaltapatagonia.com/

### Datos Necesarios
- ✅ Temperatura (base, mid, summit)
- ✅ Precipitación (mm/hora)
- ✅ Nieve acumulada (cm)
- ✅ Viento (velocidad y ráfagas)
- ⚠️ Humedad (opcional)
- ⚠️ Presión (opcional)

### Pasos de Implementación

#### 1. Contacto Inicial
```
Contactar:
- Departamento de Operaciones
- Departamento de Marketing/Comunicaciones
- Patrulla de Ski

Preguntar:
- ¿Tienen estación meteorológica?
- ¿Datos disponibles públicamente?
- ¿API o feed de datos?
- ¿Formato de datos? (JSON, CSV, XML)
- ¿Frecuencia de actualización?
```

#### 2. Opciones de Acceso

**Opción A: API Directa** (Ideal)
```
GET https://catedral.com/api/weather/current
Response:
{
  "timestamp": "2026-03-14T15:00:00Z",
  "base": {
    "temperature": 8.5,
    "precipitation_1h": 2.3,
    "wind_speed": 12
  },
  "mid": {...},
  "summit": {...}
}
```

**Opción B: Página Web Scraping** (Si no hay API)
```typescript
// Scraper para página pública
- Parsear HTML de página de condiciones
- Extraer datos cada hora
- Validar y limpiar datos
```

**Opción C: Email/FTP Automático**
```
- Recibir archivo CSV cada hora
- Procesar automáticamente
- Importar a sistema de observaciones
```

#### 3. Implementación Técnica

**Servicio de Integración:**
```typescript
// backend/src/services/catedral-weather-service.ts

class CatedralWeatherService {
  async fetchCurrentConditions(): Promise<WeatherData> {
    // Conectar a API/scraper
    // Parsear datos
    // Validar
    return data;
  }
  
  async syncToObservations(): Promise<void> {
    const data = await this.fetchCurrentConditions();
    
    // Registrar automáticamente en sistema de observaciones
    await observationService.recordObservation({
      resortSlug: 'cerro-catedral',
      observationType: 'temperature',
      value: data.base.temperature,
      elevationBand: 'base',
      observedAt: data.timestamp
    });
    
    // Repetir para mid, summit, precipitación, etc.
  }
}
```

**Cron Job:**
```typescript
// Ejecutar cada hora
schedule.scheduleJob('0 * * * *', async () => {
  await catedralWeatherService.syncToObservations();
  console.log('✓ Synced Catedral weather data');
});
```

---

## 🎯 Prioridad 2: SMN Argentina (Backup/Complemento)

### API Pública
**Endpoint:** https://ws.smn.gob.ar/map_items/weather
**Documentación:** https://www.smn.gob.ar/descarga-de-datos

### Estación Más Cercana
**Bariloche Aeropuerto**
- Código: 87715
- Distancia: ~20km de Catedral
- Elevación: ~840m

### Implementación

```typescript
// backend/src/services/smn-weather-service.ts

class SMNWeatherService {
  private readonly BARILOCHE_STATION = '87715';
  
  async fetchStationData(stationId: string): Promise<SMNData> {
    const response = await axios.get(
      `https://ws.smn.gob.ar/map_items/weather/station/${stationId}`
    );
    
    return {
      temperature: response.data.temp,
      precipitation: response.data.precip,
      wind: response.data.wind_speed,
      timestamp: response.data.datetime
    };
  }
  
  async syncToObservations(): Promise<void> {
    const data = await this.fetchStationData(this.BARILOCHE_STATION);
    
    // Ajustar por diferencia de elevación
    const adjustedTemp = this.adjustForElevation(
      data.temperature,
      840,  // Elevación aeropuerto
      1600  // Elevación mid Catedral
    );
    
    await observationService.recordObservation({
      resortSlug: 'cerro-catedral',
      observationType: 'temperature',
      value: adjustedTemp,
      elevationBand: 'mid',
      observedAt: data.timestamp,
      source: 'SMN-Bariloche',
      notes: 'Adjusted from airport elevation'
    });
  }
  
  private adjustForElevation(
    temp: number,
    fromElevation: number,
    toElevation: number
  ): number {
    // Lapse rate: ~6.5°C per 1000m
    const elevationDiff = toElevation - fromElevation;
    const tempAdjustment = (elevationDiff / 1000) * -6.5;
    return temp + tempAdjustment;
  }
}
```

---

## 🎯 Prioridad 3: Weather Underground

### API
**Endpoint:** https://api.weather.com/v2/pws/observations/current
**Costo:** Gratis hasta 500 llamadas/día

### Estaciones en Bariloche
```
Buscar estaciones cercanas:
- IRNEGRO### (múltiples estaciones amateur)
- Filtrar por distancia < 30km
- Validar calidad de datos
```

### Implementación
```typescript
class WeatherUndergroundService {
  async findNearbyStations(lat: number, lon: number): Promise<Station[]> {
    // Buscar estaciones en radio de 30km
  }
  
  async fetchBestStation(): Promise<WeatherData> {
    const stations = await this.findNearbyStations(-41.15, -71.4);
    
    // Ordenar por:
    // 1. Distancia
    // 2. Elevación similar
    // 3. Calidad de datos históricos
    
    return this.fetchStationData(stations[0].id);
  }
}
```

---

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────┐
│     Fuentes de Datos Reales             │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   Catedral   │  │  SMN Bariloche│   │
│  │   Station    │  │   (Backup)    │   │
│  └──────┬───────┘  └──────┬────────┘   │
│         │                  │            │
│         └────────┬─────────┘            │
│                  ▼                      │
│         ┌────────────────┐              │
│         │  Data Sync     │              │
│         │  Service       │              │
│         │  (Hourly)      │              │
│         └────────┬───────┘              │
│                  ▼                      │
│         ┌────────────────┐              │
│         │  Observation   │              │
│         │  Service       │              │
│         └────────┬───────┘              │
│                  ▼                      │
│         ┌────────────────┐              │
│         │  Auto-Learning │              │
│         │  & Calibration │              │
│         └────────┬───────┘              │
│                  ▼                      │
│         ┌────────────────┐              │
│         │  Updated       │              │
│         │  Correction    │              │
│         │  Factors       │              │
│         └────────────────┘              │
└─────────────────────────────────────────┘
```

---

## 🔧 Implementación Paso a Paso

### Fase 1: Investigación (1 semana)
- [ ] Contactar Cerro Catedral
- [ ] Verificar acceso a datos
- [ ] Documentar formato de datos
- [ ] Probar SMN API

### Fase 2: Desarrollo (2 semanas)
- [ ] Crear `CatedralWeatherService`
- [ ] Crear `SMNWeatherService`
- [ ] Implementar validación de datos
- [ ] Crear cron jobs
- [ ] Testing

### Fase 3: Integración (1 semana)
- [ ] Conectar con `ObservationService`
- [ ] Configurar sincronización horaria
- [ ] Monitoreo y alertas
- [ ] Validación de calidad

### Fase 4: Validación (Continuo)
- [ ] Comparar forecasts vs observaciones
- [ ] Ajustar factores automáticamente
- [ ] Monitorear mejora de precisión
- [ ] Iterar

---

## 📈 Métricas de Éxito

### Corto Plazo (1 mes)
- ✅ Conexión establecida con al menos 1 fuente
- ✅ Datos sincronizados cada hora
- ✅ 100+ observaciones registradas

### Mediano Plazo (3 meses)
- ✅ Precisión mejorada >20%
- ✅ Factores de corrección estabilizados
- ✅ Sistema funcionando 24/7

### Largo Plazo (6 meses)
- ✅ Precisión comparable a Snow-Forecast
- ✅ Múltiples fuentes de datos
- ✅ Aprendizaje automático robusto

---

## 💰 Costos Estimados

### Opción 1: Catedral Station (Ideal)
- **Costo:** $0 - $500/mes (depende de acuerdo)
- **Precisión:** ⭐⭐⭐⭐⭐
- **Confiabilidad:** ⭐⭐⭐⭐⭐

### Opción 2: SMN + Weather Underground
- **Costo:** $0 (APIs públicas)
- **Precisión:** ⭐⭐⭐⭐
- **Confiabilidad:** ⭐⭐⭐⭐

### Opción 3: Scraping Snow-Forecast
- **Costo:** $0
- **Precisión:** ⭐⭐⭐⭐⭐
- **Confiabilidad:** ⭐⭐ (puede romper)
- **Legal:** ⚠️ Zona gris

---

## 🎯 Recomendación

**Estrategia Multi-Fuente:**
1. **Primario:** Catedral Station (si disponible)
2. **Secundario:** SMN Bariloche (siempre disponible)
3. **Terciario:** Weather Underground (validación)

**Beneficios:**
- Redundancia (si una falla, otras funcionan)
- Validación cruzada
- Mejor cobertura geográfica

---

## 📝 Próximos Pasos Inmediatos

1. **Esta semana:**
   - Contactar Cerro Catedral
   - Probar SMN API
   - Crear prototipo de integración

2. **Próxima semana:**
   - Implementar servicio de sincronización
   - Configurar cron jobs
   - Testing inicial

3. **Mes 1:**
   - Sistema funcionando 24/7
   - Recolectando datos automáticamente
   - Aprendiendo y mejorando

---

**¿Quieres que empiece con la integración de SMN Argentina mientras investigamos Catedral?**
