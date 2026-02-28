CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS geo_counties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS geo_counties_gix
  ON geo_counties
  USING GIST (geom);

CREATE INDEX IF NOT EXISTS geo_counties_name_idx
  ON geo_counties (name);

CREATE TABLE IF NOT EXISTS geo_city_exceptions (
  id SERIAL PRIMARY KEY,
  county TEXT NOT NULL,
  city TEXT NOT NULL,
  geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS geo_city_exceptions_gix
  ON geo_city_exceptions
  USING GIST (geom);

CREATE INDEX IF NOT EXISTS geo_city_exceptions_county_city_idx
  ON geo_city_exceptions (county, city);
