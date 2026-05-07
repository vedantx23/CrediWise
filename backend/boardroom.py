"""
boardroom.py — AI Boardroom: 3 Ollama agents with persistent JSON memory

Agents:
  Max  — The Accountant  (cold math, fee optimisation)
  Sage — The Traveler    (lounge access, miles, forex)
  Mint — The Minimalist  (zero fee, simplicity)

Each agent:
  - Has a distinct system prompt / personality
  - Pulls relevant card facts from SQLite (RAG — matched to user's top categories)
  - Remembers last 5 exchanges in /memory/{user_id}_{agent}.json
  - Speaks in sequence: Max → Sage → Mint

Fallback: if Ollama is not running, agents return pre-written analytical responses
using only the card data — no LLM required. This keeps the feature usable offline.
"""

from __future__ import annotations
import json, re, sys
from pathlib import Path
from datetime import datetime
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import query, get_all_cards, get_all_rewards_map

# ─── Agent definitions ────────────────────────────────────────────────────────

AGENTS: dict[str, dict] = {
    "max": {
        "name": "Max",
        "role": "The Accountant",
        "emoji": "📊",
        "color": "blue",
        "system": (
            "You are Max, a brutally analytical financial accountant specialising in Indian "
            "credit cards. You speak in cold, precise numbers. You always cite annual fees, "
            "effective reward rates (ERR%), net annual value (NAV), and break-even thresholds. "
            "You never recommend a card without showing the maths. You are skeptical of "
            "lifestyle benefits and only care about rupee-for-rupee return. "
            "Keep your response under 120 words. Lead with the best-NAV card for this user "
            "and show the calculation."
        ),
    },
    "sage": {
        "name": "Sage",
        "role": "The Traveler",
        "emoji": "✈️",
        "color": "purple",
        "system": (
            "You are Sage, an Indian frequent traveller who lives by lounge access, airline "
            "miles, and forex markup savings. You speak with passion about travel perks. "
            "You prioritise: domestic lounge visits, international lounge access, forex markup "
            "percent, airline mile transfer partners, and travel insurance. "
            "You push back on Max when he ignores travel value. "
            "Keep your response under 120 words. Respond to Max's pick and offer your "
            "travel-optimised recommendation with specific lounge/mile benefits."
        ),
    },
    "mint": {
        "name": "Mint",
        "role": "The Minimalist",
        "emoji": "🌿",
        "color": "green",
        "system": (
            "You are Mint, a zero-fee minimalist who believes the best credit card is the one "
            "you never have to think about. You favour lifetime-free cards, simple flat cashback, "
            "and never paying annual fees. You find Max's fee calculations amusing and Sage's "
            "lounge obsession wasteful unless the user actually travels a lot. "
            "Keep your response under 120 words. Conclude the debate with a pragmatic "
            "recommendation focused on simplicity and zero hidden costs."
        ),
    },
}

OLLAMA_MODEL_PREFERENCE = ["llama3", "mistral", "llama3.2", "llama2", "phi3"]


# ─── Memory management ────────────────────────────────────────────────────────

def _memory_path(memory_dir: Path, user_id: str, agent: str) -> Path:
    return memory_dir / f"{user_id}_{agent}.json"


def _load_memory(memory_dir: Path, user_id: str, agent: str) -> list[dict]:
    p = _memory_path(memory_dir, user_id, agent)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding='utf-8'))[-10:]   # keep last 10 for context
        except Exception:
            pass
    return []


def _save_memory(
    memory_dir: Path, user_id: str, agent: str,
    exchange: dict, keep: int = 5,
) -> None:
    p = _memory_path(memory_dir, user_id, agent)
    p.parent.mkdir(parents=True, exist_ok=True)
    history = _load_memory(memory_dir, user_id, agent)
    history.append(exchange)
    history = history[-keep:]   # cap at last 5 exchanges
    p.write_text(json.dumps(history, indent=2, ensure_ascii=False), encoding='utf-8')


# ─── RAG: card context retrieval ─────────────────────────────────────────────

