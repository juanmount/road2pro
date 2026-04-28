# 🚂 Deploy a Railway - Guía Completa

Railway es la forma más simple de hacer deploy del backend de Andes Powder.

## ✅ Ventajas de Railway

- ✅ Deploy en 5 minutos
- ✅ PostgreSQL incluido gratis
- ✅ $5 de crédito gratis al mes
- ✅ Deploy automático desde GitHub
- ✅ Variables de entorno fáciles de configurar
- ✅ Logs en tiempo real
- ✅ Cron jobs incluidos

---

## 📋 Paso 1: Preparar el Repositorio

### 1.1 Verificar que tienes Git configurado

```bash
cd /Users/juanomountford/ANDES-POWDER
git status
```

Si no tienes Git inicializado:

```bash
git init
git add .
git commit -m "Initial commit - Andes Powder backend"
```

### 1.2 Subir a GitHub

1. Ve a https://github.com/new
2. Crea un repositorio: `andes-powder`
3. **NO** inicialices con README

```bash
# Conecta tu repo local con GitHub
git remote add origin https://github.com/TU_USUARIO/andes-powder.git
git branch -M main
git push -u origin main
```

---

## 📋 Paso 2: Crear Cuenta en Railway

1. Ve a https://railway.app
2. Haz clic en **Start a New Project**
3. Inicia sesión con GitHub (recomendado)
4. Autoriza Railway a acceder a tus repositorios

---

## 📋 Paso 3: Deploy del Backend

### 3.1 Crear Nuevo Proyecto

1. En Railway, haz clic en **+ New Project**
2. Selecciona **Deploy from GitHub repo**
3. Busca y selecciona tu repo `andes-powder`
4. Railway detectará automáticamente que es un proyecto Node.js

### 3.2 Configurar el Servicio

Railway creará un servicio automáticamente. Ahora configúralo:

1. Haz clic en el servicio que se creó
2. Ve a la pestaña **Settings**
3. En **Root Directory**, escribe: `backend`
4. En **Start Command**, escribe: `npm start`
5. En **Build Command**, escribe: `npm run build`

### 3.3 Agregar PostgreSQL

1. En tu proyecto de Railway, haz clic en **+ New**
2. Selecciona **Database** → **Add PostgreSQL**
3. Railway creará automáticamente una base de datos PostgreSQL
4. Espera unos segundos a que se aprovisione

---

## 📋 Paso 4: Configurar Variables de Entorno

### 4.1 Conectar la Base de Datos

1. Haz clic en tu servicio de backend (no en PostgreSQL)
2. Ve a la pestaña **Variables**
3. Haz clic en **+ New Variable**
4. Agrega estas variables:

```
NODE_ENV=production
PORT=3000
```

### 4.2 Conectar DATABASE_URL

Railway conecta automáticamente PostgreSQL. Verifica que exista la variable:
- `DATABASE_URL` (debería aparecer automáticamente)

Si no aparece:
1. Haz clic en PostgreSQL
2. Ve a **Connect**
3. Copia la **Database URL**
4. Vuelve a tu servicio backend
5. Agrega variable `DATABASE_URL` con el valor copiado

### 4.3 Variables Opcionales (Firebase)

Si usas autenticación con Firebase:

```
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 📋 Paso 5: Ejecutar Migraciones

### 5.1 Conectarse a la Base de Datos

1. En Railway, haz clic en tu base de datos **PostgreSQL**
2. Ve a la pestaña **Data**
3. Haz clic en **Query** (arriba a la derecha)

### 5.2 Ejecutar el Schema

Copia y pega el contenido de estos archivos en orden:

**Primero:** `backend/database/schema.sql` (schema principal)
**Segundo:** `backend/database/migrate-notifications-complete.sql` (notificaciones)

Ejecuta cada uno con el botón **Run**.

---

## 📋 Paso 6: Verificar el Deploy

### 6.1 Ver Logs

1. En Railway, haz clic en tu servicio backend
2. Ve a la pestaña **Deployments**
3. Haz clic en el deployment más reciente
4. Ve a **View Logs**

Busca estos mensajes:
```
🏔️  Andes Powder API running on port 3000
🔔 Smart notification scanner initialized - 8:00 AM and 6:00 PM daily
```

### 6.2 Obtener la URL

1. En tu servicio backend, ve a **Settings**
2. En **Domains**, haz clic en **Generate Domain**
3. Railway te dará una URL como: `https://andes-powder-production.up.railway.app`
4. **Copia esta URL** - la necesitarás para la app móvil

### 6.3 Probar el Backend

```bash
# Reemplaza con tu URL de Railway
curl https://tu-url.up.railway.app/health
```

Deberías ver:
```json
{"status":"ok","timestamp":"2026-04-28T..."}
```

---

