import json
from pathlib import Path
from app.models import Species


class KnowledgeBase:
    def __init__(self) -> None:
        data_path = Path(__file__).resolve().parent.parent / "data" / "species.json"
        with data_path.open("r", encoding="utf-8") as f:
            raw = json.load(f)
        self.species: list[Species] = [Species(**item) for item in raw]
        self.by_id = {sp.id: sp for sp in self.species}

    def search_species(self, query: str) -> list[Species]:
        q = query.lower().strip()
        if not q:
            return self.species
        return [
            sp
            for sp in self.species
            if q in sp.common_name.lower() or q in sp.scientific_name.lower()
        ]

    def get_species(self, species_id: str) -> Species | None:
        return self.by_id.get(species_id)