def _build_card_context(
    monthly_spend: dict[str, float],
    top_n: int = 8,
) -> str:
    """
    Pull the most relevant cards from SQLite based on user's top spend categories.
    Returns a compact text block to inject into each agent's system context.
    """
    if not monthly_spend:
        return ""

    # Rank categories by spend
    ranked_cats = sorted(monthly_spend, key=lambda c: monthly_spend[c], reverse=True)
    top_cats    = [c for c in ranked_cats if monthly_spend.get(c, 0) > 0][:4]

    all_cards   = {c["card_id"]: c for c in get_all_cards()}
    rewards_map = get_all_rewards_map()

    # Score each card by sum of rates in top categories
    scores: list[tuple[float, str]] = []
    for cid, rates in rewards_map.items():
        score = sum(rates.get(cat, 0.0) * monthly_spend.get(cat, 0) for cat in top_cats)
        scores.append((score, cid))
    scores.sort(reverse=True)

    lines = ["=== CARD FACTS (use these numbers only) ==="]
    for _, cid in scores[:top_n]:
        card = all_cards.get(cid)
        if not card:
            continue
        rates = rewards_map.get(cid, {})
        rate_str = ", ".join(
            f"{cat}:{rates[cat]:.1f}%"
            for cat in top_cats
            if cat in rates and rates[cat] > 0
        )
        lines.append(
            f"• {card['name']} ({card['bank']}): "
            f"fee=₹{int(card.get('annual_fee',0)):,} "
            f"| waiver_spend=₹{int(card.get('fee_waiver_spend') or 0):,} "
            f"| lounge_dom={card.get('lounge_domestic',0)} "
            f"| lounge_intl={card.get('lounge_intl',0)} "
            f"| forex={card.get('forex_markup_percent',3.5):.1f}% "
            f"| rates: {rate_str or 'see website'}"
        )
    lines.append(f"\nUser monthly spend: "
                 + ", ".join(f"{c}=₹{int(monthly_spend.get(c,0)):,}" for c in top_cats))
    return "\n".join(lines)


# ─── Ollama call ─────────────────────────────────────────────────────────────

def _get_ollama_model() -> str | None:
    """Return the first available Ollama model, or None if Ollama unreachable."""
    try:
        import ollama
        models = [m.model for m in ollama.list().models]
        for pref in OLLAMA_MODEL_PREFERENCE:
            for m in models:
                if pref in m.lower():
                    return m
        return models[0] if models else None
    except Exception:
        return None


def _ollama_chat(
    model: str,
    system: str,
    history: list[dict],
    user_message: str,
) -> str:
    """Call Ollama chat API. Returns assistant reply string."""
    import ollama

    messages = [{"role": "system", "content": system}]
    # Inject prior memory as alternating user/assistant turns
    for h in history[-4:]:   # last 4 exchanges = 8 messages
        messages.append({"role": "user",      "content": h.get("question", "")})
        messages.append({"role": "assistant", "content": h.get("answer",   "")})
    messages.append({"role": "user", "content": user_message})

    resp = ollama.chat(model=model, messages=messages)
    return resp.message.content.strip()


# ─── Fallback responses (no LLM) ─────────────────────────────────────────────

