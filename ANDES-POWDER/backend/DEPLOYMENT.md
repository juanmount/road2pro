# Deployment a Google Cloud Run

## Opción 1: Deployment desde Google Cloud Console (Más fácil)

### Paso 1: Preparar el proyecto
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto o crea uno nuevo
3. Habilita las APIs necesarias:
   - Cloud Run API
   - Cloud Build API
   - Container Registry API

### Paso 2: Crear Cloud SQL PostgreSQL (Base de datos)
1. Ve a **SQL** en el menú lateral
2. Clic en **Crear instancia**
3. Selecciona **PostgreSQL**
4. Configuración:
   - **Nombre:** `andes-powder-db`
   - **Contraseña:** (guarda esta contraseña)
   - **Región:** `us-central1` (o la más cercana a Argentina)
   - **Versión:** PostgreSQL 15
   - **Preset:** Development (para empezar)
5. Clic en **Crear**
6. Una vez creada, ve a **Bases de datos** → **Crear base de datos**
   - Nombre: `andes_powder`
7. Anota la **IP pública** de la instancia

### Paso 3: Conectar a la base de datos y crear schema
```bash
# Desde tu Mac, conecta a Cloud SQL
psql "host=<IP_PUBLICA> port=5432 dbname=andes_powder user=postgres"

# Ejecuta el schema
\i database/schema.sql
```

### Paso 4: Deploy a Cloud Run
1. Ve a **Cloud Run** en el menú lateral
2. Clic en **Crear servicio**
3. Selecciona **Implementar continuamente desde un repositorio**
4. Conecta tu repositorio de GitHub (o sube el código)
5. Configuración:
   - **Nombre del servicio:** `andes-powder-backend`
   - **Región:** `us-central1`
   - **Autenticación:** Permitir invocaciones no autenticadas
   - **CPU:** 1 vCPU
   - **Memoria:** 512 MB
   - **Instancias mínimas:** 0 (para ahorrar costos)
   - **Instancias máximas:** 10
   - **Puerto del contenedor:** 8080

### Paso 5: Configurar variables de entorno
En la sección **Variables y secretos**, agrega:

```
DATABASE_URL=postgresql://postgres:<PASSWORD>@<IP_CLOUD_SQL>:5432/andes_powder
NODE_ENV=production
PORT=8080
```

### Paso 6: Clic en **Crear**

Cloud Run construirá y desplegará automáticamente tu backend. Te dará una URL como:
```
https://andes-powder-backend-xxxxx-uc.a.run.app
```

---

## Opción 2: Deployment con gcloud CLI

### Requisitos previos
```bash
# Instalar gcloud CLI
brew install --cask google-cloud-sdk

# Inicializar
gcloud init

# Configurar proyecto
gcloud config set project TU_PROJECT_ID
```

### Deploy
```bash
# Desde el directorio /backend
gcloud run deploy andes-powder-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="postgresql://..." \
  --set-env-vars NODE_ENV=production
```

---

## Costos estimados (Tier gratuito)

### Cloud Run (Serverless)
- **Gratis:** 2 millones de requests/mes
- **Gratis:** 360,000 GB-segundos/mes
- **Gratis:** 180,000 vCPU-segundos/mes
- **Costo después:** ~$0.00002 por request

### Cloud SQL (PostgreSQL)
- **Development preset:** ~$10/mes
- **Alternativa:** Usar tu PostgreSQL local (gratis pero menos confiable)

### Total estimado
- **Con Cloud SQL:** ~$10/mes
- **Sin Cloud SQL (usando DB local):** $0/mes (dentro del tier gratuito)

---

## Configuración del Cron Job

Cloud Run no mantiene instancias corriendo 24/7 por defecto. Para el cron job de pronósticos:

### Opción A: Cloud Scheduler (Recomendado)
1. Ve a **Cloud Scheduler**
2. Crea un job:
   - **Nombre:** `forecast-update`
   - **Frecuencia:** `5 * * * *` (cada hora a los :05)
   - **URL:** `https://tu-url.run.app/api/cron/forecast`
   - **Método:** POST

### Opción B: Mantener instancia mínima
En Cloud Run, configura:
- **Instancias mínimas:** 1 (costo adicional ~$10/mes)

---

## Próximos pasos después del deployment

1. ✅ Anota la URL de Cloud Run
2. ✅ Actualiza la app móvil con la nueva URL
3. ✅ Configura Cloud Scheduler para el cron job
4. ✅ Monitorea logs en Cloud Run Console
5. ✅ Configura alertas para errores

---

## Troubleshooting

### Error: "Cannot connect to database"
- Verifica que la IP de Cloud SQL sea correcta
- Asegúrate de que Cloud SQL permita conexiones desde Cloud Run
- Considera usar Cloud SQL Proxy para conexiones más seguras

### Error: "Port already in use"
- Cloud Run usa la variable de entorno `PORT` (8080 por defecto)
- Asegúrate de que tu app use `process.env.PORT`

### Logs
```bash
# Ver logs en tiempo real
gcloud run logs tail andes-powder-backend --region us-central1
```
