import os
from dotenv import load_dotenv

load_dotenv()

# ─── Environment ───
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# ─── Auth ───
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# ─── CORS ───
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS_RAW:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]
elif FRONTEND_URL:
    CORS_ORIGINS = [FRONTEND_URL]
else:
    CORS_ORIGINS = ["*"]

# ─── LLM Providers ───
CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODEL = "llama3.1-8b"
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3.5")

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 384
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ─── Analysis ───
MAX_CONTEXT_CHARS = 12000
RISK_THRESHOLD_LOW_MAX = 30
RISK_THRESHOLD_MEDIUM_MAX = 60

# ─── Extraction ───
EXTRACTOR_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
EXTRACTOR_TIMEOUT = 15

# ─── Provider Selection ───
def get_enabled_llm_providers() -> list[str]:
    providers = []
    if CEREBRAS_API_KEY:
        providers.append("cerebras")
    if GROQ_API_KEY:
        providers.append("groq")
    return providers

# ─── Startup Validation ───
def validate_production_environment():
    if ENVIRONMENT == "production":
        required = {
            "DATABASE_URL": os.getenv("DATABASE_URL"),
            "SECRET_KEY": os.getenv("SECRET_KEY"),
            "CEREBRAS_API_KEY": os.getenv("CEREBRAS_API_KEY"),
        }
        if not os.getenv("CORS_ORIGINS") and not os.getenv("FRONTEND_URL"):
            required["CORS_ORIGINS or FRONTEND_URL"] = None
        missing = [k for k, v in required.items() if not v]
        if missing:
            raise RuntimeError(
                f"Missing required production environment variables: {', '.join(missing)}"
            )
