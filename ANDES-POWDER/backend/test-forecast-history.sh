#!/bin/bash

# Script de testing para ForecastRunHistory
# Fecha: 20 Mayo 2026

echo "=========================================="
echo "TESTING: ForecastRunHistory Feature"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Feature OFF (comportamiento actual)
echo -e "${YELLOW}TEST 1: Feature OFF (comportamiento actual)${NC}"
echo "-------------------------------------------"
echo "Configurando USE_FORECAST_HISTORY=false"
export USE_FORECAST_HISTORY=false
export USE_T850=false

echo ""
echo "Arrancando servidor..."
echo "IMPORTANTE: Revisar logs para confirmar:"
echo "  - [Features] USE_FORECAST_HISTORY: false"
echo "  - NO debe aparecer '[StormCrossing] ForecastHistory trend'"
echo ""
echo "Presiona CTRL+C para detener y continuar con Test 2"
echo ""

npm run dev
