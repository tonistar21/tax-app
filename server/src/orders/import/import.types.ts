export type ImportRow = {
  external_id?: string | null;
  longitude: number;
  latitude: number;
  timestamp: string;
  subtotal: number;
};

export type ImportRowError = {
  row: number;             
  external_id?: string | null;
  reason: string;
};

export type ImportSummary = {
  import_batch_id: string;
  total_rows: number;
  inserted: number;
  failed: number;
  errors: ImportRowError[];
};
