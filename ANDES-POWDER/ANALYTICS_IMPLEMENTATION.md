# Sistema de Analytics - Andes Powder

## Implementación Completa - Fase 1

### ✅ Componentes Implementados

#### 1. **Servicio de Analytics** (`/mobile/services/analytics.ts`)
- Firebase Analytics integrado
- Eventos personalizados para Early Access
- Tracking de conversión y engagement
- User properties para segmentación

#### 2. **Hook de Engagement** (`/mobile/hooks/useUserEngagement.ts`)
- Tracking automático de actividad del usuario
- Métricas almacenadas localmente (AsyncStorage)
- Cálculo de nivel de engagement (casual/active/power_user)
- Detección de usuarios listos para conversión

#### 3. **Dashboard de Engagement** (`/mobile/components/EngagementDashboard.tsx`)
- Visualización de métricas del usuario
- Indicador de nivel de engagement
- Hint de conversión para power users

---

## Eventos Trackeados

### **Screen Views**
- `PRO_SCREEN_VIEW` - Usuario ve pantalla PRO
- `RESORT_DETAIL_VIEW` - Usuario ve detalle de cerro
- `EARLY_ACCESS_MODAL_VIEW` - Usuario ve modal de checkout (próximo)
- `CHECKOUT_SCREEN_VIEW` - Usuario llega a checkout (próximo)

### **User Actions**
- `EARLY_ACCESS_CTA_TAP` - Usuario toca "Reservar Próxima Temporada"
- `PURCHASE_INITIATED` - Usuario inicia proceso de compra (próximo)
- `PURCHASE_COMPLETED` - Compra exitosa (próximo)
- `PURCHASE_FAILED` - Compra fallida (próximo)

### **Engagement**
- `user_engagement_snapshot` - Snapshot periódico de actividad
- `conversion_funnel` - Pasos del funnel de conversión

---

## Métricas de Usuario

### **Almacenadas Localmente**
```typescript
{
  daysActive: number;          // Días únicos de uso
  resortsViewed: number;       // Cerros visitados
  forecastsChecked: number;    // Pronósticos consultados
  sessionCount: number;        // Sesiones totales
  firstVisit: string;          // Fecha primera visita
  lastVisit: string;           // Fecha última visita
  avgSessionDuration: number;  // Duración promedio (próximo)
}
```

### **User Properties en Firebase**
- `is_founder` - Si compró acceso anticipado
- `days_active` - Días activos
- `resorts_viewed` - Cerros vistos
- `engagement_level` - casual/active/power_user

---

## Niveles de Engagement

### **Casual** (Score < 20)
- Uso esporádico
- Pocos cerros visitados
- Baja frecuencia de checks

### **Active** (Score 20-50)
- Uso regular
- Varios cerros visitados
- Checks frecuentes de pronósticos

### **Power User** (Score > 50)
- Uso diario/muy frecuente
- Muchos cerros visitados
- Alta interacción con la app

**Fórmula:**
```
score = daysActive * 2 + resortsViewed * 1.5 + forecastsChecked * 1
```

---

## Criterios de Conversión

Un usuario está **"listo para conversión"** cuando:
- ✅ Días activos ≥ 3
- ✅ Cerros vistos ≥ 5
- ✅ Pronósticos chequeados ≥ 10

Estos usuarios verán el hint: *"¡Estás listo para el acceso anticipado!"*

---

## Próximos Pasos

### **Fase 2: Análisis de Datos**
- [ ] Dashboard admin para ver métricas
- [ ] Queries de Firebase Analytics
- [ ] Exportar datos a BigQuery (opcional)
- [ ] Calcular conversion rate

### **Fase 3: Optimización**
- [ ] A/B testing de mensajes
- [ ] Ajustar criterios de conversión según datos reales
- [ ] Remarketing a usuarios activos sin compra

### **Fase 4: Checkout & Pagos**
- [ ] Pantalla de checkout
- [ ] Integración Stripe/MercadoPago
- [ ] Tracking de purchase events
- [ ] Email confirmación

---

## Queries Útiles de Firebase Analytics

### **Conversion Rate**
```
Usuarios que tocaron CTA / Usuarios que vieron pantalla PRO
```

### **Tiempo hasta Primera Conversión**
```
Tiempo entre primera sesión y EARLY_ACCESS_CTA_TAP
```

### **Engagement vs Conversión**
```
Comparar engagement_level de usuarios que compraron vs que no
```

### **Momento Óptimo de Conversión**
```
Analizar en qué día/sesión convierten más usuarios
```

---

## Cómo Ver los Datos

### **Firebase Console**
1. Ir a Firebase Console → Analytics → Events
2. Ver eventos custom: `early_access_cta_tap`, `pro_screen_view`, etc.
3. Analytics → User Properties → Ver `engagement_level`, `is_founder`

### **En la App (Debug)**
Los eventos se loguean en consola:
```
[Analytics] Event: early_access_cta_tap
[Analytics] Params: { source: 'pro_screen', price: 0, currency: 'ARS' }
```

---

## Notas Importantes

- ✅ Analytics funciona desde el día 1
- ✅ No requiere backend adicional (usa Firebase)
- ✅ Datos almacenados local + cloud
- ✅ GDPR compliant (Firebase maneja consent)
- ⚠️ Requiere Firebase configurado en proyecto

---

## Testing

Para testear que funciona:
1. Abrir app
2. Ir a tab PRO → Ver console log de `PRO_SCREEN_VIEW`
3. Tocar "Reservar Próxima Temporada" → Ver log de `EARLY_ACCESS_CTA_TAP`
4. Ver cerros → Contador de `resortsViewed` aumenta
5. Volver a PRO → Dashboard muestra métricas actualizadas
