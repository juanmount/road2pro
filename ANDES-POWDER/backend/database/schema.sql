-- Andes Powder Forecast Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Resorts table
CREATE TABLE resorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL DEFAULT 'Argentina',
    region TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    base_elevation INTEGER NOT NULL, -- meters
    mid_elevation INTEGER NOT NULL,
    summit_elevation INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forecast snapshots table
CREATE TABLE forecast_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source TEXT NOT NULL DEFAULT 'open-meteo',
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hourly forecasts table
CREATE TABLE hourly_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES forecast_snapshots(id) ON DELETE CASCADE,
    resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    elevation_band TEXT NOT NULL CHECK (elevation_band IN ('base', 'mid', 'summit')),
    temperature DECIMAL(5, 2),
    feels_like DECIMAL(5, 2),
    precipitation DECIMAL(6, 2), -- mm
    precipitation_type TEXT CHECK (precipitation_type IN ('snow', 'rain', 'mixed', 'none')),
    snow_depth DECIMAL(6, 2), -- cm
    wind_speed DECIMAL(5, 2), -- km/h
    wind_gust DECIMAL(5, 2),
    wind_direction INTEGER, -- degrees 0-360
    cloud_cover INTEGER, -- percentage 0-100
    visibility DECIMAL(5, 2), -- km
    powder_score DECIMAL(3, 1), -- 0-10
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_id, timestamp, elevation_band)
);

-- Daily forecasts table
CREATE TABLE daily_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES forecast_snapshots(id) ON DELETE CASCADE,
    resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    elevation_band TEXT NOT NULL CHECK (elevation_band IN ('base', 'mid', 'summit')),
    temp_min DECIMAL(5, 2),
    temp_max DECIMAL(5, 2),
    snowfall_total DECIMAL(6, 2), -- cm
    precipitation_total DECIMAL(6, 2), -- mm
    wind_max DECIMAL(5, 2),
    powder_score_avg DECIMAL(3, 1),
    powder_score_max DECIMAL(3, 1),
    best_window_start TIME,
    best_window_end TIME,
    best_window_reason TEXT,
    snow_line INTEGER, -- meters
    freeze_quality TEXT CHECK (freeze_quality IN ('excellent', 'good', 'fair', 'poor', 'none')),
    recommended_zone TEXT,
    conditions_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_id, date, elevation_band)
);

-- Indexes for performance
CREATE INDEX idx_hourly_forecasts_resort_timestamp ON hourly_forecasts(resort_id, timestamp);
CREATE INDEX idx_hourly_forecasts_snapshot ON hourly_forecasts(snapshot_id);
CREATE INDEX idx_daily_forecasts_resort_date ON daily_forecasts(resort_id, date);
CREATE INDEX idx_daily_forecasts_snapshot ON daily_forecasts(snapshot_id);
CREATE INDEX idx_forecast_snapshots_resort ON forecast_snapshots(resort_id, fetched_at DESC);

-- Insert initial resorts
INSERT INTO resorts (name, slug, region, latitude, longitude, base_elevation, mid_elevation, summit_elevation) VALUES
('Cerro Catedral', 'cerro-catedral', 'Patagonia', -41.1500, -71.4000, 1030, 1600, 2100),
('Cerro Chapelco', 'cerro-chapelco', 'Patagonia', -40.1667, -71.2833, 1250, 1700, 2200),
('Cerro Castor', 'cerro-castor', 'Tierra del Fuego', -54.7833, -68.1167, 195, 600, 1057),
('Las Leñas', 'las-lenas', 'Mendoza', -35.1500, -70.0833, 2240, 2900, 3430);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for resorts table
CREATE TRIGGER update_resorts_updated_at BEFORE UPDATE ON resorts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
