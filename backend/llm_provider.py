import os
import logging
from typing import Optional, Tuple
from langchain_core.language_models.chat_models import BaseChatModel

logger = logging.getLogger("contextlens.llm_provider")

class LLMConfigurationError(Exception):
    """Raised when an AI provider is requested but its required credentials/configuration are missing."""
    pass


def get_configured_provider_name() -> str:
    """
    Returns the explicitly configured LLM provider name from the LLM_PROVIDER
    environment variable, or auto-detects based on available API keys if not specified.
    """
    explicit = os.getenv("LLM_PROVIDER", "").strip().lower()
    if explicit:
        return explicit

    # Auto-detection priority if LLM_PROVIDER is not set
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return "gemini"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"

    return "heuristic"


def get_llm_model(
    api_key_override: Optional[str] = None,
    provider_override: Optional[str] = None
) -> Tuple[Optional[BaseChatModel], str]:
    """
    Initializes and returns the configured LangChain BaseChatModel instance and provider name.
    
    If the selected provider is missing credentials, raises LLMConfigurationError.
    If no provider is configured at all, returns (None, "heuristic").
    Does NOT silently switch to another provider if the configured provider has missing credentials.
    """
    provider = (provider_override or get_configured_provider_name()).lower()
    
    # Check for provider key overrides
    override_provider = None
    if api_key_override:
        if api_key_override.startswith("sk-ant-"):
            override_provider = "anthropic"
        elif api_key_override.startswith("sk-"):
            override_provider = "openai"
        elif api_key_override.startswith("AIza") or len(api_key_override) > 20:
            override_provider = "gemini"
            
    if override_provider and not provider_override:
        provider = override_provider

    temperature = float(os.getenv("LLM_TEMPERATURE", "0.2"))

    # 1. Google Gemini
    if provider in ("gemini", "google", "google-genai"):
        gemini_key = api_key_override or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_key:
            raise LLMConfigurationError(
                "LLM provider is set to 'gemini', but neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured in the environment."
            )
        model_name = os.getenv("LLM_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-1.5-flash"
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            chat_model = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=gemini_key,
                temperature=temperature,
                max_retries=2,
                request_timeout=25.0
            )
            return chat_model, "gemini"
        except ImportError as e:
            raise LLMConfigurationError(f"langchain_google_genai is not installed: {e}")

    # 2. OpenAI
    elif provider in ("openai", "gpt"):
        openai_key = api_key_override or os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise LLMConfigurationError(
                "LLM provider is set to 'openai', but OPENAI_API_KEY is not configured in the environment."
            )
        model_name = os.getenv("LLM_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        try:
            from langchain_openai import ChatOpenAI
            chat_model = ChatOpenAI(
                model=model_name,
                api_key=openai_key,
                temperature=temperature,
                max_retries=2,
                request_timeout=25.0
            )
            return chat_model, "openai"
        except ImportError as e:
            raise LLMConfigurationError(f"langchain_openai is not installed: {e}")

    # 3. Anthropic Claude
    elif provider in ("anthropic", "claude"):
        anthropic_key = api_key_override or os.getenv("ANTHROPIC_API_KEY")
        if not anthropic_key:
            raise LLMConfigurationError(
                "LLM provider is set to 'anthropic', but ANTHROPIC_API_KEY is not configured in the environment."
            )
        model_name = os.getenv("LLM_MODEL") or os.getenv("ANTHROPIC_MODEL") or "claude-3-haiku-20240307"
        try:
            from langchain_anthropic import ChatAnthropic
            chat_model = ChatAnthropic(
                model_name=model_name,
                api_key=anthropic_key,
                temperature=temperature,
                max_retries=2,
                timeout=25.0
            )
            return chat_model, "anthropic"
        except ImportError as e:
            raise LLMConfigurationError(f"langchain_anthropic is not installed: {e}")

    # 4. Built-in Deterministic Heuristic Engine
    elif provider in ("heuristic", "builtin", "none", ""):
        return None, "heuristic"

    else:
        raise LLMConfigurationError(
            f"Unsupported LLM_PROVIDER '{provider}'. Supported options are: 'gemini', 'openai', 'anthropic', 'heuristic'."
        )
