import httpx
import json
import re
import logging
import os
import time
import itertools


logger = logging.getLogger(__name__)

from settings import CEREBRAS_API_URL, CEREBRAS_MODEL, GROQ_API_URL, GROQ_MODEL, OLLAMA_URL, OLLAMA_MODEL, get_enabled_llm_providers

cerebras_request_count = 0
groq_request_count = 0

_providers = get_enabled_llm_providers()

_provider_cycle = itertools.cycle(_providers) if _providers else None
