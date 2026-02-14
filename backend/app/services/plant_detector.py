import hashlib
import cv2
import numpy as np
from app.models import DetectionCandidate, DetectionResponse
from app.services.knowledge_base import KnowledgeBase


class PlantDetector:
    def __init__(self, kb: KnowledgeBase) -> None:
        self.kb = kb
        # Lightweight human-face guard to prevent obvious non-plant matches.
        self._face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

    def detect(self, image_bytes: bytes) -> DetectionResponse:
        if not self.kb.species:
            raise ValueError("Species catalog is empty")
        if self._contains_human_face(image_bytes):
            return DetectionResponse(
                best_match=DetectionCandidate(species_id="not-a-plant", confidence=1.0),
                alternatives=[],
                care_tip="Human/face detected. Please upload a clear photo of leaves or the full plant.",
            )

        digest = hashlib.sha256(image_bytes).hexdigest()
        seed = int(digest[:8], 16)
        ranked = []
        for idx, sp in enumerate(self.kb.species):
            score = ((seed + (idx + 1) * 7919) % 1000) / 1000
            ranked.append((sp.id, score))

        ranked.sort(key=lambda x: x[1], reverse=True)
        best_id, best_score = ranked[0]
        alternatives = ranked[1:5]

        tip_source = self.kb.get_species(best_id)
        care_tip = (
            f"Water every {tip_source.watering_frequency_days} days and keep in {tip_source.light} light."
            if tip_source
            else "Keep soil slightly moist and provide indirect light."
        )

        return DetectionResponse(
            best_match=DetectionCandidate(species_id=best_id, confidence=round(0.55 + best_score * 0.4, 2)),
            alternatives=[
                DetectionCandidate(species_id=sp_id, confidence=round(0.4 + score * 0.35, 2))
                for sp_id, score in alternatives
            ],
            care_tip=care_tip,
        )

    def _contains_human_face(self, image_bytes: bytes) -> bool:
        np_buf = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(np_buf, cv2.IMREAD_COLOR)
        if frame is None:
            return False
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self._face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60),
        )
        return len(faces) > 0
