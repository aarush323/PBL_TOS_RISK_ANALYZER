import json
import logging
import os
import httpx
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODEL = "llama3.1-8b"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

UNIFIED_REPORT_PROMPT = """You are a senior legal risk strategist. Based on the analysis data provided, generate a comprehensive, professional risk report in JSON format.

DOCUMENT CONTEXT:
- Source: {source}
- Risk Score: {risk_score}/100
- Total Flagged Clauses: {risky_count}
- Category Breakdown: {risk_breakdown}

TOP 10 CRITICAL CLAUSES (Ranked by Severity):
{top_clauses_text}

OUTPUT STRUCTURE (Return ONLY valid JSON):
{{
  "executive_summary": "A high-level 3-4 sentence narrative of the document's risk profile.",
  "key_findings": ["Point 1", "Point 2", "Point 3"],
  "category_analysis": {{
     "Category Name": {{
        "assessment": "Assessment of risks in this category.",
        "recommendation": "Advice for this category."
     }}
  }},
  "compliance_check": {{
     "gdpr": "Brief note on GDPR alignment.",
     "ccpa": "Brief note on CCPA alignment.",
     "industry_standards": "Comparison to standard transparency norms."
  }},
  "critical_clauses": [
     {{
        "rank": 1,
        "text": "Clause text",
        "reason": "Classifier reason",
        "impact": "What this means for the user",
        "mitigation": "How to negotiate or fix"
     }}
  ],
  "action_plan": {{
     "immediate": ["Action 1"],
     "negotiate": ["Negotiation point 1"],
     "monitor": ["Monitor point 1"],
     "final_verdict": "Concise final advice"
  }}
}}
"""

def _call_llm(prompt: str) -> str:
    cerebras_key = os.environ.get("CEREBRAS_API_KEY")
    if cerebras_key:
        try:
            response = httpx.post(
                CEREBRAS_API_URL,
                headers={
                    "Authorization": f"Bearer {cerebras_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": CEREBRAS_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                    "max_completion_tokens": 4000,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"Cerebras report call failed: {e}")

    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        try:
            response = httpx.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {groq_key}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 4000,
                    "response_format": {"type": "json_object"},
                },
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"Groq report call failed: {e}")

    return None

def generate_full_report(analysis_result: dict, source_info: dict) -> dict:
    source = source_info.get("value", "Unknown Document")
    risk_score = analysis_result.get("risk_score", 0)
    risky_count = analysis_result.get("risky_clause_count", 0)
    risk_breakdown = analysis_result.get("risk_breakdown", {})
    clauses = analysis_result.get("clauses", [])
    
    risky_clauses = sorted(
        [c for c in clauses if c.get("is_risky")],
        key=lambda x: x.get("severity_score", 0),
        reverse=True
    )[:10]

    top_clauses_text = ""
    for i, c in enumerate(risky_clauses, 1):
        top_clauses_text += f"[{i}] SEVERITY: {c.get('severity_score')} | CATEGORY: {c.get('risk_categories')}\n"
        top_clauses_text += f"TEXT: {c.get('text', '')[:400]}\n"
        top_clauses_text += f"REASON: {c.get('explanation', '')}\n\n"

    prompt = UNIFIED_REPORT_PROMPT.format(
        source=source,
        risk_score=risk_score,
        risky_count=risky_count,
        risk_breakdown=json.dumps(risk_breakdown),
        top_clauses_text=top_clauses_text
    )

    llm_content = _call_llm(prompt)
    report_data = {}
    if llm_content:
        try:
            report_data = json.loads(llm_content)
        except Exception as e:
            logger.error(f"Failed to parse unified report JSON: {e}")

    # Merge rank data for UI consistency if needed
    if "critical_clauses" in report_data:
        for i, c in enumerate(report_data["critical_clauses"]):
            c["rank"] = i + 1
            if i < len(risky_clauses):
                # Ensure we have the original severity and category just in case
                c["severity_score"] = risky_clauses[i].get("severity_score")
                c["category"] = (risky_clauses[i].get("risk_categories") or ["General"])[0]

    report_id = f"R-{str(hash(source))[-8:]}"
    
    return {
        "report_metadata": {
            "report_id": report_id.replace("-", ""),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "document_source": source,
            "risk_score": risk_score,
        },
        "executive_summary": report_data.get("executive_summary", "Detailed risk analysis is complete."),
        "key_findings": report_data.get("key_findings", []),
        "category_analysis": report_data.get("category_analysis", {}),
        "compliance_check": report_data.get("compliance_check", {}),
        "critical_clauses": report_data.get("critical_clauses", []),
        "action_plan": report_data.get("action_plan", {}),
        # Legacy fields for frontend compatibility
        "executive_dashboard": {
            "risk_score": risk_score,
            "overall_risk_level": "High" if risk_score >= 60 else "Medium" if risk_score >= 30 else "Low",
            "total_flagged": risky_count,
            "quick_verdict": report_data.get("action_plan", {}).get("final_verdict", "")
        }
    }
