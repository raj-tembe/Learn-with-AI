"""
Configuration and Advanced Features for Learn with AI
"""

# ===========================
# LLM Configuration
# ===========================

LLM_CONFIG = {
    "model": "gemini-2.5-flash",
    "temperature": 0.4,
    "top_p": 0.95,
    "max_output_tokens": 2048,
}

# ===========================
# Vector Database Configuration
# ===========================

VECTOR_DB_CONFIG = {
    "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
    "chunk_size": 1000,
    "chunk_overlap": 200,
    "search_k": 4,  # Number of relevant chunks to retrieve
    "similarity_threshold": 0.3,
}

# ===========================
# Document Processing
# ===========================

DOCUMENT_CONFIG = {
    "max_file_size_mb": 50,
    "supported_formats": ["pdf", "txt", "csv", "json"],
    "pdf_extract_method": "pypdf",  # Can be 'pypdf' or 'pdfplumber'
    "enable_ocr": False,  # Set to True for scanned PDFs
}

# ===========================
# Session Management
# ===========================

SESSION_CONFIG = {
    "session_timeout_hours": 1,
    "max_sessions": 100,
    "cleanup_interval_minutes": 30,
}

# ===========================
# Feature Flags
# ===========================

FEATURES = {
    "export_chat_history": True,
    "download_document_summary": False,
    "multi_user_collaboration": False,
    "real_time_suggestions": False,
    "voice_input": False,
    "advanced_analytics": False,
}

# ===========================
# Rate Limiting
# ===========================

RATE_LIMITING = {
    "enabled": False,
    "requests_per_minute": 30,
    "requests_per_hour": 500,
}

# ===========================
# Quality Assurance
# ===========================

QA_CONFIG = {
    "fact_checking_enabled": False,
    "response_length_min": 50,
    "response_length_max": 2000,
    "confidence_threshold": 0.5,
}

# ===========================
# Analytics
# ===========================

ANALYTICS_CONFIG = {
    "track_user_interactions": False,
    "log_queries": False,
    "performance_monitoring": True,
}

# ===========================
# Security
# ===========================

SECURITY_CONFIG = {
    "enable_https": False,
    "enable_cors": False,
    "allowed_origins": ["localhost:3000"],
    "sanitize_user_input": True,
    "rate_limit_enabled": False,
}

# ===========================
# Cache Configuration
# ===========================

CACHE_CONFIG = {
    "enable_query_cache": False,
    "cache_ttl_seconds": 3600,
    "cache_max_size_mb": 100,
}
