export interface Clause {
  id?: number;
  text?: string;
  explanation?: string;
  is_risky?: boolean;
  severity_score?: number;
  confidence?: string;
  risk_categories?: string[];
  position_weight?: number;
}

export interface RiskBreakdownItem {
  category?: string;
  count?: number;
}

export interface AnalysisSignals {
  severity_distribution?: Record<string, number>;
  risk_concentration?: Record<string, number>;
  confidence_distribution?: Record<string, number>;
  category_cross_correlation?: Record<string, number>;
}

export interface AnalysisResult {
  overall_risk?: string;
  safety_score?: number;
  risky_clause_count?: number;
  total_clauses?: number;
  avg_severity_score?: number;
  total_severity_score?: number;
  clauses?: Clause[];
  executive_summary?: string;
  professional_summary?: string;
  key_findings?: Array<Record<string, unknown>>;
  aggregated_signals?: AnalysisSignals;
  skipped_llm_count?: number;
  risk_breakdown?: Record<string, number> | RiskBreakdownItem[];
  top_concern?: unknown;
  confidence_level?: string;
}

export interface SourceInfo {
  type?: 'url' | 'pdf' | 'text' | null;
  value?: string | null;
  blobUrl?: string;
}
