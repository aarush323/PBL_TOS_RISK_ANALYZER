from .segmenter import segment_clauses
from .nlp_features import extract_features, is_likely_risky
from .classifier import classify_clause, classify_batch
from .cancellation import is_cancelled
from .scoring import compute_risk_score
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

MIN_BATCH = 3
MAX_BATCH = 10
_current_batch_size = MAX_BATCH
MAX_WORKERS = 3



CATEGORY_WEIGHTS = {
    "Privacy Risk": 2.0,
    "Legal Risk": 1.8,
    "Security Risk": 1.5,
    "Financial Risk": 1.2,
    "User Rights Risk": 1.0
}

CRITICAL_PHRASES = {
    "class action waiver": 3.0,
    "binding arbitration": 2.5,
    "irrevocable license": 2.5,
    "sell your data": 3.0,
    "non-refundable": 1.5,
    "terminate your account": 2.0,
    "sole discretion": 1.5,
    "as is": 1.5,
    "indemnify": 1.8,
    "limitation of liability": 1.8
}


def compute_overall_risk(risk_score: int) -> str:
    """Label risk based on the 0-100 risk_score."""
    if risk_score >= 55:
        return "High"
    if risk_score >= 30:
        return "Medium"
    return "Low"


def compute_position_weight(index: int, total: int) -> float:
    """Higher weight for clauses in earlier sections (usually contain critical terms)."""
    if total <= 0:
        return 1.0
    position = index / total
    if position < 0.15:
        return 1.5
    elif position < 0.30:
        return 1.3
    elif position < 0.50:
        return 1.0
    else:
        return 0.8


