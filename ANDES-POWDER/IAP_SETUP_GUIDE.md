# Guía de Configuración - In-App Purchase

## Estado Actual
✅ Código implementado (modo MOCK)  
⏳ Pendiente: Configuración en App Store Connect y Google Play Console  
⏳ Pendiente: Configuración nativa (Xcode/Android Studio)  

---

## Paso 1: Configurar Producto en App Store Connect (Apple)

### 1.1 Crear App en App Store Connect
1. Ir a [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps → + → New App
3. Completar información básica:
   - **Name:** Andes Powder
   - **Primary Language:** Spanish
   - **Bundle ID:** com.andespowder (debe coincidir con Xcode)
   - **SKU:** ANDES_POWDER_001

### 1.2 Crear In-App Purchase
1. En tu app → Features → In-App Purchases
2. + → Non-Consumable (compra única, no se consume)
3. Configurar producto:
   - **Product ID:** `com.andespowder.founder_season1`
   - **Reference Name:** Founder Access Season 1
   - **Price:** Tier 1 ($0.99 USD) o el que corresponda
   - **Localization (Spanish):**
     - Display Name: Acceso Fundador Season 1
     - Description: Precio fundador para acceso anticipado a Season 1

### 1.3 Crear Sandbox Tester
1. Users and Access → Sandbox Testers
2. + → Crear tester con email de prueba
3. Usar este usuario para testear compras (NO se cobra real)

---

## Paso 2: Configurar Producto en Google Play Console

### 2.1 Crear App en Google Play Console
1. Ir a [Google Play Console](https://play.google.com/console)
2. Create App
3. Completar información básica

### 2.2 Crear In-App Product
1. Monetize → Products → In-app products
2. Create product
3. Configurar:
   - **Product ID:** `com.andespowder.founder_season1` (mismo que Apple)
   - **Name:** Acceso Fundador Season 1
   - **Description:** Precio fundador para acceso anticipado
   - **Price:** $299 ARS (o equivalente)
   - **Status:** Active

### 2.3 Crear License Tester
1. Setup → License testing
2. Agregar emails de prueba
3. Usar para testear sin cobros reales

---

## Paso 3: Configuración Nativa - iOS (Xcode)

### 3.1 Habilitar In-App Purchase Capability
1. Abrir proyecto en Xcode
2. Seleccionar target → Signing & Capabilities
3. + Capability → In-App Purchase
4. Verificar que Bundle ID coincida con App Store Connect

### 3.2 Configurar StoreKit (para testing local)
1. File → New → File → StoreKit Configuration File
2. Agregar producto:
   ```xml
   Product ID: com.andespowder.founder_season1
   Type: Non-Consumable
   Price: $299 ARS
   ```
3. Editor → Scheme → Edit Scheme → Run → StoreKit Configuration
4. Seleccionar archivo creado

---

## Paso 4: Configuración Nativa - Android (Android Studio)

### 4.1 Configurar Google Play Billing
1. Abrir `android/app/build.gradle`
2. Verificar que esté:
   ```gradle
   dependencies {
       implementation 'com.android.billingclient:billing:5.0.0'
   }
   ```

### 4.2 Agregar Permisos
En `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

---

## Paso 5: Testing

### 5.1 Test en iOS (Sandbox)
1. Desloguear de App Store en dispositivo
2. Correr app desde Xcode
3. Intentar compra
4. Loguear con Sandbox Tester cuando pida
5. Verificar que aparezca popup de compra
6. Confirmar (NO se cobra)

### 5.2 Test en Android (License Testing)
1. Agregar email de prueba en Play Console
2. Instalar app desde Play Console (Internal Testing)
3. Intentar compra
4. Verificar popup de Google Play
5. Confirmar (NO se cobra)

---

## Paso 6: Verificación en Backend

### 6.1 Endpoint de Verificación
Crear endpoint en tu backend:
```
POST /api/verify-purchase
```

**Request:**
```json
{
  "receipt": "base64_encoded_receipt",
  "productId": "com.andespowder.founder_season1",
  "platform": "ios" | "android"
}
```

**Response:**
```json
{
  "valid": true,
  "transactionId": "...",
  "purchaseDate": "2026-04-23T12:00:00Z"
}
```

### 6.2 Verificar con Apple
```typescript
// Enviar receipt a Apple para verificación
const response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
  method: 'POST',
  body: JSON.stringify({
    'receipt-data': receipt,
    'password': 'your_shared_secret', // De App Store Connect
  }),
});
```

### 6.3 Verificar con Google
```typescript
// Usar Google Play Developer API
const { google } = require('googleapis');
const androidpublisher = google.androidpublisher('v3');

const result = await androidpublisher.purchases.products.get({
  packageName: 'com.andespowder',
  productId: 'com.andespowder.founder_season1',
  token: purchaseToken,
});
```

---

## Paso 7: Activar Modo Producción

### 7.1 Reemplazar Mock con Real IAP
En `/mobile/services/iap.ts`:

1. Descomentar imports de `react-native-iap`
2. Reemplazar funciones mock con llamadas reales
3. Testear en sandbox
4. Subir a TestFlight/Internal Testing
5. Testear con usuarios reales

### 7.2 Configurar Webhook (Opcional)
Para notificaciones server-to-server:

**Apple:**
- App Store Connect → App → App Information → App Store Server Notifications
- Agregar URL de webhook

**Google:**
- Play Console → Monetization → Real-time developer notifications
- Agregar Cloud Pub/Sub topic

---

## Checklist Final

### Antes de Lanzar:
- [ ] Producto configurado en App Store Connect
- [ ] Producto configurado en Google Play Console
- [ ] Capabilities habilitadas en Xcode
- [ ] Permisos agregados en Android
- [ ] Backend de verificación funcionando
- [ ] Testeado en Sandbox (iOS)
- [ ] Testeado en License Testing (Android)
- [ ] Código de producción (sin mock)
- [ ] Webhook configurado (opcional)
- [ ] Política de privacidad actualizada
- [ ] Términos y condiciones actualizados

---

## Precios Sugeridos

### Estrategia de Pricing:
- **Precio Fundador:** $2.99 USD (~$300 ARS)
- **Precio Regular:** $4.99 USD (~$500 ARS)
- **Descuento:** 40%

### Por Región:
- **Argentina:** $299 ARS
- **Chile:** $2.990 CLP
- **USA:** $2.99 USD
- **Europa:** €2.99 EUR

---

## Recursos Útiles

- [Apple IAP Documentation](https://developer.apple.com/in-app-purchase/)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [react-native-iap Docs](https://react-native-iap.dooboolab.com/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

## Notas Importantes

⚠️ **Comisiones:**
- Apple: 30% (15% después del primer año)
- Google: 30% (15% después del primer año)

⚠️ **Tiempos:**
- Apple Review: 24-48 horas
- Google Review: 1-7 días
- Pago a desarrollador: 30-60 días después de compra

⚠️ **Reglas:**
- NO mencionar precios fuera de la app
- NO redirigir a web para comprar
- NO ofrecer descuentos fuera de las stores
- SÍ permitir restaurar compras
- SÍ manejar errores de red

---

**Estado:** Implementación lista, pendiente configuración en stores 🚀
