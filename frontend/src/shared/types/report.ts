export interface ReportMetadata {
  report_id: string;
  generated_at: string;
  document_source?: string;
  analysis_engine?: string;
}

export interface ExecutiveDashboard {
  safety_score: number;
  overall_risk_level: string;
  total_clauses_analyzed: number;
  total_flagged: number;
  ai_deep_scan_coverage: string;
  quick_verdict?: string;
}

export interface ReportPayload {
  report_metadata: ReportMetadata;
  executive_dashboard: ExecutiveDashboard;
  executive_summary?: string;
  key_findings?: Array<Record<string, unknown>>;
  category_deep_dives?: Record<string, unknown>;
  compliance_assessment?: Record<string, unknown>;
  critical_clauses?: Array<Record<string, unknown>>;
  risk_distribution_analysis?: Record<string, unknown>;
  action_plan?: Record<string, unknown>;
  analysis_transparency?: Record<string, unknown>;
  appendix_all_flagged?: Array<Record<string, unknown>>;
}
