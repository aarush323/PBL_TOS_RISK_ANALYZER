import json
import logging
import os
import httpx

logger = logging.getLogger(__name__)

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODEL = "llama3.1-8b"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"


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
                    "max_completion_tokens": 8000,
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
                    "max_tokens": 8000,
                    "response_format": {"type": "json_object"},
                },
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"Groq report call failed: {e}")

    logger.warning("No LLM provider available for report generation")
    return None


CATEGORY_DEEP_DIVE_PROMPT = """You are a senior legal risk analyst. Based on the analysis data below, generate a deep-dive assessment for each risk category.

CATEGORY DATA:
{category_data}

OVERALL DOCUMENT RISK: {overall_risk}
TOTAL FLAGGED CLAUSES: {risky_count}

For each category that has flagged clauses, provide:
1. assessment: 2-3 sentence narrative explaining what the risks in this category mean
2. specific_concerns: list of actual clause-level concerns (2-3 bullet points)
3. recommendation: what to negotiate or look out for (1-2 sentences)

Return as JSON with keys being the category names. Each value is an object with: assessment, specific_concerns (array), recommendation.
"""

COMPLIANCE_PROMPT = """You are a legal compliance analyst. Based on the analysis data, assess alignment with major privacy regulations.

ANALYSIS DATA:
{analysis_data}

Return as JSON with these sections:
{{
  "gdpr": {{
    "data_collection_transparency": "✅ or ⚠️ or ❌",
    "right_to_deletion": "✅ or ⚠️ or ❌",
    "data_portability": "✅ or ⚠️ or ❌",
    "consent_mechanisms": "✅ or ⚠️ or ❌",
    "notes": "brief explanation string"
  }},
  "ccpa": {{
    "right_to_know": "✅ or ⚠️ or ❌",
    "right_to_opt_out": "✅ or ⚠️ or ❌",
    "non_discrimination": "✅ or ⚠️ or ❌",
    "notes": "brief explanation string"
  }},
  "best_practices": {{
    "plain_language": "✅ or ⚠️ or ❌",
    "change_notification": "✅ or ⚠️ or ❌",
    "dispute_resolution_clarity": "✅ or ⚠️ or ❌",
    "notes": "brief explanation string"
  }}
}}

Use analysis data to determine compliance status. If no Privacy clauses flagged, mark as ✅.
"""

ACTION_PLAN_PROMPT = """You are a legal risk advisor. Based on the analysis below, create an action plan.

ANALYSIS DATA:
{analysis_data}

Return as JSON:
{{
  "immediate_actions": ["action1", "action2", ...],
  "negotiate_before_signing": ["item1", "item2", ...],
  "monitor_and_accept": ["item1", "item2", ...],
  "overall_recommendation": "Sign / Negotiate / Walk Away as string"
}}

Use the severity distribution to determine urgency.
"""


