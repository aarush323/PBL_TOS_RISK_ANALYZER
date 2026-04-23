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


if __name__ == "__main__":
    print("Running Part 2 analysis tests...\n")

    test_segmentation()
    test_nlp_features_risky()
    test_nlp_features_benign()

    print("\nAll Part 2 tests passed.")
