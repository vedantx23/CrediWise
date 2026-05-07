import os
import json
import requests

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "llama3" # Make sure to have this model pulled in Ollama

MEMORY_DIR = os.path.join(os.path.dirname(__file__), "memory")
os.makedirs(MEMORY_DIR, exist_ok=True)

AGENTS = {
    "Max": "You are Max, the Accountant. Your focus is cold math, fee optimization, and maximum ROI. Be direct and slightly condescending about poor financial decisions.",
    "Sage": "You are Sage, the Traveler. Your focus is lifestyle, lounge access, air miles, and forex markup. You value experiences over minor cashback.",
    "Mint": "You are Mint, the Minimalist. Your focus is zero annual fees, maximum simplicity, and mental peace. You hate complex reward structures."
}

def get_memory_file(user_id, agent_name):
    return os.path.join(MEMORY_DIR, f"{user_id}_{agent_name}.json")

def load_memory(user_id, agent_name):
    filepath = get_memory_file(user_id, agent_name)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return []

def save_memory(user_id, agent_name, memory):
    memory = memory[-10:] # Keep last 5 exchanges
    filepath = get_memory_file(user_id, agent_name)
    with open(filepath, "w") as f:
        json.dump(memory, f)

def query_agent(agent_name, system_context, user_prompt, user_id):
    memory = load_memory(user_id, agent_name)
    
    messages = [
        {"role": "system", "content": f"{AGENTS[agent_name]}\nContext: {system_context}"}
    ]
    messages.extend(memory)
    messages.append({"role": "user", "content": user_prompt})
    
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "messages": messages,
            "stream": False
        }, timeout=15)
        
        if response.status_code == 200:
            result = response.json()["message"]["content"]
            
            memory.append({"role": "user", "content": user_prompt})
            memory.append({"role": "assistant", "content": result})
            save_memory(user_id, agent_name, memory)
            
            return result
        else:
            return f"{agent_name} is currently offline."
    except requests.exceptions.RequestException:
        # Fallback if Ollama isn't running locally
        return f"[Simulated {agent_name} response since Ollama is unreachable at {OLLAMA_URL}]"

def run_boardroom_debate(user_id, user_profile_summary, card_facts):
    system_context = f"User Profile: {user_profile_summary}\nRelevant Card Facts: {card_facts}"
    
    max_prompt = "Review the user's profile and suggest the best mathematical move. Keep it to 2-3 sentences."
    max_response = query_agent("Max", system_context, max_prompt, user_id)
    
    sage_prompt = f"Max just suggested: '{max_response}'. Respond by emphasizing lifestyle and travel benefits instead. Keep it to 2-3 sentences."
    sage_response = query_agent("Sage", system_context, sage_prompt, user_id)
    
    mint_prompt = f"Max said: '{max_response}'. Sage said: '{sage_response}'. Conclude by advocating for simplicity and zero fees. Keep it to 2-3 sentences."
    mint_response = query_agent("Mint", system_context, mint_prompt, user_id)
    
    return [
        {"agent": "Max", "role": "The Accountant", "text": max_response},
        {"agent": "Sage", "role": "The Traveler", "text": sage_response},
        {"agent": "Mint", "role": "The Minimalist", "text": mint_response}
    ]
