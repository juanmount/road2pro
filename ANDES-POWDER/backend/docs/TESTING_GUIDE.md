# Guía de Testing Local - ForecastRunHistory

**Fecha:** 20 Mayo 2026
**Objetivo:** Validar que la feature funciona correctamente antes de deploy

---

## 🎯 PREREQUISITOS

```bash
cd /Users/juanomountford/ANDES-POWDER/backend

# Verificar que compiló correctamente
npm run build

# Debe completar sin errores
```

---

## 📋 TEST 1: Feature OFF (Comportamiento Actual)

### Objetivo
Verificar que con feature flag OFF, el sistema funciona exactamente igual que antes.

### Pasos

1. **Configurar variables de entorno:**
```bash
# Crear o editar .env
echo "USE_FORECAST_HISTORY=false" >> .env
echo "USE_T850=false" >> .env
```

2. **Arrancar servidor:**
```bash
npm run dev
```

3. **Verificar logs de startup:**
```
Buscar en la consola:
✅ [Features] Feature flags status:
✅   - USE_FORECAST_HISTORY: false
✅   - USE_T850: false
```

4. **Probar endpoint de forecast:**

En otra terminal:
```bash
curl http://localhost:3000/api/resorts/cerro-catedral/forecast | jq '.daily[0]'
```

5. **Verificar logs del servidor:**
```
❌ NO debe aparecer: "[StormCrossing] ForecastHistory trend"
✅ Debe funcionar normalmente
✅ Storm Crossing debe usar código legacy (score ~70)
```

### Resultado Esperado
- ✅ Servidor arranca sin errores
- ✅ Feature flags muestran `false`
- ✅ Endpoints responden normalmente
- ✅ NO hay logs de ForecastHistory
- ✅ Comportamiento idéntico a versión anterior

---

## 📋 TEST 2: Feature ON (Nuevo Comportamiento)

### Objetivo
Verificar que con feature flag ON, el sistema usa el nuevo servicio de historial.

### Pasos

1. **Detener servidor anterior:**
```bash
# Presionar CTRL+C en la terminal del servidor
```

2. **Cambiar variables de entorno:**
```bash
# Editar .env
USE_FORECAST_HISTORY=true
USE_T850=false
```

3. **Arrancar servidor nuevamente:**
```bash
npm run dev
```

4. **Verificar logs de startup:**
```
Buscar en la consola:
✅ [Features] Feature flags status:
✅   - USE_FORECAST_HISTORY: true
✅   - USE_T850: false
```

5. **Probar endpoint de forecast:**
```bash
curl http://localhost:3000/api/resorts/cerro-catedral/forecast | jq '.daily[0]'
```

6. **Verificar logs del servidor:**

**Caso A: Historial suficiente (≥3 corridas)**
```
✅ [StormCrossing] ForecastHistory trend for Cerro Catedral: {
  trend: 'strengthening',
  score: 85,
  confidence: 'high',
  explanation: 'Sistema fortaleciéndose: +35% en últimas corridas'
}
```

**Caso B: Historial insuficiente (<3 corridas)**
```
⚠️ [ForecastHistory] Historial insuficiente (menos de 3 corridas)
✅ Usa valor por defecto (score 50)
✅ Sistema sigue funcionando normalmente
```

**Caso C: Error en servicio**
```
⚠️ [StormCrossing] Error using ForecastHistory, falling back to legacy
✅ Usa código legacy (score 70)
✅ Sistema sigue funcionando normalmente
```

### Resultado Esperado
- ✅ Servidor arranca sin errores
- ✅ Feature flags muestran `true`
- ✅ Endpoints responden normalmente
- ✅ Logs muestran uso de ForecastHistory
- ✅ Si falla, fallback a código legacy funciona

---

## 📋 TEST 3: Comparación de Resultados

### Objetivo
Comparar Storm Crossing scores entre feature OFF y ON.

### Pasos

1. **Con Feature OFF:**
```bash
curl http://localhost:3000/api/resorts/cerro-catedral/storm-crossing \
  | jq '.hourly[0].score'

# Anotar el score (debería ser ~70 si no hay historial)
```

2. **Con Feature ON:**
```bash
# Cambiar USE_FORECAST_HISTORY=true
# Reiniciar servidor
curl http://localhost:3000/api/resorts/cerro-catedral/storm-crossing \
  | jq '.hourly[0].score'

# Anotar el score (puede variar de 20-100 según tendencia)
```

3. **Comparar:**
```
Feature OFF: Score = 70 (placeholder)
Feature ON:  Score = 20-100 (basado en tendencia real)

Diferencia esperada: ±20 puntos
```

### Resultado Esperado
- ✅ Scores son diferentes entre OFF y ON
- ✅ Con ON, score refleja tendencia real del modelo
- ✅ Ambos modos funcionan sin errores

---

## 📋 TEST 4: Verificar Fallback

### Objetivo
Simular un error y verificar que el fallback funciona.

### Pasos

1. **Con Feature ON, simular error en DB:**

Opción A: Desconectar DB temporalmente
```bash
# En otra terminal, detener PostgreSQL
# O cambiar DATABASE_URL a una URL inválida
```

Opción B: Renombrar tabla temporalmente
```sql
-- En psql
ALTER TABLE forecast_runs RENAME TO forecast_runs_backup;
```

2. **Probar endpoint:**
```bash
curl http://localhost:3000/api/resorts/cerro-catedral/forecast
```

