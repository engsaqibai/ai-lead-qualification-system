from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Lead Qualification System"

    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT"),
    )

    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL"),
    )

    database_user: str = Field(
        default="",
        validation_alias=AliasChoices("DATABASE_USER"),
    )
    database_password: str = Field(
        default="",
        validation_alias=AliasChoices("DATABASE_PASSWORD"),
    )
    database_host: str = Field(
        default="localhost",
        validation_alias=AliasChoices("DATABASE_HOST"),
    )
    database_port: int = Field(
        default=5432,
        validation_alias=AliasChoices("DATABASE_PORT"),
    )
    database_name: str = Field(
        default="",
        validation_alias=AliasChoices("DATABASE_NAME"),
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()