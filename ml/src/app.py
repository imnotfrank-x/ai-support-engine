"""API de inferencia; ejecutar con uvicorn ml.src.app:app."""

from contextlib import asynccontextmanager
import logging
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ml.src.predict import ARTIFACTS_DIR, Predictor

logger = logging.getLogger(__name__)


class PredictRequest(BaseModel):
    message: str = Field(strict=True, min_length=1, max_length=4000)

    @field_validator("message")
    @classmethod
    def non_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message no debe contener solamente espacios.")
        return value


class PredictResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    category: Literal["ACCESS", "BUG", "FEATURE", "SECURITY"]
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    response: str = Field(min_length=1)
    requiresHumanReview: bool
    mode: Literal["ml"]


def create_app(artifacts_dir: Path = ARTIFACTS_DIR) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.predictor = Predictor.load(artifacts_dir)
        try:
            yield
        finally:
            app.state.predictor = None

    app = FastAPI(title="Servicio local ML de soporte", lifespan=lifespan)
    app.state.predictor = None

    def loaded_predictor() -> Predictor:
        if app.state.predictor is None:
            raise HTTPException(status_code=503, detail="Los modelos ML no están cargados.")
        return app.state.predictor

    @app.get("/health")
    def health():
        loaded_predictor()
        return {"status": "ok", "modelsLoaded": True}

    @app.post("/predict", response_model=PredictResponse)
    def predict(body: PredictRequest):
        predictor = loaded_predictor()
        try:
            return PredictResponse(**predictor.predict(body.message))
        except Exception:
            logger.exception("Error de inferencia ML")
            raise HTTPException(status_code=500, detail="No fue posible analizar la solicitud.") from None

    return app


app = create_app()
