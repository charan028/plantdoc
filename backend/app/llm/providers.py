from typing import Any
import httpx
from app.config import Settings


class LLMProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def complete(self, prompt: str, image_path: str | None = None) -> tuple[str, str]:
        providers = [self._gemini, self._groq, self._together, self._huggingface]
        for provider in providers:
            # Only Gemini supports images for now
            if image_path and provider != self._gemini:
                continue
                
            if provider == self._gemini:
                 text = await provider(prompt, image_path)
            else:
                 text = await provider(prompt)
                 
            if text:
                return text, provider.__name__.replace("_", "")
        return self._local_fallback(prompt), "local-fallback"

    async def _gemini(self, prompt: str, image_path: str | None = None) -> str | None:
        if not self.settings.google_api_key:
            return None
        
        try:
            from google import genai
            from google.genai import types
            from pathlib import Path
            import base64
            
            client = genai.Client(api_key=self.settings.google_api_key)
            
            contents = [prompt]
            
            if image_path:
                # Remove leading slash if present to make it relative to cwd
                if image_path.startswith("/"):
                    image_path = image_path[1:]
                
                path = Path(image_path)
                if path.exists():
                    with open(path, "rb") as f:
                        image_bytes = f.read()
                    contents.append(types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"))
            
            # Simple retry logic for 429s (reusing previous logic)
            import asyncio
            retries = 3
            base_delay = 2
            
            for attempt in range(retries):
                try:
                    response = await client.aio.models.generate_content(
                        model="gemini-2.0-flash", 
                        contents=contents
                    )
                    return response.text
                except Exception as e:
                    if "429" in str(e) and attempt < retries - 1:
                        print(f"Gemini 429 error, retrying in {base_delay * (2**attempt)}s: {e}")
                        await asyncio.sleep(base_delay * (2**attempt))
                    else:
                        raise # Re-raise other exceptions or the last 429
        except Exception as e:
            print(f"Gemini error: {e}")
            return None

    async def _groq(self, prompt: str) -> str | None:
        if not self.settings.groq_api_key:
            return None
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload: dict[str, Any] = {
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 200,
        }
        headers = {"Authorization": f"Bearer {self.settings.groq_api_key}"}
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception:
            return None

    async def _together(self, prompt: str) -> str | None:
        if not self.settings.together_api_key:
            return None
        url = "https://api.together.xyz/v1/chat/completions"
        payload: dict[str, Any] = {
            "model": "meta-llama/Llama-3.1-8B-Instruct-Turbo",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 200,
        }
        headers = {"Authorization": f"Bearer {self.settings.together_api_key}"}
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception:
            return None

    async def _huggingface(self, prompt: str) -> str | None:
        if not self.settings.huggingface_api_key:
            return None
        url = "https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct"
        headers = {"Authorization": f"Bearer {self.settings.huggingface_api_key}"}
        payload = {"inputs": prompt}
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list) and data:
                    return data[0].get("generated_text")
                return None
        except Exception:
            return None

    def _local_fallback(self, prompt: str) -> str:
        return (
            "I cannot reach a cloud LLM right now. "
            "Quick care guidance: check soil moisture 1 inch deep, ensure indirect light, and inspect leaves for pests. "
            f"Original question: {prompt[:200]}"
        )
