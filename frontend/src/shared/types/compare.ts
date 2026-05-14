export interface CompareHistoryItem {
  compare_id: string;
  created_at: string;
  source_a?: string;
  source_b?: string;
}

export interface CompareDocSummary {
  label?: string;
  source?: string;
  score?: number;
  risk?: string;
  risky_clause_count?: number;
  total_clauses?: number;
}

export interface CompareCategoryResult {
  category: string;
  doc_a_risk_count?: number;
  doc_b_risk_count?: number;
  clauses_a?: number;
  clauses_b?: number;
  reasoning?: string;
}

export interface CompareResult {
  doc_a?: CompareDocSummary;
  doc_b?: CompareDocSummary;
  categories?: CompareCategoryResult[];
  overall_winner?: 'A' | 'B' | 'tie' | string;
  verdict?: string;
}
