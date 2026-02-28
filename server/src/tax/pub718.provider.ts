import fs from "node:fs";
import path from "node:path";

type Pub718Record =
  | { kind: "county"; name: string; rate: number; reportingCode: string; mctdIncluded: boolean }
  | { kind: "city_exception"; county: string; name: string; rate: number; reportingCode: string; mctdIncluded: boolean };

type Pub718Data = {
  effectiveDate: string;
  jurisdictions: Pub718Record[];
};

function loadPub718(): Pub718Data {
  const p = path.resolve(process.cwd(), "../data/pub718_2025-03-01.json");
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as Pub718Data;
}

const PUB718 = loadPub718();

export function lookupByCountyCity(input: { county: string; city?: string | null }) {
  const county = input.county.trim();
  const city = (input.city ?? "").trim();

  if (city) {
    const hit = PUB718.jurisdictions.find(
      (j) => j.kind === "city_exception" && j.county.toLowerCase() === county.toLowerCase() && j.name.toLowerCase() === city.toLowerCase()
    );
    if (hit && hit.kind === "city_exception") {
      return {
        source: "pub718" as const,
        effectiveDate: PUB718.effectiveDate,
        matchedKey: `city_exception:${hit.county}:${hit.name}`,
        reportingCode: hit.reportingCode,
        county: hit.county,
        city: hit.name,
        compositeRate: hit.rate,
        mctdIncluded: hit.mctdIncluded,
      };
    }
  }

  const hitCounty = PUB718.jurisdictions.find(
    (j) => j.kind === "county" && j.name.toLowerCase() === county.toLowerCase()
  );

  if (!hitCounty || hitCounty.kind !== "county") {
    throw new Error(`No tax rate found for county="${county}" (city="${city}") in pub718 dataset`);
  }

  return {
    source: "pub718" as const,
    effectiveDate: PUB718.effectiveDate,
    matchedKey: `county:${hitCounty.name}`,
    reportingCode: hitCounty.reportingCode,
    county: hitCounty.name,
    city: null,
    compositeRate: hitCounty.rate,
    mctdIncluded: hitCounty.mctdIncluded,
  };
}
