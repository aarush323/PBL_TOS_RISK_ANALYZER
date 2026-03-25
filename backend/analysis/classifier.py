import httpx
import json
import re
import logging
import os
import time
from dotenv import load_dotenv

# Find the path to the backend/.env folder relative to this file
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODEL = "llama3.1-8b"

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "phi3.5"

# Global counter for API tracking
cerebras_request_count = 0

RISK_DEFINITIONS = """
- Privacy Risk: data collection, sharing, selling, tracking user data, cookies, profiling
- Legal Risk: mandatory arbitration, class action waiver, liability waiver, jurisdiction clauses, indemnification
- User Rights Risk: account termination without notice, content ownership transfer, irrevocable licenses, opt-out restrictions
- Security Risk: data breach handling, no encryption guarantee, "as is" disclaimers, unauthorized access liability
- Financial Risk: auto-renewal, non-refundable charges, automatic billing, price changes without notice
"""

PROMPT_TEMPLATE = """You are a legal risk analyst specializing in Terms of Service and Privacy Policy documents.

Analyze the following clause and classify any risks present.

CLAUSE:
{clause_text}

NLP SIGNALS DETECTED:
- Modal verbs found: {modal_verbs}
- Negation present: {has_negation}
- Pre-flagged categories from keywords: {triggered_categories}
- Named entity types: {entity_types}

RISK CATEGORY DEFINITIONS:
{risk_definitions}

Respond ONLY with valid JSON. No explanation, no markdown, no extra text. Exactly this format:
{{
  "is_risky": true or false,
  "risk_categories": ["Privacy Risk"] or [],
  "confidence": "High" or "Medium" or "Low",
  "explanation": "one sentence in plain English explaining why this is risky, or null if not risky"
}}

Rules:
- risk_categories must only contain values from the 5 defined categories
- confidence must be exactly "High", "Medium", or "Low"
- explanation must be plain English a non-lawyer can understand
- If not risky, return is_risky: false, empty risk_categories, and null explanation"""


def build_prompt(clause: dict, features: dict) -> str:
    return PROMPT_TEMPLATE.format(
        clause_text=clause["text"],
        modal_verbs=features["modal_verbs"] or "none",
        has_negation=features["has_negation"],
        triggered_categories=features["triggered_categories"] or "none",
        entity_types=features["entity_types"] or "none",
        risk_definitions=RISK_DEFINITIONS
    )


def parse_llm_response(raw: str) -> dict:
    # Strip markdown code fences if present
    raw = re.sub(r"```json|```", "", raw).strip()

    # Extract first JSON object found
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response: {raw[:200]}")

    parsed = json.loads(match.group())

    # Validate required fields
    required = ["is_risky", "risk_categories", "confidence", "explanation"]
    for field in required:
        if field not in parsed:
            raise ValueError(f"Missing field '{field}' in LLM response")

    # Validate values
    valid_categories = {
        "Privacy Risk", "Legal Risk", "User Rights Risk",
        "Security Risk", "Financial Risk"
    }
    valid_confidence = {"High", "Medium", "Low"}

    parsed["risk_categories"] = [
        c for c in parsed["risk_categories"]
        if c in valid_categories
    ]

    if parsed["confidence"] not in valid_confidence:
        parsed["confidence"] = "Low"

    return parsed


