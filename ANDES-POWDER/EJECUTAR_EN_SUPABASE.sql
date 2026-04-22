-- EJECUTAR ESTE SQL EN SUPABASE SQL EDITOR
-- Esto creará las tablas necesarias para que el backend funcione

-- Migration: Multi-Model Architecture
-- Adds support for tracking multiple forecast models and model agreement
-- Date: 2026-03-10
-- Phase: 1

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FORECAST RUNS TABLE
-- Tracks each forecast fetch from providers with full provenance
-- ============================================================================
CREATE TABLE IF NOT EXISTS forecast_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  
  -- Model metadata
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(50) NOT NULL,
  model_version VARCHAR(20),
  
  -- Timing
  issued_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  horizon_hours INTEGER NOT NULL,
  
  -- Quality tracking
  fetch_status VARCHAR(20) NOT NULL DEFAULT 'success',
  data_quality DECIMAL(3,2),
  
  -- Metadata
  raw_data_url TEXT,
  processing_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecast_runs_resort ON forecast_runs(resort_id, issued_at DESC);
CREATE INDEX idx_forecast_runs_model ON forecast_runs(model_name, issued_at DESC);
CREATE INDEX idx_forecast_runs_provider ON forecast_runs(provider, fetched_at DESC);

-- ============================================================================
-- ELEVATION FORECASTS TABLE (Enhanced)
-- Replaces hourly_forecasts with more detailed structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS elevation_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_run_id UUID NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  
  -- Location context
  elevation_band VARCHAR(10) NOT NULL,
  elevation_meters INTEGER NOT NULL,
  
  -- Time
  valid_time TIMESTAMPTZ NOT NULL,
  forecast_hour INTEGER NOT NULL,
  
  -- Raw meteorological inputs
  temperature_c DECIMAL(5,2) NOT NULL,
  apparent_temp_c DECIMAL(5,2),
  dew_point_c DECIMAL(5,2),
  
  precipitation_mm DECIMAL(7,2) NOT NULL DEFAULT 0,
  snowfall_cm_raw DECIMAL(7,2),
  
  wind_speed_kmh DECIMAL(6,2) NOT NULL DEFAULT 0,
  wind_gust_kmh DECIMAL(6,2),
  wind_direction INTEGER,
  
  humidity INTEGER NOT NULL,
  cloud_cover INTEGER NOT NULL,
  pressure_msl DECIMAL(7,2),
  
  -- Derived atmospheric
  freezing_level_m INTEGER,
  snow_line_m INTEGER,
  
  -- Snow Engine outputs
  snowfall_cm_corrected DECIMAL(7,2) NOT NULL DEFAULT 0,
  phase_classification VARCHAR(20),
  snow_quality VARCHAR(20),
  
  -- Scores
  powder_score DECIMAL(3,1) NOT NULL DEFAULT 0,
  skiability_score DECIMAL(3,1) NOT NULL DEFAULT 0,
  wind_impact VARCHAR(20),
  
  -- Metadata
  confidence_score DECIMAL(3,1),
  data_source VARCHAR(100) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT elevation_band_check CHECK (elevation_band IN ('base', 'mid', 'summit'))
);

CREATE INDEX idx_elevation_forecasts_run ON elevation_forecasts(forecast_run_id);
CREATE INDEX idx_elevation_forecasts_resort_time ON elevation_forecasts(resort_id, valid_time);
CREATE INDEX idx_elevation_forecasts_band ON elevation_forecasts(elevation_band, valid_time);

-- ============================================================================
-- MODEL AGREEMENTS TABLE
-- Tracks agreement between different models for confidence scoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  valid_time TIMESTAMPTZ NOT NULL,
  elevation_band VARCHAR(10) NOT NULL,
  
  -- Model outputs being compared
  ecmwf_snowfall_cm DECIMAL(7,2),
  gfs_snowfall_cm DECIMAL(7,2),
  ecmwf_freezing_level_m INTEGER,
  gfs_freezing_level_m INTEGER,
  
  -- Ensemble spread (from GEFS)
  gefs_snowfall_mean DECIMAL(7,2),
  gefs_snowfall_stddev DECIMAL(7,2),
  gefs_snowfall_min DECIMAL(7,2),
  gefs_snowfall_max DECIMAL(7,2),
  
  -- Agreement metrics (0-1 scale)
  snowfall_agreement DECIMAL(3,2),
  freezing_level_agreement DECIMAL(3,2),
  overall_agreement DECIMAL(3,2),
  
  -- Derived confidence (0-10 scale)
  confidence_score DECIMAL(3,1) NOT NULL,
  confidence_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT elevation_band_check CHECK (elevation_band IN ('base', 'mid', 'summit'))
);

CREATE INDEX idx_model_agreements_resort_time ON model_agreements(resort_id, valid_time);
CREATE INDEX idx_model_agreements_confidence ON model_agreements(confidence_score DESC);

