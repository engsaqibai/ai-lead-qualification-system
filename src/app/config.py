from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Lead Qualification System"
    environment: str = "development"

    database_user: str
    database_password: str
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
