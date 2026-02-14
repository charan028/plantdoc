from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from app.models import ChatMessage, ChatSession, ChatResponse
from app.services.knowledge_base import KnowledgeBase
from app.llm.providers import LLMProvider
from app.config import get_settings
import uuid
import shutil
import os
from datetime import datetime

router = APIRouter(prefix="/api/chat", tags=["chat"])
settings = get_settings()

# Request models
class CreateSessionRequest(BaseModel):
    user_id: str
    title: str = "New Chat"

class ChatSubmitRequest(BaseModel):
    session_id: str
    role: str = "user"
    content: str
    image_url: str | None = None

# Dependency to get DB client from app state
def get_pg(request: Request):
    return request.app.state.pg

def get_kb(request: Request):
    return request.app.state.kb

def get_llm(request: Request):
    return request.app.state.llm

@router.post("/sessions", response_model=ChatSession)
async def create_session(
    payload: CreateSessionRequest, 
    pg = Depends(get_pg)
):
    session_id = await pg.create_chat_session(payload.user_id, payload.title)
    return ChatSession(
        id=session_id,
        user_id=payload.user_id,
        title=payload.title,
        created_at=datetime.now(), # Approximate, real one is in DB
        messages=[]
    )

@router.get("/sessions", response_model=list[dict])
async def list_sessions(user_id: str, pg = Depends(get_pg)):
    return await pg.get_user_sessions(user_id)

@router.get("/history/{session_id}", response_model=list[dict])
async def get_history(session_id: str, pg = Depends(get_pg)):
    return await pg.get_chat_history(session_id)

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # Save to static folder
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # BASE_DIR is app/routers/.., which is app/
    # We want backend/static
    BACKEND_DIR = os.path.dirname(BASE_DIR)
    upload_dir = os.path.join(BACKEND_DIR, "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{file_id}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return URL (assuming static file serving is set up)
    return {"image_url": f"/static/uploads/{filename}"}



SYSTEM_PROMPT = """
You are a professional plant pathologist and botanist. 
Analyze the user's query and any provided image context carefully.
1. Identify the plant species if possible.
2. Diagnose issues based on visual symptoms (yellowing, spots, wilting).
3. Provide concise, actionable care advice (watering, light, soil, fertilizer).

If an image is provided, focus heavily on visual details. 
Do not ask generic questions; instead, look for the answers in the image or provide the most likely scenarios based on your expertise.
Keep your response helpful, friendly, but authoritative.
IMPORTANT: Do NOT use asterisks (*) or markdown bolding in your response. Use plain text only.
""".strip()

@router.post("/submit", response_model=ChatResponse)
async def submit_message(
    payload: ChatSubmitRequest, 
    request: Request,
    pg = Depends(get_pg),
    llm = Depends(get_llm)
):
    # 1. Save user message
    await pg.add_message(payload.session_id, "user", payload.content, payload.image_url)
    
    # 2. Get LLM response
    # Fetch recent history for context (limit to last 5 messages to avoid token limits)
    history = await pg.get_chat_history(payload.session_id)
    # Filter out the current message we just added (optional, but good for cleanliness)
    recent_history = history[-6:-1] if len(history) > 1 else []
    
    context_str = ""
    if recent_history:
        context_str = "\n\nChat History:\n"
        for msg in recent_history:
            role = "User" if msg['role'] == 'user' else "Model"
            content = msg.get('content', '')
            context_str += f"{role}: {content}\n"

    # Construct prompt with system instructions and history
    full_prompt = f"{SYSTEM_PROMPT}{context_str}\n\nUser Query: {payload.content}"
    
    # Pass image if present
    response_text, source = await llm.complete(full_prompt, image_path=payload.image_url)
    
    # 3. Save model response
    await pg.add_message(payload.session_id, "model", response_text)
    
    return ChatResponse(
        route="general",
        answer=response_text,
        source=source,
        timestamp=datetime.now()
    )
