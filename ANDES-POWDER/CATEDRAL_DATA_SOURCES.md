# Fuentes de Datos de Cerro Catedral

## 📊 Hallazgos de Investigación Web

### 1. **Sistema de Parte de Nieve Oficial** ✅ ENCONTRADO

**URL:** https://catedralaltapatagonia.com/parte-de-nieve/

**Tecnología:**
- Widget JavaScript dinámico
- Servidor: `serviciosca.skipasscatedral.com`
- Archivo: `_partenieve/index-BFk0J-ro.js`

**Datos Disponibles (según código JavaScript):**
- ✅ Estado de medios de elevación (telesillas, telecabinas)
- ✅ Estado de pistas (abiertas/cerradas)
- ✅ Áreas especiales y paradores
- ✅ Clima actual
- ✅ Estado de ruta de acceso
- ✅ Horarios de medios
- ✅ Última actualización (timestamp)
- ✅ Sectores por elevación

**Estructura de Datos (inferida del código):**
```javascript
{
  TextoPrincipal: "...",  // Mensaje principal
  climas: [...],          // Datos climáticos
  estadoRuta: [...],      // Estado de acceso
  sectores: [...],        // Sectores de montaña
  Medios: [...],          // Medios de elevación
  Pistas: [...],          // Estado de pistas
  Areas: [...],           // Áreas recreativas
  Paradores: [...]        // Paradores/refugios
}
```

---

## 🎯 Opciones de Integración

### Opción A: **Scraping del Widget** (Factible)
**Ventajas:**
- Datos públicos ya disponibles
- Actualizados en tiempo real
- No requiere autorización

**Desventajas:**
- Puede cambiar sin aviso
- Requiere parsear JavaScript
- No es API oficial

**Implementación:**
```typescript
// Cargar página con puppeteer o similar
// Ejecutar JavaScript
// Extraer datos del DOM
// Parsear y guardar
```

### Opción B: **Reverse Engineering de API** (Posible)
**Investigar:**
- Endpoints que usa el widget
- Formato de respuesta
- Frecuencia de actualización

**Acción:**
- Monitorear network requests del widget
- Identificar API endpoints
- Documentar estructura

### Opción C: **Contacto Oficial** (Recomendado a largo plazo)
**Beneficios:**
- Acceso oficial y estable
- Posible acceso a más datos
- Relación comercial

---

## 📍 Otras Fuentes Identificadas

### 2. **Snow-Forecast.com**
**URL:** https://www.snow-forecast.com/resorts/Catedral

**Datos:**
- Pronóstico de nieve 6 días
- Condiciones actuales
- Webcams
- Reportes de usuarios

**Nota:** Ya usamos esto como referencia de comparación

### 3. **Bariloche Ski Class**
**URL:** https://www.barilocheskiclass.com.ar/clima.htm

**Datos:**
- Webcam en vivo
- Pronóstico Snow-Forecast embebido
- Condiciones actuales

**Utilidad:** Webcam para validación visual

### 4. **OnTheSnow**
**URL:** https://www.onthesnow.com/argentina/cerro-catedral-alta-patagonia

**Datos:**
- Webcams múltiples
- Snow report
- Condiciones

---

## 🔧 Plan de Implementación Sugerido

### Fase 1: **Investigación Técnica** (1-2 días)
1. Analizar network requests del widget de Catedral
2. Identificar endpoints de API
3. Documentar estructura de datos
4. Verificar frecuencia de actualización

### Fase 2: **Prototipo de Scraper** (2-3 días)
1. Crear servicio de scraping
2. Parsear datos relevantes (temperatura, nieve, viento)
3. Integrar con sistema de observaciones
4. Testing y validación

### Fase 3: **Integración Automática** (1 día)
1. Agregar a scheduler (cada hora)
2. Guardar observaciones automáticamente
3. Monitoreo de errores

### Fase 4: **Contacto Oficial** (Paralelo)
1. Email a administración
2. Solicitar acceso oficial a datos
3. Negociar términos si es necesario

---

## 📊 Datos Meteorológicos Específicos Necesarios

**Prioridad Alta:**
- ✅ Temperatura (por elevación si disponible)
- ✅ Nieve acumulada (últimas 24h, 48h, 7 días)
- ✅ Precipitación actual
- ✅ Viento (velocidad y dirección)

**Prioridad Media:**
- ⚠️ Humedad
- ⚠️ Presión atmosférica
- ⚠️ Visibilidad
- ⚠️ Nivel de congelamiento

**Prioridad Baja:**
- ℹ️ Calidad de nieve
- ℹ️ Riesgo de avalancha
- ℹ️ Condiciones de pistas

---

## 🎯 Recomendación Inmediata

**Acción 1:** Investigar endpoints del widget
```bash
# Abrir DevTools en navegador
# Ir a: https://catedralaltapatagonia.com/parte-de-nieve/
# Network tab
# Buscar requests a serviciosca.skipasscatedral.com
# Documentar endpoints y respuestas
```

**Acción 2:** Mientras tanto, mantener SMN Argentina
- Ya está funcionando ✅
- Datos cada hora ✅
- Backup confiable ✅

**Acción 3:** Preparar email para Catedral
- Explicar proyecto
- Solicitar acceso a datos
- Ofrecer colaboración

---

## 📝 Estado Actual

**Fuentes Activas:**
- ✅ SMN Argentina (Bariloche, 8.9km)
- ✅ Open-Meteo GFS (modelo global)

**Fuentes Potenciales:**
- 🔍 Catedral Widget (investigación en curso)
- ⏳ INTA Bariloche (por verificar)
- ⏳ Weather Underground (API disponible)

**Precisión Actual:**
- Temperatura: ⭐⭐⭐⭐ (SMN + ajuste elevación)
- Precipitación: ⭐⭐⭐ (GFS + factor 1.3)
- Nieve: ⭐⭐⭐ (modelo + clasificación)

**Precisión Objetivo con Catedral:**
- Temperatura: ⭐⭐⭐⭐⭐ (datos directos)
- Precipitación: ⭐⭐⭐⭐⭐ (medición real)
- Nieve: ⭐⭐⭐⭐⭐ (acumulación real)

---

## 🚀 Próximos Pasos

1. **Tú:** Revisar DevTools para encontrar endpoints del widget
2. **Yo:** Implementar scraper/integración cuando tengas endpoints
3. **Ambos:** Preparar contacto oficial con Catedral

**Tiempo estimado para integración completa:** 1 semana
