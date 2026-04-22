# FUENTES METEOROLÓGICAS BARILOCHE - ANDES POWDER

## 🎯 OBJETIVO
Identificar todas las fuentes de datos meteorológicos útiles para validar y mejorar los pronósticos de Andes Powder, con énfasis en **viento** y **condiciones de montaña**.

---

## ⭐ FUENTES PRIMARIAS (YA EN USO)

### 1. tiempodesur.com ⭐⭐⭐⭐⭐ COMPETENCIA DIRECTA
**URL:** https://tiempodesur.com/nieve/index.html
**Instagram:** @tiempodesur.patagonia
**Modelo:** GFS (Global Forecast System)
**Datos disponibles:**
- ✅ Pronósticos para centros de esquí (Catedral, Chapelco, Bayo, Perito Moreno, La Hoya)
- ✅ Precipitación diaria (8 días)
- ✅ Isoterma 0°C promedio diaria
- ✅ 4 corridas del modelo GFS (visualización de incertidumbre)
- ✅ Múltiples ubicaciones en Patagonia (Villa Catedral, etc.)

**Uso para Andes Powder:**
- **CRÍTICO** - Competencia directa local
- Benchmark principal para comparación
- Mismo público objetivo (esquiadores Patagonia)
- Validación de precisión relativa

**Ventajas de ellos:**
- Visualización de incertidumbre (4 corridas)
- Más ubicaciones cubiertas
- Presencia local establecida
- Gratuito

**TUS VENTAJAS sobre ellos:**
- Múltiples modelos (ECMWF+GFS+GEFS) vs solo GFS
- Storm Crossing Engine (único)
- Snow Reality Engine (ajustes por viento, rain, etc.)
- ENSO Integration
- Wet Bulb Temperature (más preciso)
- Pronósticos por elevación (base/mid/summit)

**Cómo usar:**
- Comparar pronósticos semanalmente
- Documentar casos donde fuiste más preciso
- Aprender de su visualización de incertidumbre
- Diferenciarte con algoritmos únicos

### 2. SMN - Servicio Meteorológico Nacional
**URL:** https://www.smn.gob.ar/
**Estación:** Bariloche Aeropuerto (87715) - 840m
**Datos disponibles:**
- ✅ Temperatura, humedad, presión
- ✅ Viento (velocidad y dirección)
- ✅ Actualización horaria (:05 minutos)
- ✅ Datos históricos

**Uso actual:**
- Base para ajustes de elevación
- Cálculo de freezing level observado
- Validación de modelos

**Limitaciones:**
- Solo aeropuerto (840m), no montaña
- Sin datos de elevaciones altas

---

## 🔍 FUENTES COMPLEMENTARIAS IDENTIFICADAS

### 2. Windy.app - Bariloche Base Cerro Catedral
**URL:** https://windy.app/forecast2/spot/109/Bariloche+-+Base+Cerro+Catedral
**Datos disponibles:**
- ✅ Pronóstico de viento específico para base Catedral
- ✅ Velocidad, dirección, ráfagas
- ✅ Basado en modelo GFS
- ✅ Actualización cada 6 horas

**Valor para Andes Powder:**
- **ALTO** - Datos específicos de montaña
- Comparar con tus ajustes de viento por elevación
- Validar multiplicadores (1.076x base, 1.304x mid, 1.504x summit)

**Cómo usar:**
- Comparar pronósticos de viento Windy.app vs tus cálculos
- Calibrar Wind Impact Engine
- Validar Lift Closure Risk

### 3. Mountain-Forecast.com - Cerro Catedral
**URL:** https://www.mountain-forecast.com/peaks/Cerro-Catedral/forecasts/2405
**Datos disponibles:**
- ✅ Pronósticos por elevación (base/mid/summit)
- ✅ Viento, temperatura, precipitación
- ✅ Freezing level
- ✅ Pronóstico 6 días

**Valor para Andes Powder:**
- **ALTO** - Competencia directa, útil para benchmark
- Comparar metodologías
- Validar tus pronósticos vs los de ellos
- Aprender de presentación de datos