3. **Verificar logs:**
```
✅ [StormCrossing] Error using ForecastHistory, falling back to legacy
✅ Endpoint responde con código 200
✅ Storm Crossing usa score legacy (70)
```

4. **Restaurar DB:**
```sql
-- En psql
ALTER TABLE forecast_runs_backup RENAME TO forecast_runs;
```

### Resultado Esperado
- ✅ Error es capturado correctamente
- ✅ Fallback a código legacy funciona
- ✅ Endpoint NO devuelve error 500
- ✅ Sistema sigue funcionando

---

## 📋 TEST 5: Verificar Historial Acumulado

### Objetivo
Verificar que el historial se está guardando correctamente en DB.

### Pasos

1. **Consultar tabla forecast_runs:**
```sql
-- En psql
SELECT 
  resort_id,
  model_name,
  issued_at,
  fetch_status
FROM forecast_runs
WHERE resort_id = (SELECT id FROM resorts WHERE slug = 'cerro-catedral')
ORDER BY issued_at DESC
LIMIT 10;
```

2. **Verificar datos:**
```
✅ Debe haber registros con fetch_status = 'success'
✅ Debe haber múltiples corridas por modelo (ecmwf-ifs, gfs, gem)
✅ issued_at debe tener timestamps recientes
```

3. **Contar corridas por modelo:**
```sql
SELECT 
  model_name,
  COUNT(*) as num_runs
FROM forecast_runs
WHERE resort_id = (SELECT id FROM resorts WHERE slug = 'cerro-catedral')
  AND fetch_status = 'success'
  AND issued_at > NOW() - INTERVAL '48 hours'
GROUP BY model_name;
```

### Resultado Esperado
- ✅ Hay registros en forecast_runs
- ✅ Múltiples corridas por modelo
- ✅ Datos recientes (últimas 48h)

---

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module 'forecast-history-service'"
**Solución:**
```bash
npm run build
```

### Error: "pool.query is not a function"
**Solución:** Verificar import en forecast-history-service.ts
```typescript
import pool from '../config/database'; // ✅ Correcto
import { pool } from '../config/database'; // ❌ Incorrecto
```

### Warning: "Historial insuficiente"
**Causa:** Menos de 3 corridas en DB
**Solución:** Esperar 12-18 horas para acumular historial
**Impacto:** Ninguno (usa valor por defecto)

### Error: "Error using ForecastHistory"
**Causa:** Problema con DB o query
**Solución:** 
1. Verificar que PostgreSQL está corriendo
2. Verificar DATABASE_URL en .env
3. Verificar que tabla forecast_runs existe
**Impacto:** Ninguno (fallback a código legacy)

### Servidor no arranca
**Solución:**
```bash
# Verificar puerto 3000 no está ocupado
lsof -ti:3000 | xargs kill -9

# Verificar .env tiene variables correctas
cat .env | grep USE_FORECAST_HISTORY

# Verificar compilación
npm run build
```

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de considerar el testing completo:

- [ ] Test 1 completado: Feature OFF funciona
- [ ] Test 2 completado: Feature ON funciona
- [ ] Test 3 completado: Scores son diferentes
- [ ] Test 4 completado: Fallback funciona
- [ ] Test 5 completado: Historial se guarda en DB
- [ ] Sin errores 500 en ningún test
- [ ] Logs muestran feature flags correctamente
- [ ] Endpoints responden en < 2 segundos

---

## 📊 LOGS ESPERADOS

### Startup Exitoso
```
🏔️  Andes Powder API running on port 3000
[Features] Feature flags status:
  - USE_FORECAST_HISTORY: true
  - USE_T850: false
⏰ Weather sync scheduler started
📊 Forecast cron service started
📸 Snapshot system initialized
🚨 SMN Alerts system initialized
🔔 Smart notification scanner initialized
```

### Feature Funcionando
```
[StormCrossing] ForecastHistory trend for Cerro Catedral: {
  trend: 'strengthening',
  score: 85,
  confidence: 'high',
  explanation: 'Sistema fortaleciéndose: +35% en últimas corridas'
}
```

### Feature con Fallback
```
[ForecastHistory] Historial insuficiente (menos de 3 corridas)
[StormCrossing] Using default persistence score: 50
```

---

## 🎯 CRITERIOS DE ÉXITO

El testing es exitoso si:

1. ✅ **Compilación:** Sin errores TypeScript
2. ✅ **Feature OFF:** Funciona igual que antes
3. ✅ **Feature ON:** Usa nuevo servicio correctamente
4. ✅ **Fallback:** Funciona si hay error
5. ✅ **Performance:** Tiempo de respuesta < 2 seg
6. ✅ **Estabilidad:** Sin errores 500
7. ✅ **Logs:** Claros y útiles para debugging

---

## 📞 SIGUIENTE PASO

Una vez completado el testing local exitosamente:

**Opción A: Deploy a Railway con feature OFF**
```bash
git add .
git commit -m "feat: Add ForecastRunHistory service with feature flag"
git push origin main

# En Railway: NO agregar USE_FORECAST_HISTORY todavía
```

**Opción B: Más testing local**
- Dejar corriendo 24h para acumular historial
- Validar con diferentes resorts
- Comparar con observaciones reales

---

**Tiempo estimado de testing:** 30-60 minutos
**Riesgo:** BAJO (múltiples capas de seguridad)
