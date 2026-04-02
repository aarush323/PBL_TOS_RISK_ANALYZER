from .segmenter import segment_clauses
from .nlp_features import extract_features, is_likely_risky
from .classifier import classify_clause, classify_batch
from .cancellation import is_cancelled
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


def compute_clause_severity(clause: dict) -> float:
    """Compute severity score for a single clause based on multiple factors."""
    severity = 0.0
    
    confidence_weights = {"High": 1.0, "Medium": 0.6, "Low": 0.3}
    severity += confidence_weights.get(clause.get("confidence", "Low"), 0.3)
    
    categories = clause.get("risk_categories", [])
    for cat in categories:
        severity += CATEGORY_WEIGHTS.get(cat, 1.0)
    
    text_lower = clause.get("text", "").lower()
    for phrase, weight in CRITICAL_PHRASES.items():
        if phrase in text_lower:
            severity += weight
    
    return round(severity, 2)


def compute_overall_risk(risky_clauses: list[dict], total: int) -> str:
    if not risky_clauses:
        return "Low"
    
    high_count = sum(1 for c in risky_clauses if c["confidence"] == "High")
    medium_count = sum(1 for c in risky_clauses if c["confidence"] == "Medium")
    low_count = sum(1 for c in risky_clauses if c["confidence"] == "Low")
    
    ratio = len(risky_clauses) / total if total > 0 else 0
    
    total_severity = sum(compute_clause_severity(c) for c in risky_clauses)
    avg_severity = total_severity / len(risky_clauses) if risky_clauses else 0
    
    privacy_count = sum(1 for c in risky_clauses if "Privacy Risk" in c.get("risk_categories", []))
    legal_count = sum(1 for c in risky_clauses if "Legal Risk" in c.get("risk_categories", []))
    
    if (high_count >= 3 and avg_severity >= 3.5) or (total_severity >= 15 and high_count >= 3):
        return "High"
    if high_count >= 2:
        if privacy_count >= 1 and legal_count >= 1:
            return "High"
    if high_count >= 2 or ratio >= 0.30 or total_severity >= 8.0:
        return "High"
    if high_count >= 1 or ratio >= 0.15 or total_severity >= 4.0:
        return "Medium"
    if medium_count >= 3 or ratio >= 0.08 or avg_severity >= 2.0:
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

    overall_risk = compute_overall_risk(risky, len(clauses))

    total_severity = sum(compute_clause_severity(c) for c in risky)
    avg_severity = total_severity / len(risky) if risky else 0

    for i, clause in enumerate(results):
        clause["position_weight"] = round(compute_position_weight(i, len(results)), 2)

    logger.info(
        f"Analysis complete: {len(risky)}/{len(clauses)} risky, "
        f"overall={overall_risk}, severity={avg_severity:.2f}, skipped={skipped}"
    )

    return {
        "source": source,
        "source_type": extraction_result.get("source_type"),
        "total_clauses": len(clauses),
        "risky_clause_count": len(risky),
        "skipped_llm_count": skipped,
        "overall_risk": overall_risk,
        "total_severity_score": round(total_severity, 2),
        "avg_severity_score": round(avg_severity, 2),
        "risk_breakdown": risk_breakdown,
        "clauses": results
    }
