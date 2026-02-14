import os
import asyncio
import json
from google import genai
from google.genai import types

# Default model, can be overridden
MODEL_ID = "gemini-2.5-flash-native-audio-latest"

class GeminiLiveSession:
    def __init__(self, kb):
        self.kb = kb
        from app.config import get_settings
        settings = get_settings()
        api_key = settings.google_api_key
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        self.client = genai.Client(api_key=api_key, http_options=None)
        self.session = None

    async def connect(self):
        """Establishes the WebSocket connection to Gemini Live API."""
        
        # Define the tool
        tools = [{
            "function_declarations": [{
                "name": "get_plant_info",
                "description": "Get detailed care information, toxicity, and light requirements for a specific plant species.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "plant_name": {
                            "type": "STRING",
                            "description": "The common name or scientific name of the plant."
                        }
                    },
                    "required": ["plant_name"]
                }
            }]
        }]

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            tools=tools,
            system_instruction="You are a helpful plant expert. Keep your answers short and concise. Use the get_plant_info tool to provide accurate care advice."
        )
        # Using the async client context manager is the recommended way
        self._ctx = self.client.aio.live.connect(model=MODEL_ID, config=config)
        self.session = await self._ctx.__aenter__()

    async def send_audio(self, audio_chunk: bytes):
        """Sends raw PCM audio bytes to the model."""
        if self.session:
            await self.session.send(
                input={"data": audio_chunk, "mime_type": "audio/pcm"}, 
                end_of_turn=False
            )

    async def send_video(self, frame_data: bytes):
        """Sends JPEG frame bytes to the model."""
        if self.session:
            await self.session.send(
                input={"data": frame_data, "mime_type": "image/jpeg"}, 
                end_of_turn=False
            )

    async def receive(self):
        """Yields responses from the model and handles tool calls."""
        if self.session:
            async for response in self.session.receive():
                # Check for tool calls
                if response.tool_call:
                    for call in response.tool_call.function_calls:
                        if call.name == "get_plant_info":
                            plant_name = call.args.get("plant_name")
                            print(f"Tool call: get_plant_info({plant_name})")
                            
                            # Execute the tool
                            result = self._search_plant(plant_name)
                            
                            # Send tool response
                            await self.session.send(
                                input=types.LiveClientToolResponse(
                                    function_responses=[
                                        types.FunctionResponse(
                                            name=call.name,
                                            id=call.id,
                                            response={"result": result}
                                        )
                                    ]
                                ),
                                end_of_turn=False
                            )
                
                # Yield standard response (audio/text)
                yield response

    def _search_plant(self, name: str) -> dict:
        """Helper to search knowledge base."""
        results = self.kb.search_species(name)
        if not results:
            return {"found": False, "message": f"No plant found matching '{name}'."}
        
        # Return the best match
        best = results[0]
        return {
            "found": True,
            "name": best.common_name,
            "scientific": best.scientific_name,
            "care": {
                "water_days": best.watering_frequency_days,
                "light": best.light,
                "difficulty": best.care_difficulty,
                "toxicity": best.pet_toxicity
            }
        }

    async def close(self):
        """Closes the session."""
        if self.session:
             await self.session.close() # Keep this just in case the session itself has a close
        
        if hasattr(self, "_ctx") and self._ctx:
             await self._ctx.__aexit__(None, None, None)