**Cómo usar:**
- Comparación semanal de pronósticos
- Validar precisión relativa
- Identificar gaps en tu presentación

### 4. Ventusky - San Carlos de Bariloche
**URL:** https://www.ventusky.com/es/san-carlos-de-bariloche
**Datos disponibles:**
- ✅ Visualización de viento en tiempo real
- ✅ Mapas de precipitación
- ✅ Modelos ECMWF, GFS, ICON, GEM
- ✅ Animaciones de viento

**Valor para Andes Powder:**
- **MEDIO-ALTO** - Visualización de patrones de viento
- Identificar sistemas del Pacífico
- Validar Storm Crossing Probability
- Análisis de dirección de viento (W/NW óptimo)

**Cómo usar:**
- Monitorear tormentas del Pacífico
- Validar scoring de dirección de viento
- Análisis de sistemas sinópticos

### 5. @greenguru.bariloche (Instagram)
**URL:** https://www.instagram.com/greenguru.bariloche/
**Tipo:** Cuenta local experta
**Datos disponibles:**
- ✅ Mapas 500 hPa (ECMWF)
- ✅ Análisis de altura geopotencial
- ✅ Pronósticos de nieve con freezing level
- ✅ Análisis de viento (NW húmedo → SW seco)
- ✅ Lenguaje local: "viento blanco", "barrido NW/SW"

**Valor para Andes Powder:**
- **MUY ALTO** - Validación cruzada experta
- Conocimiento local patagónico
- Calibración de engines
- Terminología regional

**Cómo usar:**
- Comparar pronósticos regularmente
- Validar Storm Crossing Engine
- Aprender lenguaje local
- NO copiar mapas técnicos (mantener UI simple)

### 6. Kitebariloche.com
**URL:** https://kitebariloche.com
**Datos disponibles:**
- ✅ 2 cámaras en vivo (Norte y ONO)
- ✅ Radar de viento en tiempo real
- ✅ Datos de viento de lago

**Valor para Andes Powder:**
- **BAJO-MEDIO** - Enfoque en lago, no montaña
- Cámaras útiles para validación visual ocasional
- Datos de viento complementarios

**Limitaciones:**
- Sin datos de elevación
- Enfoque kitesurf, no ski

### 7. Bariloche.org/clima
**URL:** https://bariloche.org/clima/
**Datos disponibles:**
- ✅ Condiciones actuales
- ✅ Pronóstico extendido
- ✅ Temperatura, humedad, viento

**Valor para Andes Powder:**
- **BAJO** - Datos genéricos, no específicos de montaña
- Útil para referencia rápida

---

## 🌐 FUENTES GLOBALES (MODELOS)

### 8. ECMWF (European Centre for Medium-Range Weather Forecasts)
**Uso actual:** ✅ Modelo primario
**Datos:**
- Pronóstico 16 días
- Alta resolución
- Mejor para Patagonia que GFS

### 9. GFS (Global Forecast System)
**Uso actual:** ✅ Modelo secundario
**Datos:**
- Comparación con ECMWF
- Validación de acuerdo entre modelos

### 10. GEFS (Global Ensemble Forecast System)
**Uso actual:** ✅ Ensemble para incertidumbre
**Datos:**
- Spread de ensemble
- Probabilidades

---

## 📊 FUENTES POTENCIALES A INVESTIGAR

### 11. INTA Bariloche - Estación Agrometeorológica
**URL:** https://sipan.ar/unidades/?Sede=bariloche
**Potencial:**
- Datos agrometeorológicos locales
- Posible estación meteorológica propia
- Datos históricos

**Acción:** Investigar si tienen API o datos públicos

### 12. Cerro Catedral - Datos Oficiales del Resort
**Potencial:**
- Estaciones meteorológicas en pistas
- Datos de viento en cumbre
- Condiciones de nieve reales

**Acción:** Contactar resort para acceso a datos

### 13. Webcams de Resorts
**Uso actual:** ✅ Modal de webcams
**Valor:**
- Validación visual de condiciones
- Verificación de nevadas
- Condiciones de visibilidad

---

