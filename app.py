import json
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, model_validator
import ollama
import pandas as pd
import subprocess

from crediwise_core.recommendation_service import load_artifacts, recommend_cards


app = FastAPI(title="CrediWise Recommendation + AI Query", version="8.0.0")

try:
    ARTIFACTS = load_artifacts()
    ARTIFACTS_OK = True
    DB = pd.read_csv("credit_card_dataset_master.csv")
except Exception:
    ARTIFACTS = None
    ARTIFACTS_OK = False
    DB = None

OLLAMA_MODEL = "llama3.2:3b"

ADVISOR_SYSTEM_PROMPT = """You are the CrediWise Card Architect. Your mission is to deliver beautifully formatted, high-impact financial advice.

### MANDATORY STYLE PROTOCOL:
1.  **DOUBLE NEWLINES**: Use `\n\n` between every single paragraph, list item, and heading. This is critical for rendering.
2.  **PRIMARY HEADINGS**: Use `###` followed by an emoji for ALL section titles. Never use `**` for a primary heading.
3.  **DIVIDERS**: Use `---` (Horizontal Rule) between every major section.
4.  **LISTS**: Use `* ` for list items. Each item MUST be on its own line with double spacing.
5.  **BOLDING**: Use `**` only for highlighting card names, fees, and key numbers.
6.  **SECTION ARCHITECTURE**: 
    - **### 🎯 Executive Summary** (Start here)
    - **---**
    - **### 📊 Comparative Analysis** (Detailed breakdown)
    - **---**
    - **### 💡 CrediWise Recommendation** (Final verdict)

### VISUAL GUIDELINES:
- **Tone**: Authoritative and data-driven.
- **Visuals**: Use relevant emojis (✈️, 🛍️, 🏦).
- **Numbers**: Use INR (₹) and exact percentages."""


class UserProfileVector(BaseModel):
    Income: float = Field(default=12.0)
    Monthly_Spend: float = Field(default=30000)
    Spend_Travel: float = Field(default=0)
    Spend_Dining: float = Field(default=0)
    Spend_Ecommerce: float = Field(default=0)
    Spend_Transit: float = Field(default=0)
    Spend_General: float = Field(default=0)
    Spend_Distribution_by_Category: Dict[str, float] = Field(default_factory=dict)
    Lifestyle_Preferences: List[str] = Field(default_factory=list)
    International_Travel_Frequency: int = Field(default=0)
    Optimization_Preference: str = Field(default="balanced")
    Primary_Lifestyle_Preference: str = Field(default="none")
    Owned_Cards: Optional[List[str]] = Field(default=None)
    top_k: int = Field(default=3)

    @model_validator(mode="after")
    def compute_distribution(self):
        spends = {
            "travel": self.Spend_Travel, "dining": self.Spend_Dining,
            "ecommerce": self.Spend_Ecommerce, "transit": self.Spend_Transit,
            "general": self.Spend_General,
        }
        total = sum(spends.values())
        if self.Monthly_Spend <= 0:
            self.Monthly_Spend = total if total > 0 else 30000
        if total > 0:
            self.Spend_Distribution_by_Category = {k: v / total for k, v in spends.items()}
        else:
            self.Spend_Distribution_by_Category = {"dining": 0.3, "travel": 0.25, "ecommerce": 0.25, "general": 0.2}
        self.Primary_Lifestyle_Preference = self.Lifestyle_Preferences[0].lower() if self.Lifestyle_Preferences else "none"
        self.Optimization_Preference = self.Optimization_Preference.lower()
        self.Lifestyle_Preferences = [p.lower() for p in self.Lifestyle_Preferences]
        return self


class RecommendRequest(BaseModel):
    Income: float
    Monthly_Spend: float = 0
    Spend_Travel: float = 0
    Spend_Dining: float = 0
    Spend_Ecommerce: float = 0
    Spend_Transit: float = 0
    Spend_General: float = 0
    Lifestyle_Preferences: List[str] = []
    International_Travel_Frequency: int = 0
    Optimization_Preference: str = "balanced"
    Owned_Cards: Optional[List[str]] = None
    top_k: int = 3


@app.post("/recommend")
def recommend(req: RecommendRequest):
    if not ARTIFACTS_OK:
        raise HTTPException(503, "Model artifacts missing. Run `python3 train_models.py` first.")
    profile = UserProfileVector(**req.model_dump())
    result = recommend_cards(ARTIFACTS, profile.model_dump(), top_k=req.top_k, owned_cards=req.Owned_Cards)
    return result


class QueryRequest(BaseModel):
    question: str
    history: List[Dict] = []
    recommended_cards: List[str] = []


@app.post("/api/query")
def ai_query(req: QueryRequest):
    rag_context = ""
    if DB is not None:
        q_lower = req.question.lower()
        matches = []
        for _, row in DB.iterrows():
            if str(row["Card_Name"]).lower() in q_lower or str(row.get("Bank_Name", "")).lower() in q_lower:
                matches.append(row)
            if len(matches) >= 3:
                break
        if matches:
            rag_context += "\nDATABASE FACTS (Use exactly):\n"
            for m in matches:
                rag_context += f"- {m['Card_Name']}: Annual Fee {m['Annual_Fee_INR']} INR. Type: {m.get('Reward_Type', 'N/A')}. Domestic Lounge: {m.get('Lounge_Domestic', 0)}.\n"

    context = ADVISOR_SYSTEM_PROMPT
    if req.recommended_cards:
        context += f"\n\nUSER'S TOP RECOMMENDED CARDS: {', '.join(req.recommended_cards)}"
    if rag_context:
        context += f"\n\n{rag_context}"

    messages = [{"role": "system", "content": context}]
    for h in req.history[-10:]:
        messages.append(h)
    messages.append({"role": "user", "content": req.question})
    
    try:
        resp = ollama.chat(model=OLLAMA_MODEL, messages=messages, options={"temperature": 0.4})
        answer = resp["message"]["content"].strip()
    except Exception as e:
        answer = f"⚠️ Could not reach Ollama: {e}."
    return {"answer": answer}

@app.post("/api/retrain")
def retrain_models():
    try:
        subprocess.run(["python3", "train_models.py"], check=True)
        global ARTIFACTS, ARTIFACTS_OK, DB
        ARTIFACTS = load_artifacts()
        ARTIFACTS_OK = True
        DB = pd.read_csv("credit_card_dataset_master.csv")
        return {"status": "success", "message": "Models retrained and loaded."}
    except Exception as e:
        raise HTTPException(500, f"Retrain failed: {e}")


@app.get("/health")
def health():
    try:
        models = ollama.list()
        names = [m["model"] for m in models.get("models", [])]
        ollama_ok = OLLAMA_MODEL in names
    except Exception:
        ollama_ok = False
    return {"artifacts": ARTIFACTS_OK, "ollama_ready": ollama_ok, "model": OLLAMA_MODEL}


@app.get("/", response_class=HTMLResponse)
def ui():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()
