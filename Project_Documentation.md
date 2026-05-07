# CrediWise: AI-Powered Credit Card Recommendation Engine

## 1. Project Overview
*   **The Problem:** The credit card market in India is saturated. Consumers struggle to find the right card due to complex reward structures, hidden fees, ambiguous eligibility criteria, and overwhelming marketing jargon. 
*   **The Solution:** CrediWise is an AI-driven, personalized credit card recommendation platform. It calculates the realistic financial value of a card based on a user’s unique spending habits, income, and lifestyle preferences.
*   **Target Users:** Indian consumers looking to maximize their credit card rewards, travel benefits, and net annual value without manually running complex calculations.

## 2. AI Intelligence Layer (Python/Flask Service)
*   **Persona Engine:**
    *   *Logic:* A Random Forest classifier that analyzes spending across 7 categories: Dining, Fuel, Grocery, Travel, Online, Utilities, International.
    *   *Archetypes:* Predicts one of four personas: The Stealth Nomad, The High-Street Architect, The Reward Arbitrageur, The Frugal Zen Master.
*   **Shadow Audit System:**
    *   *NAV Logic:* Calculates Net Asset Value (NAV) by mapping spending categories to the highest available reward rates in the portfolio.
    *   *Leakage Analysis:* Compares the user's current NAV against an "Optimal NAV" (using the best cards in the market) to calculate "Reward Leakage" (lost savings).
    *   *Explainability:* Uses SHAP-like logic to explain why a specific card is recommended (e.g., "Boosts travel rewards by 4.2%").

## 3. Functional Features & Endpoints
*   **Dashboard Oracle:** A central hub showing Portfolio Health, Reward Distribution, and the "Spending Archetype" card.
*   **Instrument Vault:** A secure interface to add and manage multiple credit cards and bank accounts.
*   **Intelligent Recommendations:** A sidebar that ranks cards based on the specific INR value they would add to the user's current spending pattern.
*   **Expense Analytics:** Automated categorization of transactions into the 7 core reward categories.

## 4. Tech Stack
*   **Frontend:** React, Vite, CSS3 (Single Page Architecture).
*   **Backend & APIs:** Python 3, Flask.
*   **Data Processing & Engineering:** Pandas, NumPy, Scikit-learn (KNNImputer, MultiLabelBinarizer, StandardScaler).
*   **AI & Machine Learning:** Ollama (serving the `llama3.2:3b` LLM model locally) for RAG capabilities, Multi-Criteria Decision Analysis (MCDA) algorithms (e.g., TOPSIS) for ranking.
*   **Data Storage:** CSV-based tabular data sets acting as a lightweight, read-optimized database.

## 5. System Architecture
*   **Phase 1 (Data Acquisition):** Python scraping scripts fetch real-time card data from the web.
*   **Phase 2 (Data Pipeline):** The raw data is passed through `CrediWiseDataPipeline` which standardizes text, extracts Indian currency values/milestones, scales features, and resolves partner merchants.
*   **Phase 3 (Decision Engine):** Machine learning components formulate predictive models, storing weights as artifacts to enable fast inference.
*   **Phase 4 (API & Frontend):** The Flask instance serves the pre-calculated recommendations and bridges the RAG chatbot with the dataset and the user interface.

## 5. Database Design
Instead of a traditional relational database, the project utilizes structured datasets optimized for fast data-science operations:
*   **Raw Dataset (`credit_card_dataset_master.csv`)**: Contains base attributes.
    *   *Entities:* Card_Name, Bank_Name, Annual_Fee, Reward_Description, Minimum_Income, Lounge_Access, Forex_Markup.
*   **Engineered Dataset (`credit_card_dataset_engineered.csv`)**: Contains derived variables.
    *   *Derived Entities:* Net_Annual_Value, Effective_Reward_Rate_Index, Travel_Benefit_Index, Lifestyle_Benefit_Index, Spend_Based_Fee_Waiver_INR.

## 6. APIs
*   `POST /recommend`: Accepts user profiling (income, category-wise monthly spend, optimization preferences, owned cards) and returns the top matched credit cards mapped to their financial profile.
*   `POST /api/query`: Retrieves contextual context from the dataset and sends it to the local LLM to answer natural language questions about credit cards.
*   `POST /api/retrain`: Endpoint to securely trigger the underlying `train_models.py` workflow via subprocess to ingest new credit card data.
*   `GET /health`: Diagnostic check for model artifacts and Ollama AI engine readiness.

## 7. Unique Selling Points (USP)
*   **Mathematical Transparency:** Doesn't just say a card is "best for travel"—it computes the exact expected INR value based on the user's specific travel spend inputs.
*   **Total Data Privacy:** By utilizing a local LLM (Ollama) and running offline data calculations, user financial profiling data never leaves the server.
*   **Holistic Evaluation:** Accounts for often-ignored benefits such as milestone rewards, fee-waiver thresholds, and experiential perks like lounge visits.

## 8. Challenges & Solutions
*   **Challenge:** Unstructured, inconsistent marketing text for card rewards across different banks.
    *   **Solution:** Built an advanced NLP parsing layer (`data_pipeline.py`) using custom regex specifically tailored to Indian financial terminology (Lacs, Cr, Rs, rewards per spend).
*   **Challenge:** Overwhelming backend processing times causing slow UI rendering.
    *   **Solution:** Separated the heavyweight ML training and data engineering into background tasks (`train_models.py`) and cached the resulting parameters as serialized artifacts for lightning-fast API responses.
*   **Challenge:** Hallucinations in the AI Chatbot.
    *   **Solution:** Implemented Retrieval-Augmented Generation (RAG). The API queries the exact dataset row for the requested cards and prepends hard facts to the LLM system prompt before answering.

## 9. Future Scope & Improvements
*   **Bank Statement Integration:** Allow users to automatically upload a bank statement PDF to accurately infer their spending distribution rather than relying on manual input.
*   **Direct Application Portals:** Implement affiliate linking and direct application API integration to apply for cards straight from the platform.
*   **Portfolio Management:** Expand features beyond finding a *new* card to managing existing cards (e.g., predicting when fee waivers will hit or when milestone benefits expire).
*   **Mobile Application:** Port the existing responsive web app to a native mobile framework like Flutter or React Native.
