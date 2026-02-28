import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db/prisma.js";

const COUNTIES_PATH = process.env.GEO_COUNTIES_PATH ?? "/data/geo/ny_counties.geojson";
const CITY_EXCEPTIONS_PATH = process.env.GEO_CITY_EXCEPTIONS_PATH ?? "/data/geo/ny_city_exceptions.geojson";

const TBL_COUNTIES = "geo_counties";
const TBL_CITY_EXCEPTIONS = "geo_city_exceptions";

async function ensureGeoTablesExist() {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TBL_COUNTIES} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      geom geometry(MultiPolygon, 4326) NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TBL_CITY_EXCEPTIONS} (
      id SERIAL PRIMARY KEY,
      county TEXT NULL,
      city TEXT NULL,
      geom geometry(MultiPolygon, 4326) NOT NULL
    );
  `);

  // Создаем индексы GIST для быстрого поиска по координатам
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${TBL_COUNTIES}_geom_idx" ON "${TBL_COUNTIES}" USING GIST (geom);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${TBL_CITY_EXCEPTIONS}_geom_idx" ON "${TBL_CITY_EXCEPTIONS}" USING GIST (geom);`);
}

function normalizeCounty(name: string): string {
  return name.replace(/\s+County$/i, "").trim();
}

async function readGeoJson(filePath: string) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(abs, "utf-8");
  return JSON.parse(raw);
}

function toMultiPolygon(geom: any) {
  if (geom.type === "MultiPolygon") return geom;
  return { type: "MultiPolygon", coordinates: [geom.coordinates] };
}

export async function loadAllGeo() {
  await ensureGeoTablesExist();

  // Загружаем округа
  console.log(`Reading counties from ${COUNTIES_PATH}...`);
  const countiesGj = await readGeoJson(COUNTIES_PATH);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TBL_COUNTIES} RESTART IDENTITY;`);
  
  for (const f of countiesGj.features) {
    const name = normalizeCounty(String(f.properties?.NAME ?? f.properties?.name ?? "UNKNOWN"));
    const geom = JSON.stringify(toMultiPolygon(f.geometry));
    await prisma.$executeRawUnsafe(
      `INSERT INTO ${TBL_COUNTIES}(name, geom) VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))`,
      name, geom
    );
  }

  // Загружаем города-исключения
  console.log(`Reading city exceptions from ${CITY_EXCEPTIONS_PATH}...`);
  const citiesGj = await readGeoJson(CITY_EXCEPTIONS_PATH);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TBL_CITY_EXCEPTIONS} RESTART IDENTITY;`);

  for (const f of citiesGj.features) {
    const county = normalizeCounty(String(f.properties?.COUNTY ?? f.properties?.county ?? ""));
    const city = String(f.properties?.CITY ?? f.properties?.city ?? f.properties?.NAME ?? "").trim();
    const geom = JSON.stringify(toMultiPolygon(f.geometry));
    await prisma.$executeRawUnsafe(
      `INSERT INTO ${TBL_CITY_EXCEPTIONS}(county, city, geom) VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))`,
      county, city, geom
    );
  }
}
