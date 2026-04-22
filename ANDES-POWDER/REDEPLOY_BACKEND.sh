#!/bin/bash
# Script para redesplegar el backend en Cloud Run con configuración correcta

set -e

echo "🚀 Redesplegando Andes Powder Backend..."

# Variables
PROJECT_ID="padelsocialclub-93879"
SERVICE_NAME="road2pro"
REGION="southamerica-west1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/andes-powder-backend"

# Database URL (escapado para shell)
DATABASE_URL="postgresql://postgres:%40Manguera25@db.syblfficocpoqetddcqs.supabase.co:5432/postgres"

echo "📦 Construyendo imagen Docker..."
cd ~/road2pro/ANDES-POWDER/backend
gcloud builds submit --tag ${IMAGE_NAME}:latest

echo "🚢 Desplegando a Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=${DATABASE_URL},NODE_ENV=production" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10

echo "✅ Deployment completado!"
echo "🔗 Service URL: https://${SERVICE_NAME}-784570271418.${REGION}.run.app"

echo ""
echo "🧪 Probando conexión..."
sleep 5
curl -s "https://${SERVICE_NAME}-784570271418.${REGION}.run.app/health" | jq '.'

echo ""
echo "🔄 Forzando sincronización de pronósticos..."
sleep 5
curl -X POST "https://${SERVICE_NAME}-784570271418.${REGION}.run.app/api/admin/sync-forecasts" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "✅ Todo listo! Verificando datos..."
sleep 10
curl -s "https://${SERVICE_NAME}-784570271418.${REGION}.run.app/api/resorts/cbe22ddb-639c-4f1a-a216-f70a5434e465/forecast/daily?elevation=mid&days=1" | jq '.'
