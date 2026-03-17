#!/bin/bash

# Script para configurar Cloud SQL PostgreSQL para Andes Powder
# Ejecutar después de crear la instancia de Cloud SQL

set -e

echo "🏔️  Andes Powder - Cloud SQL Setup"
echo ""

# Verificar que se pasaron los parámetros necesarios
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Uso: ./setup-cloud-sql.sh <CLOUD_SQL_IP> <POSTGRES_PASSWORD>"
    echo ""
    echo "Ejemplo:"
    echo "  ./setup-cloud-sql.sh 34.123.45.67 mi_password_seguro"
    exit 1
fi

CLOUD_SQL_IP=$1
POSTGRES_PASSWORD=$2

echo "📦 Conectando a Cloud SQL..."
echo "IP: $CLOUD_SQL_IP"
echo ""

# Crear la base de datos
echo "🗄️  Creando base de datos 'andes_powder'..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $CLOUD_SQL_IP -U postgres -c "CREATE DATABASE andes_powder;" || echo "Base de datos ya existe"

echo ""
echo "📋 Ejecutando schema..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $CLOUD_SQL_IP -U postgres -d andes_powder -f database/schema.sql

echo ""
echo "✅ Cloud SQL configurado correctamente!"
echo ""
echo "📝 Tu DATABASE_URL es:"
echo "postgresql://postgres:$POSTGRES_PASSWORD@$CLOUD_SQL_IP:5432/andes_powder"
echo ""
echo "⚠️  IMPORTANTE: Guarda esta URL, la necesitarás para Cloud Run"
echo ""
