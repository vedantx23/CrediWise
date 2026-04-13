from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import pandas as pd
import logging
import uvicorn

# Import the core modules built in previous phases
from phase2_decision_engine import DecisionEngine
from phase3_ml_pipeline import MLPipelineManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Phase4_API")

app = FastAPI(title="CrediWise Intelligence API", version="1.0.0")

# Initialize global managers
try:
    # In a real scenario, this DB would come from Phase 1 scraper output or a SQL Database
    mock_db = pd.DataFrame([
        {
            'card_name': 'Travel Plus',
            'base_reward_rate': 0.015,
            'travel_multiplier': 3.0,
            'dining_multiplier': 1.0,
            'annual_fee_inr': 1000,
            'has_milestone': 1,
            'milestone_target': 100000,
            'milestone_bonus_value': 1500,
            'point_to_fiat_ratio': 1.0
        },
        {
            'card_name': 'Dining King Cashback',
            'base_reward_rate': 0.01,
            'travel_multiplier': 1.0,
            'dining_multiplier': 5.0,
            'annual_fee_inr': 500,
            'has_milestone': 0,
            'point_to_fiat_ratio': 1.0
        }
    ])
    
    decision_engine = DecisionEngine(mock_db)
    ml_manager = MLPipelineManager(model_dir="models")
    logger.info("Intelligence Services Initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize core services: {e}")

# --- API Data Models ---

class Transaction(BaseModel):
    id: str
    merchant_name: str
    amount: float
    date: str

class ExpensePredictionRequest(BaseModel):
    prev_month_spend: float
    user_age_years: float
    income_lpa: float
    is_holiday_month: int

class RecommendationRequest(BaseModel):
    transactions: List[Transaction]

from fastapi.responses import HTMLResponse

# --- RESTful Endpoints ---

@app.get("/", response_class=HTMLResponse)
def serve_ui():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CrediWise Demo</title>
        <style>
            body { font-family: -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #334155; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            h1 { color: #0f172a; margin-bottom: 5px; }
            p { color: #64748b; margin-bottom: 30px; }
            .section { border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            h2 { font-size: 18px; margin-top: 0; }
            button { background: #3b82f6; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: 600; }
            button:hover { background: #2563eb; }
            pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>CrediWise AI Matchmaker</h1>
            <p>Simple interface to test the backend Machine Learning and Recommendation engines.</p>
            
            <div class="section">
                <h2>1. Predict Future Spending (Regression)</h2>
                <button onclick="testPrediction()">Run Prediction Test</button>
                <div id="res1"></div>
            </div>
            
            <div class="section">
                <h2>2. Get Card Recommendation (MCDA Engine)</h2>
                <button onclick="testRecommendation()">Run Recommendation Test</button>
                <div id="res2"></div>
            </div>
            
            <div class="section">
                <h2>3. Auto-Categorize Transactions (NLP)</h2>
                <button onclick="testCategorization()">Run Categorization Test</button>
                <div id="res3"></div>
            </div>
        </div>

        <script>
            async function testPrediction() {
                document.getElementById('res1').innerHTML = "<i>Predicting...</i>";
                try {
                    const res = await fetch('/api/v1/predict_expenses', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({prev_month_spend: 50000, user_age_years: 30, income_lpa: 12, is_holiday_month: 1})
                    });
                    const data = await res.json();
                    document.getElementById('res1').innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                } catch(e) { document.getElementById('res1').innerHTML = `<p style="color:red">Error: ${e}</p>`; }
            }

            async function testRecommendation() {
                document.getElementById('res2').innerHTML = "<i>Analyzing cards...</i>";
                try {
                    const res = await fetch('/api/v1/recommend_card', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({transactions: [{id: "1", merchant_name: "indigo airlines", amount: 25000, date: "2023-10-01"}]})
                    });
                    const data = await res.json();
                    document.getElementById('res2').innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                } catch(e) { document.getElementById('res2').innerHTML = `<p style="color:red">Error: ${e}</p>`; }
            }

            async function testCategorization() {
                document.getElementById('res3').innerHTML = "<i>Categorizing...</i>";
                try {
                    const res = await fetch('/api/v1/ingest_and_categorize', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify([{id: "1", merchant_name: "STARBUCKS", amount: 450, date: "2023-10-02"}])
                    });
                    const data = await res.json();
                    document.getElementById('res3').innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                } catch(e) { document.getElementById('res3').innerHTML = `<p style="color:red">Error: ${e}</p>`; }
            }
        </script>
    </body>
    </html>
    """

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "CrediWise Intelligence API"}

@app.post("/api/v1/ingest_and_categorize")
def ingest_transactions(payload: List[Transaction]):
    """
    Ingests raw transactions and uses the NLP ML Model to auto-categorize them.
    """
    categorized = []
    for tx in payload:
        try:
            # Phase 3: ML Auto-categorization
            predicted_category = ml_manager.predict_category(tx.merchant_name)
            
            categorized.append({
                "id": tx.id,
                "merchant_name": tx.merchant_name,
                "amount": tx.amount,
                "predicted_category": predicted_category
            })
        except Exception as e:
            # Fallback for missing models during cold starts
            logger.warning(f"Categorization failed for {tx.merchant_name}: {e}. Falling back to 'general'.")
            categorized.append({
                "id": tx.id,
                "merchant_name": tx.merchant_name,
                "amount": tx.amount,
                "predicted_category": "general"
            })
            
    return {"status": "success", "categorized_transactions": categorized}

@app.post("/api/v1/predict_expenses")
def predict_future_expenses(payload: ExpensePredictionRequest):
    """
    Uses the trained Regression model to forecast a user's expense next month.
    """
    try:
        features = payload.dict()
        predicted_spend = ml_manager.predict_expenses(features)
        return {
            "status": "success",
            "forecasted_next_month_spend_inr": round(predicted_spend, 2)
        }
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Return a mock prediction if model missing for demonstration
        fallback = (payload.prev_month_spend * 1.1) + (payload.is_holiday_month * 5000)
        return {
            "status": "warning", 
            "message": "Model missing, using heuristic fallback.",
            "forecasted_next_month_spend_inr": round(fallback, 2)
        }


@app.post("/api/v1/recommend_card")
def get_best_card_recommendation(payload: RecommendationRequest):
    """
    Passes categorized transactions to the Phase 2 Decision Engine
    to calculate rewards and return the best credit card choice.
    """
    try:
        # 1. First categorize the raw incoming transactions
        processed_txs = []
        for tx in payload.transactions:
            try:
                # Try ML mapping
                cat = ml_manager.predict_category(tx.merchant_name)
            except Exception:
                # Fallback mapping
                cat = "dining" if "zomato" in tx.merchant_name.lower() or "swiggy" in tx.merchant_name.lower() else "travel" if "airline" in tx.merchant_name.lower() else "shopping"
            
            processed_txs.append({
                "amount": tx.amount,
                "category": cat
            })
            
        # 2. Score via Decision Engine
        recommendations = decision_engine.get_best_card(processed_txs, top_n=3)
        
        return {
            "status": "success",
            "recommendations": recommendations
        }
    except Exception as e:
        logger.error(f"Error generating recommendation: {e}")
        raise HTTPException(status_code=500, detail="Recommendation Engine Failure")


if __name__ == "__main__":
    logger.info("Starting CrediWise Intelligence API standalone server...")
    uvicorn.run("phase4_api:app", host="0.0.0.0", port=8001, reload=True)
