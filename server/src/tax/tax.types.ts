export type SpecialRate = {
  name: string;
  rate: number; 
};

export type JurisdictionMatch = {
  source: "pub718";
  effectiveDate: string;
  matchedKey: string; 
  reportingCode?: string | null;

  county?: string | null;
  city?: string | null;

  compositeRate: number; 
  mctdIncluded: boolean;
};
