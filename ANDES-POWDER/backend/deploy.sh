#!/bin/bash

# Andes Powder - Google Cloud Run Deployment Script
# Este script despliega el backend a Google Cloud Run

set -e

echo "🏔️  Andes Powder - Deployment a Google Cloud Run"
echo ""

# Verificar que gcloud esté instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI no está instalado."
    echo "Instálalo con: brew install --cask google-cloud-sdk"
    echo "O sigue las instrucciones en DEPLOYMENT.md"
    exit 1
fi

# Verificar que el usuario esté autenticado
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "❌ No estás autenticado en gcloud."
    echo "Ejecuta: gcloud auth login"
    exit 1
fi

# Obtener el PROJECT_ID actual
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ No hay proyecto configurado."
    echo "Ejecuta: gcloud config set project TU_PROJECT_ID"
    exit 1
fi

echo "📦 Proyecto: $PROJECT_ID"
echo ""

# Preguntar por la DATABASE_URL
read -p "🔗 Ingresa la DATABASE_URL (postgresql://...): " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL es requerida"
    exit 1
fi

echo ""
echo "🚀 Desplegando a Cloud Run..."
echo ""

# Deploy a Cloud Run
gcloud run deploy andes-powder-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="$DATABASE_URL" \
  --set-env-vars NODE_ENV=production \
  --set-env-vars PORT=8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300

echo ""
echo "✅ Deployment completado!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Anota la URL de Cloud Run que aparece arriba"
echo "2. Actualiza la app móvil con esa URL"
echo "3. Configura Cloud Scheduler para el cron job (ver DEPLOYMENT.md)"
echo ""
