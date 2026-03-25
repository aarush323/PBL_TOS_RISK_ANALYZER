from .segmenter import segment_clauses
from .nlp_features import extract_features, is_likely_risky
from .classifier import classify_clause, classify_batch
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

MIN_BATCH = 3
MAX_BATCH = 10
_current_batch_size = MAX_BATCH
MAX_WORKERS = 3

RISK_SCORE_MAP = {"High": 3, "Medium": 2, "Low": 1}


def compute_overall_risk(risky_clauses: list[dict], total: int) -> str:
    if not risky_clauses:
        return "Low"
    high_count = sum(1 for c in risky_clauses if c["confidence"] == "High")
    ratio = len(risky_clauses) / total
    if high_count >= 3 or ratio > 0.3:
        return "High"
    elif high_count >= 1 or ratio > 0.15:
        return "Medium"
    return "Low"


def _classify_batch_worker(batch_index: int, total_batches: int,
                           clauses: list[dict],
                           features_list: list[dict]) -> list[dict]:
    """Worker function for ThreadPoolExecutor. Classifies one batch."""
    global _current_batch_size
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


def analyze_document(extraction_result: dict) -> dict:
    source = extraction_result.get("source", "unknown")
    paragraphs = extraction_result["paragraphs"]

    logger.info(f"Analyzing document from {source}...")

    # Step 1: Segmentation
    clauses = segment_clauses(paragraphs)
    logger.info(f"Segmented {len(clauses)} clauses")

    # Step 2: NLP feature extraction + filtering
    results = []
    llm_clauses = []      # clauses that need LLM
    llm_features = []     # matching features
    skipped = 0

    for clause in clauses:
        features = extract_features(clause["text"])

        if not is_likely_risky(features):
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

    # Step 3: Batch + parallel LLM classification
    if llm_clauses:
        # Split into batches
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

        # Process batches in parallel
        batch_results_map = {}
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_idx = {
                executor.submit(
                    _classify_batch_worker,
                    idx, total_batches,
                    batches_clauses[idx], batches_features[idx]
                ): idx
                for idx in range(total_batches)
            }
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    batch_results_map[idx] = future.result()
                except Exception as e:
                    logger.error(f"Batch {idx + 1}/{total_batches} thread failed: {e}")
                    # Fallback should already be handled in worker, but catch safety net
                    fallback = []
                    for c, f in zip(batches_clauses[idx], batches_features[idx]):
                        fallback.append(classify_clause(c, f))
                    batch_results_map[idx] = fallback

        # Reassemble results in order
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

    # Step 4: Aggregate
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

    logger.info(
        f"Analysis complete: {len(risky)}/{len(clauses)} risky, "
        f"overall={overall_risk}, skipped={skipped}"
    )

    return {
        "source": source,
        "source_type": extraction_result.get("source_type"),
        "total_clauses": len(clauses),
        "risky_clause_count": len(risky),
        "skipped_llm_count": skipped,
        "overall_risk": overall_risk,
        "risk_breakdown": risk_breakdown,
        "clauses": results
    }
