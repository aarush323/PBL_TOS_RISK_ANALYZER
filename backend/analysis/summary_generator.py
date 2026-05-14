import json
import logging
import os
import httpx

logger = logging.getLogger(__name__)

SUMMARY_PROMPT_TEMPLATE = """You are a senior legal risk analyst writing a formal risk assessment.

DOCUMENT ANALYSIS DATA:
- Total clauses analyzed: {total_clauses}
- Clauses flagged as risky: {risky_clause_count} ({risky_pct}%)
- NLP pre-filtered (safe): {skipped_llm_count}
- Overall risk level: {overall_risk}
- Total severity score: {total_severity_score}
- Average severity per risky clause: {avg_severity_score}

RISK DISTRIBUTION:
{formatted_risk_breakdown}

CONFIDENCE BREAKDOWN:
- High confidence flags: {high_count}
- Medium confidence flags: {medium_count}
- Low confidence flags: {low_count}

CRITICAL PHRASES DETECTED:
{critical_phrases_found}

TOP 5 MOST SEVERE CLAUSES:
{top_5_clauses_with_explanations}

NLP SIGNAL SUMMARY:
- Clauses with power language: {power_lang_count}
- Clauses with negation patterns: {negation_count}
- Modal verb density: {modal_verb_stats}

Generate two summaries:
1. PROFESSIONAL_SUMMARY: 2-3 sentences. State risk level, dominant concern, and one action.
2. EXECUTIVE_SUMMARY: 4-6 sentences. Cover risk profile, category breakdown, severity distribution, and specific recommendations.

Also extract:
- key_findings: array of {{category, finding, severity}} for each risk category with issues
- top_concern: the single most critical issue
- recommendation: primary action recommendation

Return as JSON with keys: professional_summary, executive_summary, key_findings, top_concern, recommendation.
"""

from settings import CEREBRAS_API_URL, CEREBRAS_MODEL, GROQ_API_URL, GROQ_MODEL


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
                    "max_completion_tokens": 1000,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"Cerebras summary call failed: {e}")

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
                    "max_tokens": 1000,
                    "response_format": {"type": "json_object"},
                },
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"Groq summary call failed: {e}")

    logger.warning("No LLM provider available for summary generation, using template-based fallback")
    return None


