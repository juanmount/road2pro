-- ========================================
-- ACTIVAR ROW-LEVEL SECURITY (RLS)
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ========================================

-- 1. ACTIVAR RLS EN TODAS LAS TABLAS
-- ========================================

ALTER TABLE resorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE snowfall_history ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA TABLA RESORTS
-- ========================================
-- Los resorts son públicos (solo lectura para todos)

CREATE POLICY "Resorts son públicos - lectura"
ON resorts FOR SELECT
TO public
USING (true);

-- Solo admins pueden modificar resorts
CREATE POLICY "Solo admins pueden modificar resorts"
ON resorts FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- 3. POLÍTICAS PARA FORECAST_SNAPSHOTS
-- ========================================
-- Los snapshots son públicos (solo lectura)

CREATE POLICY "Forecast snapshots públicos - lectura"
ON forecast_snapshots FOR SELECT
TO public
USING (true);

-- Solo el backend puede crear/modificar snapshots
CREATE POLICY "Solo backend puede modificar snapshots"
ON forecast_snapshots FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- 4. POLÍTICAS PARA HOURLY_FORECASTS
-- ========================================
-- Los pronósticos horarios son públicos (solo lectura)

CREATE POLICY "Hourly forecasts públicos - lectura"
ON hourly_forecasts FOR SELECT
TO public
USING (true);

-- Solo el backend puede crear/modificar pronósticos
CREATE POLICY "Solo backend puede modificar hourly forecasts"
ON hourly_forecasts FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- 5. POLÍTICAS PARA DAILY_FORECASTS
-- ========================================
-- Los pronósticos diarios son públicos (solo lectura)

CREATE POLICY "Daily forecasts públicos - lectura"
ON daily_forecasts FOR SELECT
TO public
USING (true);

-- Solo el backend puede crear/modificar pronósticos
CREATE POLICY "Solo backend puede modificar daily forecasts"
ON daily_forecasts FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- 6. POLÍTICAS PARA SNOWFALL_HISTORY
-- ========================================
-- El historial de nevadas es público (solo lectura)

CREATE POLICY "Snowfall history público - lectura"
ON snowfall_history FOR SELECT
TO public
USING (true);

-- Solo el backend puede crear/modificar historial
CREATE POLICY "Solo backend puede modificar snowfall history"
ON snowfall_history FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- 7. VERIFICAR QUE RLS ESTÁ ACTIVADO
-- ========================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Deberías ver rls_enabled = true para todas las tablas

-- 8. VERIFICAR POLÍTICAS CREADAS
-- ========================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- NOTAS IMPORTANTES:
-- ========================================
-- 
-- 1. Estas políticas permiten:
--    - Lectura pública de todos los datos (necesario para la app)
--    - Escritura solo para usuarios autenticados con role 'service_role' (backend)
--
-- 2. Si necesitas que usuarios anónimos puedan escribir:
--    - Modifica las políticas según sea necesario
--
-- 3. Para agregar más roles (ej: 'admin'):
--    - Crea políticas adicionales con las condiciones apropiadas
--
-- 4. Después de ejecutar este script:
--    - Verifica en Supabase Dashboard > Database > Policies
--    - Confirma que todas las tablas tienen RLS activado
--    - Prueba que la app sigue funcionando correctamente
--
-- ========================================
