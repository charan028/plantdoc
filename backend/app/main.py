from contextlib import asynccontextmanager
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db import Neo4jClient, PostgresClient
from app.llm.providers import LLMProvider
from app.models import ChatRequest, ChatResponse, DetectionResponse, HealthResponse, Species
from app.services.agent_router import AgentRouter
from app.services.knowledge_base import KnowledgeBase
from app.services.plant_detector import PlantDetector

settings = get_settings()
kb = KnowledgeBase()
llm_provider = LLMProvider(settings)
router = AgentRouter(kb, llm_provider)
detector = PlantDetector(kb)

pg: PostgresClient | None = None
neo: Neo4jClient | None = None


from app.routers import chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pg, neo
    
    # Init singletons
    pg = PostgresClient(settings)
    neo = Neo4jClient(settings)
    
    await pg.connect()
    await neo.connect()
    
    # Initialize chat tables
    await pg.init_chat_tables()

    # Bind to app state for access in routers
    app.state.pg = pg
    app.state.neo = neo
    app.state.kb = kb
    app.state.llm = llm_provider
    
    try:
        yield
    finally:
        await pg.close()
        await neo.close()


app = FastAPI(title="Plant Detection API", lifespan=lifespan)
app.include_router(chat.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_dir = os.path.join(BASE_DIR, "static")
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", environment=settings.app_env)


@app.get("/api/species", response_model=list[Species])
async def list_species(q: str = "") -> list[Species]:
    return kb.search_species(q)


@app.post("/api/detect", response_model=DetectionResponse)
async def detect_plant(file: UploadFile = File(...)) -> DetectionResponse:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    return detector.detect(data)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    combined = payload.message
    if payload.context and payload.context.strip():
        combined = f"{payload.message}\n\nImage context:\n{payload.context.strip()}"
    return await router.answer(combined)


import asyncio
import base64
import json
from fastapi import WebSocket, WebSocketDisconnect
from app.services.gemini_live import GeminiLiveSession

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Pass the global knowledge base instance
    session = GeminiLiveSession(kb)
    try:
        await session.connect()
    except Exception as e:
        print(f"Failed to connect to Gemini: {e}")
        # Close with policy violation error if connection fails (e.g. auth)
        # Truncate reason to avoid ProtocolError (max 125 chars for control frame)
        reason = str(e)[:100]
        await websocket.close(code=1008, reason=reason) 
        return

    async def receive_from_client():
        try:
            while True:
                text_data = await websocket.receive_text()
                message = json.loads(text_data)
                
                if message.get("type") == "audio":
                    # Client sends base64 encoded PCM
                    try:
                        pcm_data = base64.b64decode(message["data"])
                        await session.send_audio(pcm_data)
                    except Exception as e:
                         print(f"Error decoding audio: {e}")

                elif message.get("type") == "video":
                    # Client sends base64 encoded JPEG
                    # Data might be "data:image/jpeg;base64,..."
                    try:
                        b64_str = message["data"]
                        if "," in b64_str:
                             b64_str = b64_str.split(",")[1]
                        frame_data = base64.b64decode(b64_str)
                        await session.send_video(frame_data)
                    except Exception as e:
                        print(f"Error decoding video: {e}")

        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"Client receive error: {e}")

    async def send_to_client():
        try:
            async for response in session.receive():
                server_content = response.server_content
                if server_content and server_content.model_turn:
                    for part in server_content.model_turn.parts:
                        if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                            # Extract audio data
                            b64_audio = base64.b64encode(part.inline_data.data).decode("utf-8")
                            await websocket.send_json({"type": "audio", "data": b64_audio})
                        elif part.text:
                            # Optional: Send text if needed, or log it
                            print(f"Gemini text: {part.text}")

        except Exception as e:
            print(f"Gemini receive error: {e}")

    try:
        # Run both loops until one fails or disconnects
        await asyncio.gather(receive_from_client(), send_to_client())
    except Exception as e:
        print(f"Session error: {e}")
    finally:
        await session.close()
