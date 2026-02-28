export type FilingRow = {
  reporting_code: string;
  county: string | null;
  city: string | null;
  taxable_sales: number; 
  tax_collected: number; 
};

export type FilingSummaryResponse = {
  date_from: string | null;
  date_to: string | null;

  rows: FilingRow[];

  totals: {
    taxable_sales: number;
    tax_collected: number;
    grand_total: number;
    jurisdictions_count: number;
  };
};