def generate_full_report(analysis_result: dict, source_info: dict) -> dict:
    total_clauses = analysis_result.get("total_clauses", 0)
    risky_count = analysis_result.get("risky_clause_count", 0)
    overall_risk = analysis_result.get("overall_risk", "Low")
    risk_breakdown = analysis_result.get("risk_breakdown", {})
    aggregated = analysis_result.get("aggregated_signals", {})
    clauses = analysis_result.get("clauses", [])
    risky_clauses = [c for c in clauses if c.get("is_risky")]

    category_deep_dives = _generate_category_deep_dives(
        risk_breakdown, risky_clauses, overall_risk, risky_count
    )
    compliance = _generate_compliance_assessment(analysis_result, aggregated)
    action_plan = _generate_action_plan(analysis_result, aggregated)

    top_clauses = sorted(risky_clauses, key=lambda c: c.get("severity_score", 0), reverse=True)[:10]
    critical_clauses_report = []
    for i, c in enumerate(top_clauses):
        critical_clauses_report.append({
            "rank": i + 1,
            "severity_score": c.get("severity_score", 0),
            "category": (c.get("risk_categories") or ["General"])[0],
            "text": c.get("text", ""),
            "explanation": c.get("explanation", ""),
            "why_it_matters": _generate_why_it_matters(c),
            "negotiation_suggestion": _generate_negotiation_suggestion(c),
        })

    severity_dist = aggregated.get("severity_distribution", {})
    conf_dist = aggregated.get("confidence_distribution", {})
    risk_conc = aggregated.get("risk_concentration", {})

    report_id = str(hash(str(source_info.get("value", "")) + str(analysis_result.get("source", ""))))[:12]
    if report_id.startswith("-"):
        report_id = "R" + report_id[1:8]
    else:
        report_id = "R" + report_id[:8]

    from datetime import datetime, timezone
    return {
        "report_metadata": {
            "report_id": report_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "document_source": source_info.get("value", "Unknown"),
            "analysis_engine": "Jurist AI v2.0",
        },
        "executive_dashboard": {
            "safety_score": analysis_result.get("total_severity_score", 0),
            "overall_risk_level": overall_risk,
            "total_clauses_analyzed": total_clauses,
            "total_flagged": risky_count,
            "ai_deep_scan_coverage": f"{round(((total_clauses - analysis_result.get('skipped_llm_count', 0)) / max(1, total_clauses)) * 100)}%",
            "quick_verdict": analysis_result.get("professional_summary", ""),
        },
        "executive_summary": analysis_result.get("executive_summary", ""),
        "key_findings": analysis_result.get("key_findings", []),
        "category_deep_dives": category_deep_dives,
        "compliance_assessment": compliance,
        "critical_clauses": critical_clauses_report,
        "risk_distribution_analysis": {
            "severity_distribution": severity_dist,
            "risk_concentration": risk_conc,
            "confidence_distribution": conf_dist,
            "category_cross_correlation": aggregated.get("category_cross_correlation", {}),
        },
        "action_plan": action_plan,
        "analysis_transparency": {
            "total_clauses": total_clauses,
            "nlp_pre_filtered": analysis_result.get("skipped_llm_count", 0),
            "llm_deep_scanned": total_clauses - analysis_result.get("skipped_llm_count", 0),
            "high_confidence_flags": conf_dist.get("High", 0),
            "medium_confidence_flags": conf_dist.get("Medium", 0),
            "low_confidence_flags": conf_dist.get("Low", 0),
        },
        "appendix_all_flagged": [
            {
                "id": c.get("id"),
                "text": c.get("text", ""),
                "categories": c.get("risk_categories", []),
                "severity_score": c.get("severity_score", 0),
                "confidence": c.get("confidence", "Low"),
                "explanation": c.get("explanation", ""),
            }
            for c in sorted(risky_clauses, key=lambda x: x.get("severity_score", 0), reverse=True)
        ],
    }


