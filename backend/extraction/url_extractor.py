import requests
from bs4 import BeautifulSoup
import re
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1"
}

REMOVE_TAGS = [
    "script", "style", "nav", "footer", "header",
    "aside", "form", "button", "iframe", "noscript",
    "meta", "link", "img", "svg", "figure"
]

NOISE_PATTERNS = [
    "cookie", "banner", "popup", "modal", "sidebar",
    "breadcrumb", "pagination", "share", "social",
    "advertisement", "promo", "newsletter"
]

def fetch_url(url: str) -> str:
    logger.info(f"Fetching URL: {url}")
    response = requests.get(url, headers=HEADERS, timeout=15)
    logger.info(f"HTTP response: {response.status_code}")
    response.raise_for_status()
    return response.text

def is_noise_element(tag) -> bool:
    if tag.attrs is None:
        return False
    for attr in ["class", "id"]:
        val = " ".join(tag.get(attr, [])) if attr == "class" else tag.get(attr, "")
        if any(pattern in val.lower() for pattern in NOISE_PATTERNS):
            return True
    return False

def find_main_content(soup):
    semantic = soup.find("main") or soup.find("article")
    if semantic and len(semantic.get_text(strip=True)) > 1000:
        return semantic

    pattern_match = (
        soup.find(id=re.compile(r"content|terms|policy|main|legal|tos", re.I)) or
        soup.find(class_=re.compile(r"content|terms|policy|main|legal|tos", re.I))
    )
    if pattern_match and len(pattern_match.get_text(strip=True)) > 1000:
        return pattern_match

    candidates = soup.find_all(["div", "section", "article"])
    if candidates:
        best = max(candidates, key=lambda x: len(x.get_text(strip=True)))
        if len(best.get_text(strip=True)) > 1000:
            return best

    return soup.body

def extract_from_url(url: str) -> dict:
    html = fetch_url(url)
    logger.info(f"HTML size: {len(html)} bytes")
    soup = BeautifulSoup(html, "lxml")

    logger.info("Removing noise tags...")
    for tag_name in REMOVE_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()

    for tag in soup.find_all(True):
        if is_noise_element(tag):
            tag.decompose()

    main_content = find_main_content(soup)
    logger.info(f"Main content detected: <{main_content.name}>")
    
    raw_text = main_content.get_text(separator="\n")
    logger.info(f"Extracted raw text length: {len(raw_text)}")

    return {
        "source_type": "url",
        "source": url,
        "raw_text": raw_text
    }