## 🎯 PRIORIDADES PARA SEASON 0

### ALTA PRIORIDAD (Implementar ya)

1. **Windy.app Catedral**
   - Comparar viento base vs tus cálculos
   - Validar multiplicadores de elevación
   - Ajustar Wind Impact Engine si necesario

2. **Mountain-Forecast.com**
   - Benchmark semanal de pronósticos
   - Comparar precisión
   - Validar metodología

3. **@greenguru.bariloche**
   - Seguimiento regular
   - Comparación de pronósticos
   - Calibración de Storm Crossing

### MEDIA PRIORIDAD (Explorar durante Season 0)

4. **Ventusky**
   - Análisis de patrones de viento
   - Validación de sistemas del Pacífico

5. **INTA Bariloche**
   - Investigar acceso a datos
   - Posible fuente de validación

6. **Cerro Catedral oficial**
   - Contactar para partnership
   - Acceso a datos de pistas

### BAJA PRIORIDAD (Post Season 0)

7. **Kitebariloche**
   - Uso ocasional de cámaras
   - Validación visual

---

## 📋 PLAN DE VALIDACIÓN SEMANAL

### Rutina sugerida para Season 0:

**Lunes:**
- Revisar pronóstico Andes Powder para la semana
- Comparar con Mountain-Forecast.com
- Revisar @greenguru.bariloche

**Miércoles:**
- Actualizar pronóstico mid-week
- Comparar viento con Windy.app
- Analizar patrones en Ventusky

**Viernes:**
- Pronóstico fin de semana
- Validación cruzada con todas las fuentes
- Preparar comparación para validación post-evento

**Domingo/Lunes:**
- Comparar pronósticos vs realidad
- Documentar aciertos/errores
- Ajustar engines si necesario

---

## 🔧 INTEGRACIONES TÉCNICAS SUGERIDAS

### Para implementar en Season 0:

1. **Script de comparación automática**
   ```
   - Fetch Andes Powder forecast
   - Fetch Mountain-Forecast.com
   - Fetch Windy.app
   - Compare snowfall, wind, temp
   - Generate diff report
   ```

2. **Dashboard de validación**
   ```
   - Pronóstico vs Realidad
   - Accuracy por variable (snow, wind, temp)
   - Comparación vs competencia
   - Gráficos de evolución
   ```

3. **Alertas de discrepancia**
   ```
   - Si diferencia >30% con Mountain-Forecast
   - Si viento difiere >15 km/h con Windy.app
   - Si @greenguru predice tormenta y nosotros no
   ```

---

## 📈 MÉTRICAS DE VALIDACIÓN

### Variables a trackear:

**Nevadas:**
- Pronóstico Andes Powder vs Real
- Pronóstico Mountain-Forecast vs Real
- % de accuracy relativa

**Viento:**
- Pronóstico base vs Windy.app
- Pronóstico cumbre vs observado
- Validación de multiplicadores

**Freezing Level:**
- Pronóstico vs observado (SMN)
- Comparación con @greenguru
- Ajustes necesarios

**Storm Crossing:**
- Probabilidad HIGH/MEDIUM/LOW
- Tasa de acierto
- Comparación con eventos reales

---

## 🎯 OBJETIVO FINAL

**Season 0:**
- Validar que tus algoritmos son más precisos que genéricos
- Documentar casos de éxito
- Ajustar engines basado en datos reales
- Construir credibilidad para Season 1

**Season 1:**
- Mostrar historial de accuracy
- "Fuimos 23% más precisos que Mountain-Forecast"
- "Predijimos correctamente 8 de 10 tormentas"
- Justificar premium con datos reales

---

## 📝 NOTAS IMPORTANTES

1. **No reinventar la rueda:** Usar fuentes existentes para validación, no competir en recolección de datos
2. **Enfoque en diferenciación:** Storm Crossing, Snow Reality, ENSO = únicos
3. **Transparencia:** Mostrar comparaciones honestas
4. **Mejora continua:** Ajustar engines basado en validación real

---

**Última actualización:** Abril 2026
**Próxima revisión:** Post Season 0
