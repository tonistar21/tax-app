export type OrderDto = {
  id: string;
  import_batch_id: string | null;
  import_row_number: number | null;
  external_id: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  subtotal: number;

  composite_tax_rate: number;
  tax_amount: number;
  total_amount: number;

  breakdown: {
    state_rate: number;
    county_rate: number;
    city_rate: number;
    special_rates: Array<{ name: string; rate: number }>;
  };

  jurisdictions: any;
  source?: string;
};

export type OrdersListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: OrderDto[];
};

export type ImportRowError = {
  row: number;
  external_id: string | null;
  reason: string;
};

export type ImportResponse = {
  import_batch_id: string;
  total_rows: number;
  inserted: number;
  failed: number;
  errors: ImportRowError[];
};
export type OrdersSummary = {
  total: number;
  ny_state: number;
  out_of_state: number;
  revenue_total: number;
  tax_total: number;
  grand_total: number;
};

export type OrdersAnalytics = {
  top_counties: Array<{ county: string | null; subtotal: number }>;
};
export type FilingSummaryRow = {
  reporting_code: string;
  county: string | null;
  city: string | null;
  effective_date: string | null;
  mctd_included: boolean;

  orders_count: number;
  taxable_sales: number;
  tax_total: number;
  grand_total: number;
};

export type FilingSummaryResponse = {
  period: { date_from: string | null; date_to: string | null };
  totals: {
    orders_count: number;
    taxable_sales: number;
    tax_total: number;
    grand_total: number;
  };
  items: FilingSummaryRow[];
};

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