def _generate_category_deep_dives(risk_breakdown, risky_clauses, overall_risk, risky_count):
    category_data_parts = []
    clause_by_cat = {}
    for c in risky_clauses:
        for cat in c.get("risk_categories", []):
            clause_by_cat.setdefault(cat, []).append(c)

    for cat, count in sorted(risk_breakdown.items(), key=lambda x: -x[1]):
        if count == 0:
            continue
        cat_clauses = clause_by_cat.get(cat, [])
        texts = "\n".join(f"  - {c.get('text', '')[:200]}" for c in cat_clauses[:3])
        category_data_parts.append(
            f"Category: {cat}\nCount: {count}\nSample clauses:\n{texts}"
        )

    if not category_data_parts:
        return {}

    prompt = CATEGORY_DEEP_DIVE_PROMPT.format(
        category_data="\n\n".join(category_data_parts),
        overall_risk=overall_risk,
        risky_count=risky_count,
    )

    llm_output = _call_llm(prompt)
    if llm_output:
        try:
            import re
            cleaned_output = re.sub(r"```json\s*", "", llm_output)
            cleaned_output = re.sub(r"```", "", cleaned_output).strip()
            match = re.search(r"\{.*\}", cleaned_output, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
                
                # Check if parsed keys actually match categories
                if any(cat in parsed for cat in risk_breakdown.keys()):
                    return parsed
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse category deep dives: {e}")

    # Stronger fallback logic
    result = {}
    for cat, count in sorted(risk_breakdown.items(), key=lambda x: -x[1]):
        if count == 0:
            continue
        top_clauses = clause_by_cat.get(cat, [])[:3]
        total_sev = sum([c.get("severity_score", 0) for c in clause_by_cat.get(cat, [])])
        avg_sev = total_sev / count if count > 0 else 0
        
        sev_level = "critically high" if avg_sev >= 7 else "elevated" if avg_sev >= 5 else "moderate" if avg_sev >= 3 else "low"
        
        result[cat] = {
            "assessment": f"{count} clauses flagged under {cat} with average severity {avg_sev:.1f}/10 ({sev_level} risk). " + (
                "Review immediately before proceeding." if avg_sev >= 5 else "Standard legal review recommended."
            ),
            "specific_concerns": [f"Clause #{(c.get('id', 0)) + 1} (Sev {c.get('severity_score', 0):.1f}): {c.get('explanation', '')[:150]}" for c in top_clauses],
            "recommendation": f"Negotiate modifications to high severity terms in {cat} clauses.",
            "clause_count": count,
            "avg_severity": float(f"{avg_sev:.1f}")
        }
    return result


def _generate_compliance_assessment(analysis_result, aggregated):
    privacy_count = analysis_result.get("risk_breakdown", {}).get("Privacy Risk", 0)
    user_rights_count = analysis_result.get("risk_breakdown", {}).get("User Rights Risk", 0)

    prompt = COMPLIANCE_PROMPT.format(
        analysis_data=json.dumps({
            "privacy_risk_count": privacy_count,
            "user_rights_count": user_rights_count,
            "total_risky": analysis_result.get("risky_clause_count", 0),
            "overall_risk": analysis_result.get("overall_risk", "Low"),
        })
    )

    llm_output = _call_llm(prompt)
    if llm_output:
        try:
            import re
            match = re.search(r"\{.*\}", llm_output, re.DOTALL)
            if match:
                return json.loads(match.group())
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse compliance assessment: {e}")

    gdpr_status = "⚠️" if privacy_count > 0 else "✅"
    ccpa_status = "⚠️" if privacy_count > 1 else "✅"
    rights_status = "⚠️" if user_rights_count > 0 else "✅"

    return {
        "gdpr": {
            "data_collection_transparency": gdpr_status,
            "right_to_deletion": rights_status,
            "data_portability": rights_status,
            "consent_mechanisms": gdpr_status,
            "notes": f"Privacy Risk clauses: {privacy_count}. User Rights clauses: {user_rights_count}.",
        },
        "ccpa": {
            "right_to_know": ccpa_status,
            "right_to_opt_out": ccpa_status,
            "non_discrimination": "✅",
            "notes": f"Based on {privacy_count} privacy-related flagged clauses.",
        },
        "best_practices": {
            "plain_language": "⚠️",
            "change_notification": rights_status,
            "dispute_resolution_clarity": gdpr_status,
            "notes": "Review recommended for plain language compliance.",
        },
    }


def _generate_action_plan(analysis_result, aggregated):
    severity_dist = aggregated.get("severity_distribution", {})
    overall_risk = analysis_result.get("overall_risk", "Low")
    risky_count = analysis_result.get("risky_clause_count", 0)

    immediate = severity_dist.get("critical", 0) + severity_dist.get("high", 0)
    negotiate = severity_dist.get("medium", 0)

    prompt = ACTION_PLAN_PROMPT.format(
        analysis_data=json.dumps({
            "overall_risk": overall_risk,
            "total_risky": risky_count,
            "severity_distribution": severity_dist,
            "immediate_count": immediate,
            "negotiate_count": negotiate,
        })
    )

    llm_output = _call_llm(prompt)
    if llm_output:
        try:
            import re
            match = re.search(r"\{.*\}", llm_output, re.DOTALL)
            if match:
                return json.loads(match.group())
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse action plan: {e}")

    if overall_risk == "High":
        rec = "Negotiate"
    elif overall_risk == "Medium":
        rec = "Negotiate with caution"
    else:
        rec = "Sign"

    return {
        "immediate_actions": [
            f"Review {severity_dist.get('critical', 0)} critical severity clauses with legal counsel",
            "Do not sign until critical clauses are amended",
        ] if immediate > 0 else ["No immediate critical actions required"],
        "negotiate_before_signing": [
            f"Request modifications to {negotiate} medium-severity clauses",
            "Seek clarification on ambiguous terms",
        ] if negotiate > 0 else ["Review terms before signing"],
        "monitor_and_accept": [
            "Low-severity clauses are generally acceptable but worth monitoring",
            "Review clauses if business context changes",
        ],
        "overall_recommendation": rec,
    }


def _generate_why_it_matters(clause):
    categories = clause.get("risk_categories", [])
    if "Privacy Risk" in categories:
        return "This could expose your personal data to unauthorized sharing or sale."
    if "Legal Risk" in categories:
        return "This may limit your legal recourse and ability to challenge the provider in court."
    if "Financial Risk" in categories:
        return "This could result in unexpected charges, non-refundable payments, or automatic renewals."
    if "User Rights Risk" in categories:
        return "This reduces your control over content you create and your ability to use the service freely."
    if "Security Risk" in categories:
        return "This may leave you vulnerable to data breaches without adequate protection or recourse."
    return "This clause could have significant implications for your rights and obligations."


def _generate_negotiation_suggestion(clause):
    categories = clause.get("risk_categories", [])
    if "Privacy Risk" in categories:
        return "Request opt-in consent for data sharing and clearer data retention policies."
    if "Legal Risk" in categories:
        return "Seek mutual arbitration terms and removal of class action waivers."
    if "Financial Risk" in categories:
        return "Negotiate refund terms and advance notice requirements for price changes."
    if "User Rights Risk" in categories:
        return "Request notice periods for account termination and content retention rights."
    if "Security Risk" in categories:
        return "Demand industry-standard security measures and breach notification commitments."
    return "Review with legal counsel for specific negotiation recommendations."