def _fallback_response(
    agent_key: str,
    user_question: str,
    card_context: str,
    monthly_spend: dict,
    prior_responses: dict[str, str],
) -> str:
    """
    Rule-based analytical response when Ollama is unavailable.
    Uses only actual card data from SQLite — no hallucination.
    """
    rewards_map = get_all_rewards_map()
    all_cards   = {c["card_id"]: c for c in get_all_cards()}

    total_monthly = sum(monthly_spend.values())

    # Find best card by NAV
    best_nav, best_cid = 0.0, None
    for cid, rates in rewards_map.items():
        card = all_cards.get(cid, {})
        if card.get("is_invite_only"):
            continue
        nav = sum(monthly_spend.get(cat, 0) * rates.get(cat, 0) / 100
                  for cat in monthly_spend) * 12
        fee = card.get("annual_fee", 0) or 0
        waiver = card.get("fee_waiver_spend", 0) or 0
        net = nav - (fee if total_monthly * 12 < waiver else 0)
        if net > best_nav:
            best_nav, best_cid = net, cid

    best_card = all_cards.get(best_cid, {}) if best_cid else {}
    best_name = best_card.get("name", "HDFC Millennia")

    # Find best travel card (most lounge + lowest forex)
    travel_card = max(
        (c for c in all_cards.values() if not c.get("is_invite_only")),
        key=lambda c: (c.get("lounge_domestic", 0) + c.get("lounge_intl", 0) * 2
                       - c.get("forex_markup_percent", 3.5) * 10),
        default={}
    )
    travel_name = travel_card.get("name", "HDFC Regalia")

    # Find best zero-fee card
    zero_fee = [c for c in all_cards.values()
                if (c.get("annual_fee") or 0) == 0 and not c.get("is_invite_only")]
    zero_fee_name = zero_fee[0]["name"] if zero_fee else "Axis Ace"

    if agent_key == "max":
        best_rates = rewards_map.get(best_cid, {})
        nav_str = f"₹{int(best_nav):,}"
        return (
            f"📊 **Max (The Accountant):** Running the numbers on your ₹{int(total_monthly):,}/mo spend — "
            f"**{best_name}** delivers the highest NAV at ~{nav_str}/yr. "
            f"Annual fee: ₹{int(best_card.get('annual_fee',0)):,} "
            f"(waived above ₹{int(best_card.get('fee_waiver_spend') or 0):,}/yr). "
            f"Top rates: "
            + ", ".join(f"{cat}={best_rates.get(cat,0):.1f}%"
                        for cat in monthly_spend if best_rates.get(cat, 0) > 0)[:120]
            + ". Anything less is leaving money on the table."
        )
    elif agent_key == "sage":
        lounge_dom  = travel_card.get("lounge_domestic", 0)
        lounge_intl = travel_card.get("lounge_intl", 0)
        forex       = travel_card.get("forex_markup_percent", 3.5)
        return (
            f"✈️ **Sage (The Traveler):** Max has the cashback math right, but he's "
            f"ignoring travel equity. **{travel_name}** gives you "
            f"{lounge_dom} domestic + {lounge_intl} international lounge visits/yr "
            f"and only {forex:.1f}% forex markup. "
            f"At ₹{int(total_monthly):,}/mo spend, the lounge value alone offsets the fee "
            f"if you fly even twice a year. Don't optimise for points and lose the airport privilege."
        )
    else:  # mint
        return (
            f"🌿 **Mint (The Minimalist):** Both of them are overcomplicating this. "
            f"**{zero_fee_name}** — lifetime free, flat cashback, no redemption portals, "
            f"no annual fee anxiety. If your spend is ₹{int(total_monthly):,}/mo, "
            f"a no-fee card with 2% flat cashback nets you ₹{int(total_monthly*0.02*12):,}/yr "
            f"with zero effort. Pick it, forget it, live your life."
        )


# ─── Main boardroom orchestrator ─────────────────────────────────────────────

def run_boardroom(
    user_id: str,
    question: str,
    monthly_spend: dict[str, float],
    memory_dir: Path,
    current_cards: list[str] | None = None,
    income_annual: float = 0,
    cibil_score: int = 700,
) -> dict:
    """
    Run a full boardroom debate between Max, Sage, and Mint.

    Returns:
    {
      "model":    str | None,
      "ollama":   bool,
      "transcript": [
        {"agent": "max",  "name": "Max",  "role": "...", "response": "..."},
        {"agent": "sage", ...},
        {"agent": "mint", ...},
      ],
      "question": str,
    }
    """
    card_context    = _build_card_context(monthly_spend)
    ollama_model    = _get_ollama_model()
    ollama_available = ollama_model is not None

    # Build full user message with spend context
    spend_summary = ", ".join(
        f"{cat}=₹{int(amt):,}"
        for cat, amt in sorted(monthly_spend.items(), key=lambda x: -x[1])
        if amt > 0
    )
    contextual_question = (
        f"User question: {question}\n\n"
        f"User monthly spend: {spend_summary}\n"
        f"Income: ₹{int(income_annual):,}/yr  |  CIBIL: {cibil_score}"
    )
    if current_cards:
        contextual_question += f"\nCurrent cards: {', '.join(current_cards)}"

    transcript = []
    prior_responses: dict[str, str] = {}

    for agent_key in ["max", "sage", "mint"]:
        agent = AGENTS[agent_key]
        memory = _load_memory(memory_dir, user_id, agent_key)

        # Build full system prompt: agent personality + card facts
        system_prompt = agent["system"] + "\n\n" + card_context

        # For Sage and Mint, include prior agent responses for debate continuity
        debate_context = contextual_question
        if prior_responses:
            debate_context += "\n\n--- Prior responses ---\n"
            for prev_key, prev_resp in prior_responses.items():
                debate_context += f"\n{AGENTS[prev_key]['name']}: {prev_resp}\n"

        if ollama_available:
            try:
                response = _ollama_chat(
                    model     = ollama_model,
                    system    = system_prompt,
                    history   = memory,
                    user_message = debate_context,
                )
            except Exception as e:
                response = _fallback_response(
                    agent_key, question, card_context, monthly_spend, prior_responses
                )
                ollama_available = False
        else:
            response = _fallback_response(
                agent_key, question, card_context, monthly_spend, prior_responses
            )

        # Persist to memory
        _save_memory(memory_dir, user_id, agent_key, {
            "question":  question,
            "answer":    response,
            "timestamp": datetime.now().isoformat(),
        })

        prior_responses[agent_key] = response
        transcript.append({
            "agent":    agent_key,
            "name":     agent["name"],
            "role":     agent["role"],
            "emoji":    agent["emoji"],
            "color":    agent["color"],
            "response": response,
        })

    return {
        "model":      ollama_model,
        "ollama":     ollama_model is not None,
        "transcript": transcript,
        "question":   question,
    }