def _classify_batch_worker(batch_index: int, total_batches: int,
                           clauses: list[dict],
                           features_list: list[dict],
                           job_id: str = None) -> list[dict]:
    """Worker function for ThreadPoolExecutor. Classifies one batch."""
    global _current_batch_size
    if job_id and is_cancelled(job_id):
        raise Exception("Job cancelled by user")
    
    logger.info(f"Classifying batch {batch_index + 1}/{total_batches} "
                f"({len(clauses)} clauses)...")
    try:
        result = classify_batch(clauses, features_list)
        _current_batch_size = min(_current_batch_size + 1, MAX_BATCH)
        return result
    except Exception as e:
        logger.error(f"Batch {batch_index + 1}/{total_batches} failed: {e}. Falling back to per-clause.")
        _current_batch_size = max(_current_batch_size // 2, MIN_BATCH)
        
        fallback_results = []
        for c, f in zip(clauses, features_list):
            fallback_results.append(classify_clause(c, f))
        return fallback_results


def analyze_document(extraction_result: dict, job_id: str = None) -> dict:
    source = extraction_result.get("source", "unknown")
    paragraphs = extraction_result["paragraphs"]

    logger.info(f"Analyzing document from {source}...")

    clauses = segment_clauses(paragraphs)
    logger.info(f"Segmented {len(clauses)} clauses")

    results = []
    llm_clauses = []
    llm_features = []
    skipped = 0

    for clause in clauses:
        features = extract_features(clause["text"])

        if not is_likely_risky(features, clause["text"]):
            skipped += 1
            results.append({
                **clause,
                "nlp_features": features,
                "is_risky": False,
                "risk_categories": [],
                "confidence": "Low",
                "explanation": None,
                "severity_score": 0.0,
                "skipped_llm": True
            })
        else:
            llm_clauses.append(clause)
            llm_features.append(features)

    logger.info(f"NLP filter: {len(llm_clauses)} clauses flagged for LLM, "
                f"{skipped} skipped")

    if llm_clauses:

        batches_clauses = [
            llm_clauses[i:i + _current_batch_size]
            for i in range(0, len(llm_clauses), _current_batch_size)
        ]
        batches_features = [
            llm_features[i:i + _current_batch_size]
            for i in range(0, len(llm_features), _current_batch_size)
        ]
        total_batches = len(batches_clauses)
        logger.info(f"Created {total_batches} batches (batch_size={_current_batch_size})")
        batch_results_map = {}
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_idx = {
                executor.submit(
                    _classify_batch_worker,
                    idx, total_batches,
                    batches_clauses[idx], batches_features[idx],
                    job_id
                ): idx
                for idx in range(total_batches)
            }
            for future in as_completed(future_to_idx):
                if job_id and is_cancelled(job_id):
                    logger.warning(f"Job {job_id} cancellation detected in orchestrator loop.")
                    executor.shutdown(wait=False, cancel_futures=True)
                    raise Exception("Job cancelled by user")
                    
                idx = future_to_idx[future]
                try:
                    batch_results_map[idx] = future.result()
                except Exception as e:
                    logger.error(f"Batch {idx + 1}/{total_batches} thread failed: {e}")
                    fallback = []
                    for c, f in zip(batches_clauses[idx], batches_features[idx]):
                        fallback.append(classify_clause(c, f))
                    batch_results_map[idx] = fallback

        for idx in range(total_batches):
            batch_cls = batch_results_map[idx]
            for clause, features, classification in zip(
                batches_clauses[idx], batches_features[idx], batch_cls
            ):
                logger.info(
                    f"Clause {clause['id']}: "
                    f"risky={classification['is_risky']}, "
                    f"categories={classification.get('risk_categories', [])}"
                )
                results.append({
                    **clause,
                    "nlp_features": features,
                    **classification,
                    "skipped_llm": False
                })


    risky = [r for r in results if r.get("is_risky")]
    risk_breakdown = {
        "Privacy Risk": 0,
        "Legal Risk": 0,
        "User Rights Risk": 0,
        "Security Risk": 0,
        "Financial Risk": 0
    }
    for r in risky:
        for cat in r.get("risk_categories", []):
            if cat in risk_breakdown:
                risk_breakdown[cat] += 1

    risk_score = compute_risk_score(risky)
    overall_risk = compute_overall_risk(risk_score)

    total_severity = sum(c.get("severity_score", 0) for c in risky)
    avg_severity = total_severity / len(risky) if risky else 0

    for i, clause in enumerate(results):
        clause["position_weight"] = round(compute_position_weight(i, len(results)), 2)

    logger.info(
        f"Analysis complete: {len(risky)}/{len(clauses)} risky, "
        f"overall={overall_risk}, score={risk_score}, skipped={skipped}"
    )

    return {
        "source": source,
        "source_type": extraction_result.get("source_type"),
        "total_clauses": len(clauses),
        "risky_clause_count": len(risky),
        "skipped_llm_count": skipped,
        "overall_risk": overall_risk,
        "risk_score": risk_score,
        "risk_breakdown": risk_breakdown,
        "clauses": results,
        "avg_severity_score": round(avg_severity, 2),
        "aggregated_signals": aggregate_signals(results, risky)
    }


def aggregate_signals(results: list[dict], risky: list[dict]) -> dict:
    confidence_counts = {"High": 0, "Medium": 0, "Low": 0}
    for r in risky:
        c = r.get("confidence", "Low")
        if c in confidence_counts:
            confidence_counts[c] += 1

    critical_phrases_found = []
    for r in risky:
        text_lower = r.get("text", "").lower()
        for phrase in CRITICAL_PHRASES:
            if phrase in text_lower:
                critical_phrases_found.append({
                    "phrase": phrase,
                    "clause_id": r.get("id"),
                    "clause_text": r.get("text", "")[:120]
                })

    power_lang_count = 0
    negation_count = 0
    modal_verb_counts = {}
    total_modal = 0

    for r in results:
        nlp = r.get("nlp_features", {})
        if nlp.get("has_power_language") or nlp.get("triggered_categories"):
            power_lang_count += 1
        if nlp.get("has_negation"):
            negation_count += 1
        for mv in nlp.get("modal_verbs", []):
            modal_verb_counts[mv] = modal_verb_counts.get(mv, 0) + 1
            total_modal += 1

    all_categories = ["Privacy Risk", "Legal Risk", "Security Risk", "Financial Risk", "User Rights Risk"]
    cross_correlation = {}
    for r in risky:
        cats = r.get("risk_categories", [])
        for i, c1 in enumerate(cats):
            for c2 in cats[i+1:]:
                key = tuple(sorted([c1, c2]))
                cross_correlation[key] = cross_correlation.get(key, 0) + 1

    correlation_matrix = {}
    for (c1, c2), count in cross_correlation.items():
        pair_key = f"{c1} + {c2}"
        correlation_matrix[pair_key] = count

    total_risky = len(results)
    front_weight = 0
    back_weight = 0
    for r in risky:
        pw = r.get("position_weight", 1.0)
        if pw >= 1.3:
            front_weight += 1
        elif pw <= 0.8:
            back_weight += 1

    severity_distribution = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
    }
    for r in risky:
        sev = r.get("severity_score", 0)
        if sev >= 4:
            severity_distribution["critical"] += 1
        elif sev >= 3:
            severity_distribution["high"] += 1
        elif sev >= 2:
            severity_distribution["medium"] += 1
        else:
            severity_distribution["low"] += 1

    risk_concentration = {}
    if total_risky > 0:
        risk_concentration["front_loaded_pct"] = round((front_weight / total_risky) * 100, 1) if total_risky else 0
        risk_concentration["back_loaded_pct"] = round((back_weight / total_risky) * 100, 1) if total_risky else 0
        if risk_concentration.get("front_loaded_pct", 0) > 50:
            risk_concentration["verdict"] = "Risks are front-loaded — critical clauses appear early in document"
        elif risk_concentration.get("back_loaded_pct", 0) > 50:
            risk_concentration["verdict"] = "Risks are back-loaded — critical clauses appear later in document"
        else:
            risk_concentration["verdict"] = "Risks are evenly distributed throughout document"

    top_risky_by_severity = sorted(risky, key=lambda r: r.get("severity_score", 0), reverse=True)[:5]
    top_5_formatted = []
    for r in top_risky_by_severity:
        top_5_formatted.append({
            "id": r.get("id"),
            "text": (r.get("text", "") or "")[:150],
            "categories": r.get("risk_categories", []),
            "severity_score": r.get("severity_score", 0),
            "explanation": r.get("explanation", "")
        })

    return {
        "confidence_distribution": confidence_counts,
        "critical_phrases_found": critical_phrases_found[:20],
        "nlp_aggregates": {
            "power_language_count": power_lang_count,
            "negation_count": negation_count,
            "modal_verb_total": total_modal,
            "modal_verb_breakdown": modal_verb_counts
        },
        "category_cross_correlation": correlation_matrix,
        "risk_concentration": risk_concentration,
        "severity_distribution": severity_distribution,
        "top_5_clauses": top_5_formatted
    }