def classify_clause(clause: dict, features: dict) -> dict:
    prompt = build_prompt(clause, features)

    cerebras_api_key = os.environ.get("CEREBRAS_API_KEY")

    if cerebras_api_key:
        try:
            logger.info(f"Classifying clause {clause['id']} via Cerebras...")
            response = httpx.post(
                CEREBRAS_API_URL,
                headers={
                    "Authorization": f"Bearer {cerebras_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": CEREBRAS_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                    # Optional: limit number of tokens generated
                    "max_completion_tokens": 200
                },
                timeout=120.0
            )
            response.raise_for_status()
            raw_text = response.json()["choices"][0]["message"]["content"]
            logger.debug(f"Cerebras RAW RESPONSE: {raw_text[:500]}")
            result = parse_llm_response(raw_text)
            logger.info(
                f"Clause {clause['id']} classified (Cerebras): "
                f"risky={result['is_risky']}, "
                f"categories={result['risk_categories']}, "
                f"confidence={result['confidence']}"
            )
            return result
        except Exception as e:
            logger.warning(f"Clause {clause['id']}: Cerebras error — {str(e)}. Falling back to Ollama...")
    else:
        logger.warning(f"CEREBRAS_API_KEY not found. Defaulting to Ollama fallback...")

    # Fallback to Ollama
    try:
        logger.info(f"Classifying clause {clause['id']} via Ollama...")
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.1,   # low temp = consistent structured output
                    "num_predict": 200    # JSON response never needs more than this
                }
            },
            timeout=120.0
        )
        response.raise_for_status()
        raw_text = response.json()["response"]
        logger.debug(f"LLM RAW RESPONSE: {raw_text[:500]}")
        result = parse_llm_response(raw_text)
        logger.info(
            f"Clause {clause['id']} classified (Ollama): "
            f"risky={result['is_risky']}, "
            f"categories={result['risk_categories']}, "
            f"confidence={result['confidence']}"
        )
        return result

    except httpx.TimeoutException:
        logger.warning(f"Clause {clause['id']}: LLM timeout")
        return {
            "is_risky": False,
            "risk_categories": [],
            "confidence": "Low",
            "explanation": None,
            "error": "LLM timeout"
        }
    except Exception as e:
        logger.warning(f"Clause {clause['id']}: LLM error — {str(e)}")
        return {
            "is_risky": False,
            "risk_categories": [],
            "confidence": "Low",
            "explanation": None,
            "error": str(e)
        }


# ---------------------------------------------------------------------------
# Batch classification (Upgrade 1)
# ---------------------------------------------------------------------------

BATCH_PROMPT_TEMPLATE = """You are a legal risk analyst specializing in Terms of Service and Privacy Policy documents.

Analyze EACH of the following clauses and classify any risks present.

CLAUSES:
{clauses_block}

RISK CATEGORY DEFINITIONS:
{risk_definitions}

Respond ONLY with valid JSON. No explanation, no markdown, no extra text. Exactly this format:
{{
  "results": [
    {{
      "clause_id": <integer>,
      "is_risky": true or false,
      "risk_categories": ["Privacy Risk"] or [],
      "confidence": "High" or "Medium" or "Low",
      "explanation": "one sentence in plain English explaining why this is risky, or null if not risky"
    }}
  ]
}}

Rules:
- Return one result object per clause, in the same order
- risk_categories must only contain values from the 5 defined categories
- confidence must be exactly "High", "Medium", or "Low"
- explanation must be plain English a non-lawyer can understand
- If not risky, return is_risky: false, empty risk_categories, and null explanation"""


def build_batch_prompt(clauses: list[dict], features_list: list[dict]) -> str:
    blocks = []
    for clause, features in zip(clauses, features_list):
        block = (
            f"[Clause {clause['id']}]\n"
            f"{clause['text']}\n"
            f"NLP SIGNALS: modal_verbs={features['modal_verbs'] or 'none'}, "
            f"negation={features['has_negation']}, "
            f"categories={features['triggered_categories'] or 'none'}, "
            f"entities={features['entity_types'] or 'none'}"
        )
        blocks.append(block)

    return BATCH_PROMPT_TEMPLATE.format(
        clauses_block="\n\n".join(blocks),
        risk_definitions=RISK_DEFINITIONS
    )


