from datetime import UTC, datetime
from app.llm.providers import LLMProvider
from app.models import ChatResponse
from app.services.knowledge_base import KnowledgeBase


class AgentRouter:
    def __init__(self, kb: KnowledgeBase, provider: LLMProvider) -> None:
        self.kb = kb
        self.provider = provider

    async def answer(self, message: str) -> ChatResponse:
        route = self._classify(message)

        if route == "species_lookup":
            hits = self.kb.search_species(message)
            if hits:
                sp = hits[0]
                answer = (
                    f"{sp.common_name} ({sp.scientific_name}) is {sp.care_difficulty} care. "
                    f"Water roughly every {sp.watering_frequency_days} days in {sp.light} light."
                )
                return ChatResponse(
                    route=route,
                    answer=answer,
                    source="knowledge-base",
                    timestamp=datetime.now(UTC),
                )

        enriched_prompt = (
            "You are a plant care assistant. Give concise, practical steps. "
            f"User message: {message}"
        )
        text, source = await self.provider.complete(enriched_prompt)
        return ChatResponse(route=route, answer=text, source=source, timestamp=datetime.now(UTC))

    def _classify(self, message: str) -> str:
        lower = message.lower()
        if any(word in lower for word in ["identify", "what plant", "species"]):
            return "plant_identification"
        if any(word in lower for word in ["water", "fertilize", "light", "yellow", "brown"]):
            return "care_expert"
        if any(word in lower for word in ["monstera", "pothos", "snake", "ficus", "lily"]):
            return "species_lookup"
        return "general_plant_help"
