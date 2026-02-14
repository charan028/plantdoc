export type DetectionCandidate = {
  species_id: string;
  confidence: number;
};

export type DetectionResponse = {
  best_match: DetectionCandidate;
  alternatives: DetectionCandidate[];
  care_tip: string;
};

export type Species = {
  id: string;
  scientific_name: string;
  common_name: string;
  care_difficulty: string;
  watering_frequency_days: number;
  light: string;
  pet_toxicity: string;
};

export type ChatResponse = {
  route: string;
  answer: string;
  source: string;
  timestamp: string;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").trim().replace(/\/+$/, "");

export async function fetchSpecies(query: string): Promise<Species[]> {
  const res = await fetch(`${API_BASE}/api/species?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to fetch species");
  return res.json();
}

export async function detectPlant(file: File): Promise<DetectionResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/detect`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Plant detection failed");
  return res.json();
}

export async function detectPlantFrame(blob: Blob): Promise<DetectionResponse> {
  const form = new FormData();
  form.append("file", blob, "frame.jpg");
  const res = await fetch(`${API_BASE}/api/detect`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Plant detection failed");
  return res.json();
}


export async function askPlantAssistant(message: string, context?: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: "demo-user", message, context })
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

/** New Chat History API */

export async function createChatSession(userId: string, title: string = "New Chat") {
  const res = await fetch(`${API_BASE}/api/chat/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, title }),
  });
  return res.json();
}

export async function getChatSessions(userId: string) {
  const res = await fetch(`${API_BASE}/api/chat/sessions?user_id=${userId}`);
  return res.json();
}

export async function getChatHistory(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/chat/history/${sessionId}`);
  return res.json();
}

export async function uploadChatImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/chat/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function submitChatMessage(sessionId: string, content: string, role: string = "user", imageUrl?: string) {
  const res = await fetch(`${API_BASE}/api/chat/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, content, role, image_url: imageUrl }),
  });
  return res.json();
}
