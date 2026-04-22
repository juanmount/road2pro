# 🚂 DEPLOYMENT EN RAILWAY - GUÍA COMPLETA

## 🎯 OBJETIVO
Deployar el backend completo en Railway para que corra 24/7 sin tu Mac.

---

## 📋 PASO A PASO

### PASO 1: Crear Cuenta en Railway

1. **Ir a:** https://railway.app
2. **Click en:** "Login"
3. **Seleccionar:** "Login with GitHub"
4. **Autorizar** Railway a acceder a tu GitHub

---

### PASO 2: Crear Nuevo Proyecto

1. **Click en:** "New Project" (botón morado)
2. **Seleccionar:** "Deploy from GitHub repo"
3. **Buscar:** `road2pro` (tu repositorio)
4. **Click en:** el repositorio para seleccionarlo

---

### PASO 3: Configurar Root Directory

Railway va a detectar que es un monorepo. Necesitás configurar:

1. **Click en:** "Settings" (en el proyecto)
2. **Buscar:** "Root Directory"
3. **Escribir:** `backend`
4. **Guardar**

Esto le dice a Railway que el código del backend está en la carpeta `/backend`.

---

### PASO 4: Configurar Variables de Entorno

1. **Click en:** "Variables" (en el menú lateral)
2. **Click en:** "New Variable"
3. **Agregar estas variables una por una:**

```
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://andes-powder-db.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZGVzLXBvd2Rlci1kYiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ0OTI1MjQzLCJleHAiOjIwNjA1MDEyNDN9.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
FORECAST_CRON_SCHEDULE=0 */3 * * *
```

**Para Firebase (opcional si usás autenticación):**

Necesitás agregar las credenciales de Firebase. Tenés 2 opciones:

**Opción A - Variables individuales:**
```
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Opción B - Archivo completo:**
Copiar el contenido de `firebase-service-account.json` y pegarlo como una variable llamada `FIREBASE_SERVICE_ACCOUNT`.

---

### PASO 5: Deploy

1. **Railway automáticamente va a hacer el deploy** cuando guardes las variables
2. **Esperar** 2-3 minutos mientras compila y deploya
3. **Ver logs** en la sección "Deployments" para verificar que todo esté bien

---

### PASO 6: Obtener URL Pública

1. **Click en:** "Settings"
2. **Buscar:** "Domains"
3. **Click en:** "Generate Domain"
4. Railway te dará una URL como: `https://tu-proyecto.up.railway.app`

**Esta es tu API pública que funciona 24/7**

---

### PASO 7: Verificar que Funciona

Testear la API:

```bash
# Health check
curl https://tu-proyecto.up.railway.app/health

# Debería responder:
# {"status":"ok","timestamp":"..."}
```

---

## 🔧 CONFIGURACIÓN ADICIONAL

### Configurar Cron Jobs (Opcional)

Railway no tiene cron jobs nativos, pero podés usar:

**Opción 1 - Servicio externo (recomendado):**
- Usar https://cron-job.org (gratis)
- Configurar para llamar a tu endpoint cada semana:
  - URL: `https://tu-proyecto.up.railway.app/api/validation/compare`
  - Frecuencia: Lunes a las 9:00 AM

**Opción 2 - GitHub Actions:**
Crear un workflow que llame a tu API semanalmente.

---

## 💰 COSTOS

**Railway Pricing:**
- **Gratis:** $5 de crédito mensual
- **Hobby Plan:** $5/mes (500 horas de ejecución)
- **Pro Plan:** $20/mes (ilimitado)

**Estimación para Andes Powder:**
- Backend simple: ~$3-5/mes
- Con el crédito gratis: **$0/mes** los primeros meses

---

## 🎯 RESULTADO FINAL

Una vez deployado:

✅ **Backend corriendo 24/7** en Railway
✅ **Base de datos** en Supabase
✅ **API pública** accesible desde internet
✅ **Independiente de tu Mac**
✅ **Forecast service** generando pronósticos automáticamente
✅ **Sistema de validación** funcionando

---

## 🐛 TROUBLESHOOTING

### Error: "Build failed"
- Verificar que Root Directory esté en `backend`
- Verificar que `package.json` tenga script `build`
- Ver logs de build para detalles

### Error: "Application failed to start"
- Verificar variables de entorno
- Verificar que PORT esté en 3000
- Ver logs de runtime

### Error: "Cannot connect to Supabase"
- Verificar SUPABASE_URL y SUPABASE_ANON_KEY
- Verificar que las credenciales sean correctas

---

## 📝 CHECKLIST

- [ ] Cuenta en Railway creada
- [ ] Proyecto conectado a GitHub
- [ ] Root Directory configurado (`backend`)
- [ ] Variables de entorno agregadas
- [ ] Deploy exitoso
- [ ] URL pública generada
- [ ] Health check funciona
- [ ] API responde correctamente

---

## 🚀 PRÓXIMOS PASOS DESPUÉS DEL DEPLOYMENT

1. **Actualizar la app móvil** para usar la nueva URL de Railway
2. **Configurar cron jobs** para validación automática
3. **Monitorear logs** en Railway para verificar que todo funcione
4. **Apagar el servidor local** en tu Mac (ya no lo necesitás)

---

**Una vez deployado, avisame y verificamos que todo funcione correctamente.**
