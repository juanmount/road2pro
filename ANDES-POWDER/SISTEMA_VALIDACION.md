# SISTEMA DE VALIDACIÓN AUTOMÁTICA - ANDES POWDER

## 🎯 OBJETIVO

Comparar automáticamente los pronósticos de Andes Powder contra competidores (tiempodesur.com, Mountain-Forecast.com) y trackear accuracy para demostrar superioridad durante Season 0.

---

## 🏗️ ARQUITECTURA

### 1. Base de Datos

**Tabla: `forecast_validations`**
- Almacena comparaciones de pronósticos
- Campos para Andes Powder, tiempodesur, Mountain-Forecast
- Campos para condiciones reales (post-evento)
- Métricas de accuracy calculadas

**Tabla: `validation_summary`**
- Estadísticas agregadas por resort y período
- Promedios de accuracy
- Conteo de "victorias" por fuente

### 2. Servicio de Validación (`validation-service.ts`)

**Funciones principales:**

- `fetchAndesPowderForecast()` - Obtiene pronóstico propio
- `fetchTiempodesurForecast()` - Scraping de tiempodesur.com
- `fetchMountainForecast()` - Scraping de Mountain-Forecast.com
- `createComparison()` - Guarda comparación en DB
- `validateComparison()` - Valida con condiciones reales
- `runWeeklyComparison()` - Ejecuta comparación semanal automática

### 3. API Endpoints (`/api/validation`)

- `GET /api/validation/statistics` - Ver estadísticas
- `POST /api/validation/compare` - Trigger comparación manual
- `POST /api/validation/:id/validate` - Validar con datos reales

---

## 📊 FLUJO DE TRABAJO

### FASE 1: CAPTURA DE PRONÓSTICOS (Automática)

**Frecuencia:** Lunes de cada semana

**Proceso:**
1. Sistema ejecuta `runWeeklyComparison()`
2. Para cada resort (Catedral, Chapelco, Bayo, Castor):
   - Fetch pronóstico Andes Powder (próximos 3 días)
   - Scrape tiempodesur.com
   - Scrape Mountain-Forecast.com
3. Guarda comparación en `forecast_validations`

**Datos capturados:**
- Nevadas (base/mid/summit)
- Viento
- Temperatura
- Freezing level
- Storm Crossing score (solo Andes Powder)

### FASE 2: VALIDACIÓN POST-EVENTO (Manual por ahora)

**Frecuencia:** Después de cada evento de nieve

**Proceso:**
1. Observar condiciones reales:
   - Webcams de resorts
   - Reportes de @greenguru.bariloche
   - Reportes oficiales de resorts
   - Observaciones directas
2. Llamar API: `POST /api/validation/:id/validate`
   ```json
   {
     "actualSnowfallBase": 8,
     "actualSnowfallSummit": 15,
     "actualWind": 25,
     "actualTemp": -2,
     "actualSource": "webcam + greenguru",
     "actualNotes": "Nieve visible en cumbre, lluvia en base"
   }
   ```
3. Sistema calcula accuracy automáticamente
4. Determina "ganador" (quién fue más preciso)
5. Actualiza estadísticas agregadas

### FASE 3: ANÁLISIS (Consulta)

**Endpoint:** `GET /api/validation/statistics?resortId=xxx&periodStart=2026-06-01&periodEnd=2026-08-31`

**Respuesta:**
```json
{
  "resort_name": "Cerro Catedral",
  "period_start": "2026-06-01",
  "period_end": "2026-08-31",
  "ap_total_forecasts": 24,
  "ap_avg_snowfall_accuracy": 87.3,
  "ap_wins": 18,
  "ts_total_forecasts": 24,
  "ts_avg_snowfall_accuracy": 72.1,
  "ts_wins": 4,
  "mf_total_forecasts": 24,
  "mf_avg_snowfall_accuracy": 68.5,
  "mf_wins": 2
}
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### Scraping (Pendiente de completar)

**tiempodesur.com:**
- URL: `https://tiempodesur.com/nieve/cerro-catedral.html`
- Parsear HTML para extraer:
  - Precipitación diaria (mm)
  - Isoterma 0°C
- Librería: cheerio

**Mountain-Forecast.com:**
- URL: `https://www.mountain-forecast.com/peaks/Cerro-Catedral/forecasts/2405`
- Parsear tabla de pronóstico
- Extraer nevadas, viento, temp por elevación

**Nota:** Los scrapers están estructurados pero requieren implementar el parsing específico del HTML de cada sitio.

### Cálculo de Accuracy

**Fórmula:**
```
accuracy = max(0, 100 - (|forecast - actual| / actual * 100))
```

**Ejemplo:**
- Pronóstico: 10cm
- Real: 12cm
- Error: 2cm / 12cm = 16.7%
- Accuracy: 100 - 16.7 = 83.3%

