import { prisma } from "../db/prisma.js";

export type ResolvedJurisdiction = {
  county: string;
  city: string | null;
};

export async function resolveJurisdiction(lat: number, lon: number): Promise<ResolvedJurisdiction> {
  const countyRows = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `
    SELECT name
    FROM geo_counties
    WHERE ST_Contains(
      geom,
      ST_SetSRID(ST_Point($1, $2), 4326)
    )
    LIMIT 1
    `,
    lon,
    lat
  );

  if (!countyRows.length) {
    throw new Error("Out of scope: point is not inside New York State counties");
  }

  const county = countyRows[0].name;

  const cityRows = await prisma.$queryRawUnsafe<{ city: string }[]>(
    `
    SELECT city
    FROM geo_city_exceptions
    WHERE county = $1
      AND ST_Contains(
        geom,
        ST_SetSRID(ST_Point($2, $3), 4326)
      )
    LIMIT 1
    `,
    county,
    lon,
    lat
  );

  return { county, city: cityRows.length ? cityRows[0].city : null };
}
