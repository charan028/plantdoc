from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    environment: str


class Species(BaseModel):
    id: str
    scientific_name: str
    common_name: str
    care_difficulty: str
    watering_frequency_days: int
    light: str
    pet_toxicity: str


class DetectionCandidate(BaseModel):
    species_id: str
    confidence: float = Field(ge=0.0, le=1.0)


class DetectionResponse(BaseModel):
    best_match: DetectionCandidate
    alternatives: list[DetectionCandidate]
    care_tip: str


class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: str | None = None


class ChatResponse(BaseModel):
    route: str
    answer: str
    source: str
    timestamp: datetime


class PlantRecord(BaseModel):
    id: str
    user_id: str
    species_id: str
    nickname: str
    health_status: str

class ChatMessage(BaseModel):
    id: str
    session_id: str
    role: str  # "user" or "model"
    content: str
    image_url: str | None = None
    timestamp: datetime


class ChatSession(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    messages: list[ChatMessage] = []
