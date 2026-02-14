import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    # Try to load from backend/.env if not in current env
    load_dotenv("../backend/.env")
    api_key = os.environ.get("GOOGLE_API_KEY")

print(f"API Key found: {api_key[:5]}..." if api_key else "API Key NOT found")

client = genai.Client(api_key=api_key)

print("Listing models...")
try:
    for m in client.models.list():
        try:
            methods = m.supported_generation_methods if hasattr(m, "supported_generation_methods") else "Unknown"
            print(f"- {m.name} (Methods: {methods})")
        except Exception as e:
            print(f"- {m.name} (Error getting methods: {e})")
except Exception as e:
    print(f"Error listing models: {e}")