def parse_batch_response(raw: str, expected_count: int) -> list[dict]:
    """Parse a batch LLM response into a list of validated results."""
    raw = re.sub(r"```json|```", "", raw).strip()

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in batch LLM response: {raw[:300]}")

    parsed = json.loads(match.group())

    if "results" not in parsed or not isinstance(parsed["results"], list):
        raise ValueError("Batch response missing 'results' array")

    if len(parsed["results"]) != expected_count:
        raise ValueError(
            f"Expected {expected_count} results, got {len(parsed['results'])}"
        )

    valid_categories = {
        "Privacy Risk", "Legal Risk", "User Rights Risk",
        "Security Risk", "Financial Risk"
    }
    valid_confidence = {"High", "Medium", "Low"}

    validated = []
    for item in parsed["results"]:
        required = ["is_risky", "risk_categories", "confidence", "explanation"]
        for field in required:
            if field not in item:
                raise ValueError(f"Missing field '{field}' in batch result item")

        item["risk_categories"] = [
            c for c in item["risk_categories"] if c in valid_categories
        ]
        if item["confidence"] not in valid_confidence:
            item["confidence"] = "Low"

        validated.append(item)

    return validated


def _cerebras_post_with_backoff(payload: dict, timeout: float) -> httpx.Response:
    cerebras_api_key = os.environ.get("CEREBRAS_API_KEY")
    headers = {
        "Authorization": f"Bearer {cerebras_api_key}",
        "Content-Type": "application/json"
    }
    
    max_retries = 4
    delay = 1.0
    
    for attempt in range(max_retries + 1):
        try:
            response = httpx.post(
                CEREBRAS_API_URL,
                headers=headers,
                json=payload,
                timeout=timeout
            )
            if response.status_code == 429:
                if attempt == max_retries:
                    response.raise_for_status()
                
                retry_after = response.headers.get("Retry-After")
                if retry_after and retry_after.isdigit():
                    wait_time = float(retry_after)
                else:
                    wait_time = delay
                    delay = min(delay * 2, 30.0)
                
                logger.warning(f"Cerebras 429 Too Many Requests. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
                
            response.raise_for_status()
            
            # Increment global counter on successful request
            global cerebras_request_count
            cerebras_request_count += 1
            
            return response
            
        except httpx.TimeoutException as e:
            if attempt == max_retries:
                raise
            wait_time = delay
            delay = min(delay * 2, 30.0)
            logger.warning(f"Cerebras Timeout. Retrying in {wait_time}s...")
            time.sleep(wait_time)


def classify_batch(clauses: list[dict], features_list: list[dict]) -> list[dict]:
    """Classify a batch of clauses. Falls back to per-clause if batch fails."""
    prompt = build_batch_prompt(clauses, features_list)
    count = len(clauses)
    cerebras_api_key = os.environ.get("CEREBRAS_API_KEY")

    # --- Try Cerebras batch ---
    if cerebras_api_key:
        try:
            logger.info(f"Batch classifying {count} clauses via Cerebras...")
            payload = {
                "model": CEREBRAS_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
                "max_completion_tokens": 250 * count
            }
            response = _cerebras_post_with_backoff(payload, timeout=180.0)
            raw_text = response.json()["choices"][0]["message"]["content"]
            logger.debug(f"Cerebras BATCH RAW: {raw_text[:800]}")
            results = parse_batch_response(raw_text, count)
            logger.info(f"Batch classified {count} clauses via Cerebras OK")
            return results
        except Exception as e:
            logger.warning(f"Cerebras batch error: {e}. Trying Ollama batch...")

    # --- Try Ollama batch ---
    try:
        logger.info(f"Batch classifying {count} clauses via Ollama...")
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.1,
                    "num_predict": min(150 * count, 800)
                }
            },
            timeout=180.0
        )
        response.raise_for_status()
        raw_text = response.json()["response"]
        logger.debug(f"Ollama BATCH RAW: {raw_text[:800]}")
        results = parse_batch_response(raw_text, count)
        logger.info(f"Batch classified {count} clauses via Ollama OK")
        return results
    except Exception as e:
        logger.warning(f"Ollama batch error: {e}. Falling back to per-clause...")

    # --- Fallback: classify one-by-one ---
    results = []
    for clause, features in zip(clauses, features_list):
        results.append(classify_clause(clause, features))
    return results
