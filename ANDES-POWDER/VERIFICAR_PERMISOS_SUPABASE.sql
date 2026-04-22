-- EJECUTAR EN SUPABASE SQL EDITOR PARA VERIFICAR Y ARREGLAR PERMISOS

-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('forecast_runs', 'elevation_forecasts', 'resort_correction_profiles');

-- Dar permisos completos al usuario postgres en las nuevas tablas
GRANT ALL PRIVILEGES ON TABLE forecast_runs TO postgres;
GRANT ALL PRIVILEGES ON TABLE elevation_forecasts TO postgres;
GRANT ALL PRIVILEGES ON TABLE model_agreements TO postgres;
GRANT ALL PRIVILEGES ON TABLE resort_correction_profiles TO postgres;
GRANT ALL PRIVILEGES ON TABLE observations TO postgres;

-- Dar permisos en las secuencias (para los IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Verificar permisos
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('forecast_runs', 'elevation_forecasts')
AND grantee = 'postgres';
