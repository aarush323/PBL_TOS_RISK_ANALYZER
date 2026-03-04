import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from extraction.input_handler import handle_input
from analysis.segmenter import segment_clauses
from analysis.nlp_features import extract_features, is_likely_risky
from analysis.analyzer import analyze_document

def test_segmentation():
    result = handle_input("url", "https://github.com/site/terms")
    clauses = segment_clauses(result["paragraphs"])
    assert len(clauses) > 10, "Too few clauses from GitHub"
    for c in clauses:
        assert c["char_length"] >= 40, f"Short clause leaked: {c['text'][:60]}"
        assert "id" in c
        assert "text" in c
    print(f"Segmentation: OK — {len(clauses)} clauses from GitHub")

def test_nlp_features_risky():
    risky_clause = "We may share your personal data with third parties at our sole discretion without notice."
    features = extract_features(risky_clause)
    assert features["has_negation"] or features["modal_verbs"] or features["triggered_categories"]
    assert is_likely_risky(features)
    print(f"NLP risky detection: OK — triggers: {features['triggered_categories']}")

def test_nlp_features_benign():
    benign_clause = "Welcome to our service. These terms explain how to use the platform."
    features = extract_features(benign_clause)
    print(f"NLP benign: modal={features['modal_verbs']}, categories={features['triggered_categories']}")
    print("NLP benign clause: OK")

def test_full_pipeline_zoom():
    extraction = handle_input("url", "https://explore.zoom.us/en/terms")
    result = analyze_document(extraction)
    assert result["total_clauses"] > 10
    assert result["risky_clause_count"] > 0
    assert result["overall_risk"] in ["Low", "Medium", "High"]
    assert "risk_breakdown" in result
    print(f"Full pipeline Zoom: OK")
    print(f"  Total clauses: {result['total_clauses']}")
    print(f"  Risky clauses: {result['risky_clause_count']}")
    print(f"  Overall risk: {result['overall_risk']}")
    print(f"  Breakdown: {result['risk_breakdown']}")

def test_zoom_has_legal_risk():
    extraction = handle_input("url", "https://explore.zoom.us/en/terms")
    result = analyze_document(extraction)
    assert result["risk_breakdown"]["Legal Risk"] > 0, "Zoom should have Legal Risk (arbitration clause)"
    print(f"Zoom Legal Risk detection: OK — {result['risk_breakdown']['Legal Risk']} clauses")

if __name__ == "__main__":
    print("Running Part 2 analysis tests...\n")

    test_segmentation()
    test_nlp_features_risky()
    test_nlp_features_benign()

    test_full_pipeline_zoom()

    test_zoom_has_legal_risk()
    print("\nAll Part 2 tests passed.")