-- ============================================================================
-- RESORT CORRECTION PROFILES TABLE
-- Stores resort-specific calibration parameters
-- ============================================================================
CREATE TABLE IF NOT EXISTS resort_correction_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  
  -- Precipitation corrections
  precipitation_bias_factor DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  snowfall_bias_factor DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  
  -- Temperature/phase corrections
  snow_line_offset_m INTEGER NOT NULL DEFAULT 0,
  warm_event_penalty DECIMAL(3,2) NOT NULL DEFAULT 0,
  freezing_level_bias_m INTEGER NOT NULL DEFAULT 0,
  
  -- Wind corrections
  wind_moderate_threshold INTEGER NOT NULL DEFAULT 30,
  wind_high_threshold INTEGER NOT NULL DEFAULT 50,
  wind_severe_threshold INTEGER NOT NULL DEFAULT 70,
  wind_summit_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.2,
  
  -- Accumulation patterns
  base_accumulation_factor DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  mid_accumulation_factor DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  summit_accumulation_factor DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  
  -- Operational
  lift_closure_wind_threshold INTEGER NOT NULL DEFAULT 80,
  
  -- Notes
  calibration_notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_correction_profiles_resort ON resort_correction_profiles(resort_id);
CREATE UNIQUE INDEX idx_correction_profiles_active ON resort_correction_profiles(resort_id) 
  WHERE valid_to IS NULL;

-- ============================================================================
-- OBSERVATIONS TABLE
-- For future validation and calibration
-- ============================================================================
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  
  observation_type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  
  -- Flexible value storage
  value_numeric DECIMAL(10,2),
  value_text TEXT,
  unit VARCHAR(20) NOT NULL,
  elevation_band VARCHAR(10),
  
  -- Quality
  reliability VARCHAR(20) NOT NULL DEFAULT 'medium',
  verified BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT elevation_band_check CHECK (elevation_band IN ('base', 'mid', 'summit', NULL))
);

CREATE INDEX idx_observations_resort_time ON observations(resort_id, observed_at DESC);
CREATE INDEX idx_observations_type ON observations(observation_type);
CREATE INDEX idx_observations_source ON observations(source);

-- ============================================================================
-- DEFAULT CORRECTION PROFILES
-- Create default profiles for existing resorts
-- ============================================================================

-- Cerro Catedral (Bariloche)
INSERT INTO resort_correction_profiles (
  resort_id,
  name,
  precipitation_bias_factor,
  snowfall_bias_factor,
  snow_line_offset_m,
  calibration_notes
)
SELECT 
  id,
  'Catedral Default Profile',
  1.0,
  1.0,
  0,
  'Initial default profile - needs calibration with observations'
FROM resorts WHERE slug = 'cerro-catedral'
ON CONFLICT DO NOTHING;

-- Cerro Chapelco
INSERT INTO resort_correction_profiles (
  resort_id,
  name,
  precipitation_bias_factor,
  snowfall_bias_factor,
  snow_line_offset_m,
  calibration_notes
)
SELECT 
  id,
  'Chapelco Default Profile',
  1.0,
  1.0,
  0,
  'Initial default profile - needs calibration with observations'
FROM resorts WHERE slug = 'cerro-chapelco'
ON CONFLICT DO NOTHING;

-- Las Leñas
INSERT INTO resort_correction_profiles (
  resort_id,
  name,
  precipitation_bias_factor,
  snowfall_bias_factor,
  snow_line_offset_m,
  calibration_notes
)
SELECT 
  id,
  'Las Leñas Default Profile',
  1.0,
  1.0,
  0,
  'Initial default profile - needs calibration with observations'
FROM resorts WHERE slug = 'las-lenas'
ON CONFLICT DO NOTHING;

-- Cerro Castor
INSERT INTO resort_correction_profiles (
  resort_id,
  name,
  precipitation_bias_factor,
  snowfall_bias_factor,
  snow_line_offset_m,
  calibration_notes
)
SELECT 
  id,
  'Castor Default Profile',
  1.0,
  1.0,
  0,
  'Initial default profile - needs calibration with observations'
FROM resorts WHERE slug = 'cerro-castor'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEWS FOR BACKWARD COMPATIBILITY
-- Allow old API queries to work with new schema
-- ============================================================================

-- View that mimics old hourly_forecasts structure
CREATE OR REPLACE VIEW hourly_forecasts_compat AS
SELECT 
  ef.id,
  fr.id as snapshot_id,
  ef.resort_id,
  ef.valid_time as timestamp,
  ef.elevation_band,
  ef.temperature_c as temperature,
  ef.precipitation_mm as precipitation,
  ef.snowfall_cm_corrected as snowfall,
  ef.wind_speed_kmh as wind_speed,
  ef.wind_gust_kmh as wind_gust,
  ef.humidity,
  ef.cloud_cover,
  ef.powder_score,
  ef.freezing_level_m as freezing_level,
  ef.snow_line_m as snow_line,
  ef.phase_classification as precipitation_type
FROM elevation_forecasts ef
JOIN forecast_runs fr ON ef.forecast_run_id = fr.id
WHERE fr.model_name = 'ecmwf-ifs';

COMMENT ON VIEW hourly_forecasts_compat IS 'Backward compatibility view for old API queries';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE forecast_runs IS 'Phase 1: Multi-model architecture - tracks forecast provenance';
COMMENT ON TABLE elevation_forecasts IS 'Phase 1: Enhanced forecast storage with full meteorological data';
COMMENT ON TABLE model_agreements IS 'Phase 1: Model agreement tracking for confidence scoring';
COMMENT ON TABLE resort_correction_profiles IS 'Phase 1: Resort-specific calibration parameters';
COMMENT ON TABLE observations IS 'Phase 1: Observation storage for validation (future use)';