## 📋 Paso 7: Actualizar la App Móvil

### 7.1 Actualizar la URL del Backend

Edita el archivo de configuración de la app:

```typescript
// mobile/config/api.ts
const API_BASE_URL = 'https://tu-url.up.railway.app';
```

### 7.2 Regenerar el APK

```bash
cd /Users/juanomountford/ANDES-POWDER/mobile
cd android && ./gradlew assembleRelease
cp android/app/build/outputs/apk/release/app-release.apk ~/Desktop/andes-powder-production.apk
```

### 7.3 Instalar el Nuevo APK

1. Desinstala la versión anterior
2. Instala `andes-powder-production.apk`
3. Abre la app → Alertas
4. Toca "Activar Notificaciones"
5. El token se guardará en Railway PostgreSQL

---

## 📋 Paso 8: Configurar Cron Jobs (Opcional pero Recomendado)

Railway ejecuta los cron jobs automáticamente si tu código los tiene (✅ ya los tienes).

Pero para asegurar que la instancia no se duerma:

### Opción A: Mantener Instancia Activa

1. En Railway, ve a tu servicio backend
2. Settings → **Service**
3. Activa **Always On** (usa créditos pero garantiza que los cron jobs corran)

### Opción B: Usar un Servicio Externo (Gratis)

Usa **cron-job.org** para hacer ping cada hora:

1. Ve a https://cron-job.org
2. Crea una cuenta gratis
3. Crea un nuevo cron job:
   - **URL:** `https://tu-url.up.railway.app/health`
   - **Schedule:** Cada hora
   - **Method:** GET

Esto mantiene tu servicio despierto.

---

## 💰 Costos

### Tier Gratuito de Railway

- **$5 de crédito gratis al mes**
- **500 horas de ejecución gratis**
- **PostgreSQL incluido**

### Uso Estimado de Andes Powder

- **Backend:** ~$3-4/mes (con cron jobs corriendo 2x al día)
- **PostgreSQL:** Incluido en el tier gratuito
- **Total:** ~$3-4/mes (o gratis si usas <$5)

---

## 🔍 Monitoreo

### Ver Logs en Tiempo Real

1. Railway Dashboard → Tu servicio
2. Pestaña **Deployments**
3. Haz clic en el deployment activo
4. **View Logs**

### Ver Métricas

1. Railway Dashboard → Tu servicio
2. Pestaña **Metrics**
3. Verás CPU, memoria, requests, etc.

### Ver Base de Datos

1. Railway Dashboard → PostgreSQL
2. Pestaña **Data**
3. Puedes hacer queries directamente

---

## 🧪 Testing

### Test 1: Health Check

```bash
curl https://tu-url.up.railway.app/health
```

### Test 2: Ver Resorts

```bash
curl https://tu-url.up.railway.app/api/resorts
```

### Test 3: Verificar Tokens

```bash
curl https://tu-url.up.railway.app/api/push/stats
```

### Test 4: Enviar Notificación de Prueba

```bash
curl -X POST https://tu-url.up.railway.app/api/push/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TU_USER_ID",
    "title": "Test desde Railway",
    "body": "El backend está funcionando!"
  }'
```

---

## ⚠️ Troubleshooting

### El deploy falla

**Verifica:**
1. Que `backend/package.json` tenga el script `build`
2. Que `Root Directory` esté configurado como `backend`
3. Los logs de build en Railway

### La base de datos no se conecta

**Verifica:**
1. Que `DATABASE_URL` esté en las variables de entorno
2. Que PostgreSQL esté corriendo (verde en Railway)
3. Los logs del backend

### Los cron jobs no corren

**Solución:**
1. Activa **Always On** en Settings
2. O usa cron-job.org para hacer ping cada hora

---

## 🎯 Checklist Final

- [ ] Código subido a GitHub
- [ ] Proyecto creado en Railway
- [ ] PostgreSQL agregado
- [ ] Variables de entorno configuradas
- [ ] Migraciones ejecutadas
- [ ] Deploy exitoso (logs muestran "API running")
- [ ] URL del backend obtenida
- [ ] App móvil actualizada con nueva URL
- [ ] Nuevo APK generado e instalado
- [ ] Notificaciones probadas y funcionando
- [ ] Cron jobs configurados (Always On o cron-job.org)

---

## 🚀 ¡Listo para Producción!

Tu backend ahora está:
- ✅ Corriendo 24/7 en Railway
- ✅ Con PostgreSQL en la nube
- ✅ Escaneando pronósticos 2x al día
- ✅ Enviando push notifications automáticamente
- ✅ Monitoreado con logs en tiempo real

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Prueba los endpoints con curl
4. Revisa la documentación de Railway: https://docs.railway.app

¿Necesitas ayuda? Consulta esta guía o los logs de Railway.