# ─── OCR offer parser ─────────────────────────────────────────────────────────

def parse_offer_image(image_path: str) -> dict:
    """
    Use pytesseract to extract text from a bank SMS / offer letter image.
    Parse reward rate, validity, and card name using regex.
    Returns a structured offer dict.
    """
    try:
        import pytesseract
        from PIL import Image
        text = pytesseract.image_to_string(Image.open(image_path))
    except ImportError:
        raise RuntimeError("pytesseract / Pillow not installed.")
    except Exception as e:
        raise RuntimeError(f"OCR failed: {e}")

    # ── Extract reward rate ──────────────────────────────────────────────────
    rate = None
    rate_patterns = [
        r"(\d+(?:\.\d+)?)\s*%\s*(?:cashback|reward|back|off)",
        r"(\d+(?:\.\d+)?x)\s*(?:reward\s*)?points?",
        r"earn\s+(\d+(?:\.\d+)?)\s*(?:points?|%)",
        r"get\s+(\d+(?:\.\d+)?)\s*%",
        r"(\d+(?:\.\d+)?)\s*%\s*(?:discount|savings?)",
    ]
    for pat in rate_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            rate = m.group(1)
            break

    # ── Extract amount/limit ──────────────────────────────────────────────────
    amount = None
    amount_m = re.search(r"(?:upto?|maximum|max|on\s+spends?\s+of)\s*[₹rs\.]*\s*([\d,]+)", text, re.IGNORECASE)
    if amount_m:
        amount = amount_m.group(1).replace(",", "")

    # ── Extract card name ─────────────────────────────────────────────────────
    card_name = None
    card_patterns = [
        r"(HDFC\s+\w+(?:\s+\w+)?)",
        r"(ICICI\s+\w+(?:\s+\w+)?)",
        r"(Axis\s+\w+(?:\s+\w+)?)",
        r"(SBI\s+\w+(?:\s+\w+)?)",
        r"(Amex\s+\w+(?:\s+\w+)?)",
        r"(Kotak\s+\w+(?:\s+\w+)?)",
        r"(IndusInd\s+\w+(?:\s+\w+)?)",
        r"(AU\s+\w+(?:\s+\w+)?)",
    ]
    for pat in card_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            card_name = m.group(1).strip()
            break

    # ── Extract validity date ─────────────────────────────────────────────────
    valid_until = None
    date_m = re.search(
        r"(?:valid\s*(?:till|until|upto?)|expires?\s*(?:on)?)\s*:?\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+\w+\s+\d{2,4})",
        text, re.IGNORECASE
    )
    if date_m:
        valid_until = date_m.group(1).strip()

    # ── Match to known card in DB ─────────────────────────────────────────────
    matched_card_id = None
    if card_name:
        all_cards = get_all_cards()
        name_lower = card_name.lower()
        for c in all_cards:
            if any(part in c["name"].lower() for part in name_lower.split()):
                matched_card_id = c["card_id"]
                break

    return {
        "raw_text":         text.strip(),
        "reward_rate":      rate,
        "max_amount_inr":   amount,
        "card_name":        card_name,
        "matched_card_id":  matched_card_id,
        "valid_until":      valid_until,
        "parsed": (rate is not None or card_name is not None),
        "message": (
            f"Offer parsed: {rate or '?'}% reward on {card_name or 'card'}"
            + (f" (valid till {valid_until})" if valid_until else "")
        ),
    }