def generate_executive_summary(analysis_result: dict) -> dict:
    total_clauses = analysis_result.get("total_clauses", 0)
    risky_clause_count = analysis_result.get("risky_clause_count", 0)
    skipped_llm_count = analysis_result.get("skipped_llm_count", 0)
    overall_risk = analysis_result.get("overall_risk", "Low")
    total_severity_score = analysis_result.get("total_severity_score", 0)
    avg_severity_score = analysis_result.get("avg_severity_score", 0)
    risk_breakdown = analysis_result.get("risk_breakdown", {})
    aggregated = analysis_result.get("aggregated_signals", {})

    risky_pct = round((risky_clause_count / max(1, total_clauses)) * 100, 1)

    formatted_risk_breakdown = "\n".join(
        f"- {cat}: {count} clauses" for cat, count in sorted(risk_breakdown.items(), key=lambda x: -x[1])
    ) if risk_breakdown else "No risk breakdown data"

    conf_dist = aggregated.get("confidence_distribution", {})
    high_count = conf_dist.get("High", 0)
    medium_count = conf_dist.get("Medium", 0)
    low_count = conf_dist.get("Low", 0)

    critical_phrases = aggregated.get("critical_phrases_found", [])
    if critical_phrases:
        critical_phrases_found = "\n".join(
            f"- '{p['phrase']}' in clause #{p['clause_id']}"
            for p in critical_phrases[:10]
        )
    else:
        critical_phrases_found = "None detected"

    top_5 = aggregated.get("top_5_clauses", [])
    if top_5:
        top_5_lines = []
        for i, c in enumerate(top_5):
            cats = ", ".join(c.get("categories", []))
            top_5_lines.append(f"  {i+1}. [SEV {c['severity_score']}] {cats}: {c['text'][:100]}...")
        top_5_clauses_with_explanations = "\n".join(top_5_lines)
    else:
        top_5_clauses_with_explanations = "No severe clauses identified"

    nlp_aggs = aggregated.get("nlp_aggregates", {})
    power_lang_count = nlp_aggs.get("power_language_count", 0)
    negation_count = nlp_aggs.get("negation_count", 0)
    modal_verb_stats = json.dumps(nlp_aggs.get("modal_verb_breakdown", {}))

    prompt = SUMMARY_PROMPT_TEMPLATE.format(
        total_clauses=total_clauses,
        risky_clause_count=risky_clause_count,
        risky_pct=risky_pct,
        skipped_llm_count=skipped_llm_count,
        overall_risk=overall_risk,
        total_severity_score=total_severity_score,
        avg_severity_score=avg_severity_score,
        formatted_risk_breakdown=formatted_risk_breakdown,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        critical_phrases_found=critical_phrases_found,
        top_5_clauses_with_explanations=top_5_clauses_with_explanations,
        power_lang_count=power_lang_count,
        negation_count=negation_count,
        modal_verb_stats=modal_verb_stats,
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
                required = ["professional_summary", "executive_summary", "key_findings", "top_concern", "recommendation"]
                for field in required:
                    if field not in parsed:
                        parsed[field] = parsed.get(field, "" if field != "key_findings" else [])
                parsed["confidence_level"] = "High" if high_count >= medium_count and high_count >= low_count else (
                    "Medium" if medium_count >= low_count else "Low"
                )
                parsed["risk_verdict"] = overall_risk
                parsed["action_required"] = overall_risk in ("High", "Medium")
                return parsed
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse LLM summary response: {e}")

    return _fallback_summary(analysis_result, overall_risk, risky_clause_count, total_clauses, risk_breakdown)


def _fallback_summary(analysis_result, overall_risk, risky_clause_count, total_clauses, risk_breakdown):
    dominant_category = max(risk_breakdown, key=risk_breakdown.get) if risk_breakdown else "none"
    dominant_count = risk_breakdown.get(dominant_category, 0) if risk_breakdown else 0

    if overall_risk == "High":
        professional = f"This document presents a HIGH risk profile with {risky_clause_count} of {total_clauses} clauses flagged. The dominant concern is in {dominant_category} ({dominant_count} clauses). Immediate legal review is recommended before proceeding."
    elif overall_risk == "Medium":
        professional = f"This document presents a MODERATE risk profile with {risky_clause_count} of {total_clauses} clauses flagged. Attention is needed in {dominant_category} and related areas. Recommend targeted negotiation on specific clauses."
    else:
        professional = f"This document presents a LOW risk profile with only {risky_clause_count} of {total_clauses} clauses flagged. Standard legal frameworks are largely followed with minimal concerns identified."

    executive = (
        f"Risk Assessment: {overall_risk}. Total clauses analyzed: {total_clauses}, "
        f"with {risky_clause_count} flagged as potentially risky. "
    )
    if risk_breakdown:
        top_cats = sorted(risk_breakdown.items(), key=lambda x: -x[1])[:3]
        executive += "Category breakdown: " + ", ".join(f"{cat} ({count})" for cat, count in top_cats if count > 0) + ". "
    executive += (
        f"The overall severity score is {analysis_result.get('total_severity_score', 0):.1f} "
        f"with an average of {analysis_result.get('avg_severity_score', 0):.1f} per flagged clause. "
        "Recommendation: Review all flagged clauses with legal counsel and negotiate high-risk terms before signing."
    )

    key_findings = []
    for cat, count in sorted(risk_breakdown.items(), key=lambda x: -x[1]):
        if count > 0:
            severity = "critical" if count >= 5 else ("high" if count >= 3 else "medium" if count >= 1 else "low")
            key_findings.append({
                "category": cat,
                "finding": f"{count} clauses flagged with {severity} severity",
                "severity": severity
            })

    return {
        "professional_summary": professional,
        "executive_summary": executive,
        "key_findings": key_findings,
        "risk_verdict": overall_risk,
        "confidence_level": "Medium",
        "action_required": overall_risk in ("High", "Medium"),
        "top_concern": f"{dominant_category} ({dominant_count} flagged clauses)",
        "recommendation": "Review all flagged clauses with legal counsel. Negotiate modifications to high-severity terms before signing."
    }
