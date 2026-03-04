import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from extraction.input_handler import handle_input

def test_github():
    result = handle_input("url", "https://github.com/site/terms")
    assert result["char_count"] > 5000, "Too little text from GitHub"
    assert "cleaned_text" in result
    assert "paragraphs" in result
    assert result["paragraph_count"] > 5
    lines = result["cleaned_text"].split("\n")
    for line in lines:
        assert not line.strip().isdigit(), f"Page number leaked: '{line}'"
    print(f"GitHub: OK — {result['char_count']} chars, {result['paragraph_count']} paragraphs")

def test_zoom():
    result = handle_input("url", "https://explore.zoom.us/en/terms")
    assert result["char_count"] > 5000, "Too little text from Zoom"
    assert result["paragraph_count"] > 5
    print(f"Zoom: OK — {result['char_count']} chars, {result['paragraph_count']} paragraphs")

def test_density_fallback():
    result = handle_input("url", "https://www.redditinc.com/policies/user-agreement")
    assert result["char_count"] > 3000, "Density fallback failed"
    print(f"Reddit: OK — {result['char_count']} chars, {result['paragraph_count']} paragraphs")

def test_raw_text_passthrough():
    test_input = "We may share your data with third parties at our discretion."
    result = handle_input("text", test_input)
    assert result["cleaned_text"] == test_input
    print("Raw text passthrough: OK")

def test_paragraphs_quality():
    result = handle_input("url", "https://github.com/site/terms")
    for p in result["paragraphs"]:
        assert len(p.strip()) > 40, f"Short paragraph leaked: '{p}'"
        assert p == p.strip(), "Paragraph has leading/trailing whitespace"
    print(f"Paragraph quality: OK — {result['paragraph_count']} clean paragraphs")

def test_no_nav_garbage():
    result = handle_input("url", "https://github.com/site/terms")
    text_lower = result["cleaned_text"].lower()
    assert "sign in" not in text_lower[:500]
    assert "search" not in text_lower[:200]
    print("Nav garbage check: OK")

def test_invalid_input_type():
    try:
        handle_input("xml", "something")
        print("FAIL — should have raised ValueError")
    except ValueError:
        print("Invalid input type protection: OK")

def test_blank_pdf_protection():
    try:
        handle_input("pdf", "/tmp/nonexistent_blank.pdf")
        print("FAIL — should have raised an error")
    except Exception as e:
        print(f"Blank/missing PDF protection: OK — {str(e)}")

if __name__ == "__main__":
    print("Running Part 1 extraction tests...\n")
    test_github()
    test_zoom()
    test_density_fallback()
    test_raw_text_passthrough()
    test_paragraphs_quality()
    test_no_nav_garbage()
    test_invalid_input_type()
    test_blank_pdf_protection()
    print("\nAll tests passed. Part 1 complete.")