### Determinación de Ganador

Basado en **snowfall accuracy** (métrica más importante):
- Compara accuracy de Andes Powder vs tiempodesur vs Mountain-Forecast
- El de mayor accuracy gana
- Se guarda en campo `winner`

---

## 📅 CRONOGRAMA SEASON 0

### Setup Inicial (Semana 1)
- [x] Crear schema de DB
- [x] Crear validation service
- [x] Crear API endpoints
- [ ] Completar scrapers de tiempodesur
- [ ] Completar scrapers de Mountain-Forecast
- [ ] Testear flujo completo

### Operación Semanal (Junio-Octubre 2026)

**Lunes:**
- Sistema ejecuta comparación automática
- Captura pronósticos para próximos 3 días

**Miércoles-Domingo:**
- Eventos de nieve ocurren

**Lunes siguiente:**
- Validar manualmente con datos reales
- Revisar estadísticas
- Documentar casos de éxito

### Fin de Season 0 (Octubre 2026)
- Generar reporte final de accuracy
- Comparar Andes Powder vs competidores
- Usar datos para marketing Season 1

---

## 💰 COSTOS

**Storage DB:**
- ~100 comparaciones/mes × 3 meses = 300 registros
- Tamaño estimado: <1MB
- **Costo:** Despreciable (dentro de free tier Supabase)

**API Calls:**
- Scraping: ~12 requests/semana (4 resorts × 3 fuentes)
- **Costo:** $0 (solo bandwidth)

**Total:** **~$0/mes** (dentro de free tiers)

---

## 📈 MÉTRICAS DE ÉXITO

### Objetivo Season 0:

**Demostrar superioridad:**
- Andes Powder accuracy > 80%
- tiempodesur accuracy < 75%
- Mountain-Forecast accuracy < 70%
- Andes Powder gana >60% de comparaciones

### Casos de Éxito a Documentar:

**Ejemplo:**
```
Tormenta 15 Junio 2026 - Cerro Catedral

Pronósticos:
- tiempodesur: 25cm (optimista)
- Mountain-Forecast: 22cm (optimista)
- Andes Powder: 12cm (conservador)

Real: 14cm en cumbre

Accuracy:
- Andes Powder: 85.7% ✅ GANADOR
- tiempodesur: 44.0%
- Mountain-Forecast: 36.4%

Razón: Storm Crossing Engine detectó rain shadow,
Snow Reality Engine ajustó por viento y rain contamination
```

---

## 🚀 PRÓXIMOS PASOS

### Inmediato (Esta semana):
1. Completar scrapers de tiempodesur y Mountain-Forecast
2. Testear flujo completo con datos de prueba
3. Ejecutar primera comparación real

### Corto plazo (Próximas 2 semanas):
4. Automatizar validación post-evento (webhook de webcams?)
5. Crear dashboard simple para visualizar estadísticas
6. Setup cron job para comparación semanal automática

### Mediano plazo (Season 0):
7. Acumular datos de validación
8. Refinar scrapers si cambian estructuras HTML
9. Documentar casos de éxito para marketing

### Largo plazo (Post Season 0):
10. Dashboard público de accuracy
11. Integrar estadísticas en app (mostrar a usuarios)
12. Usar para justificar premium en Season 1

---

## 🔍 DEBUGGING & MONITORING

### Logs importantes:
```
[VALIDATION] Starting weekly forecast comparison...
[VALIDATION] Comparing forecasts for Cerro Catedral, 1 days ahead
[VALIDATION] Created comparison: abc-123-def
[VALIDATION] Validated comparison abc-123-def, winner: andes_powder
[VALIDATION] Updated summary for resort xyz-456
```

### Comandos útiles:

**Trigger comparación manual:**
```bash
curl -X POST http://localhost:3000/api/validation/compare
```

**Ver estadísticas:**
```bash
curl http://localhost:3000/api/validation/statistics?resortId=xxx
```

**Validar comparación:**
```bash
curl -X POST http://localhost:3000/api/validation/abc-123/validate \
  -H "Content-Type: application/json" \
  -d '{"actualSnowfallSummit": 15, "actualSource": "webcam"}'
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Schema de DB creado
- [x] Servicio de validación estructurado
- [x] API endpoints creados
- [ ] Scrapers completados y testeados
- [ ] Flujo completo testeado
- [ ] Cron job configurado
- [ ] Primera comparación real ejecutada
- [ ] Primera validación completada
- [ ] Dashboard de estadísticas (opcional)

---

**Última actualización:** 21 Abril 2026  
**Status:** En desarrollo - Estructura completa, scrapers pendientes  
**Próximo milestone:** Completar scrapers y ejecutar primera comparación
