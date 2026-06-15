-- Migration 008: Add new Argentine ski resorts
-- Cerro Bayo (Villa La Angostura), La Hoya (Esquel), Caviahue (Neuquén)

INSERT INTO resorts (name, slug, region, latitude, longitude, base_elevation, mid_elevation, summit_elevation) VALUES
('Cerro Bayo', 'cerro-bayo', 'Patagonia', -40.7516, -71.5976, 1050, 1400, 1782),
('La Hoya', 'la-hoya', 'Patagonia', -42.8252, -71.2511, 1430, 1750, 2075),
('Caviahue', 'caviahue', 'Patagonia', -37.8647, -71.1008, 1650, 1850, 2050)
ON CONFLICT (slug) DO NOTHING;
