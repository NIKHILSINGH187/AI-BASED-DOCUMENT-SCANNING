"""Application configuration. Private credentials are backend-only — never exposed to frontend."""

import os


class Settings:
    GOVERNMENT_API_BASE_URL: str = os.getenv("GOVERNMENT_API_BASE_URL", "")
    GOVERNMENT_API_KEY: str = os.getenv("GOVERNMENT_API_KEY", "")
    GOVERNMENT_CLIENT_ID: str = os.getenv("GOVERNMENT_CLIENT_ID", "")
    GOVERNMENT_CLIENT_SECRET: str = os.getenv("GOVERNMENT_CLIENT_SECRET", "")

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    @property
    def government_configured(self) -> bool:
        return all([
            self.GOVERNMENT_API_BASE_URL,
            self.GOVERNMENT_API_KEY,
            self.GOVERNMENT_CLIENT_ID,
            self.GOVERNMENT_CLIENT_SECRET,
        ])


settings = Settings()
