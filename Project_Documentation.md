# CrediWise: AI-Powered Credit Card Recommendation Engine

## 1. Project Overview
*   **The Problem:** The credit card market in India is saturated. Consumers struggle to find the right card due to complex reward structures, hidden fees, ambiguous eligibility criteria, and overwhelming marketing jargon. 
*   **The Solution:** CrediWise is an AI-driven, personalized credit card recommendation platform. It calculates the realistic financial value of a card based on a user’s unique spending habits, income, and lifestyle preferences.
*   **Target Users:** Indian consumers looking to maximize their credit card rewards, travel benefits, and net annual value without manually running complex calculations.

## 2. Key Features
*   **Hyper-Personalized Matching:** Recommends cards based on precise spending allocations (e.g., travel, dining, e-commerce, general) rather than generic labels.
*   **AI Chat Advisor:** A locally-hosted AI assistant that answers specific user questions about card benefits, eligibility, and direct comparisons using factual platform data.
*   **Intelligent Data Sanitization Pipeline:** Automatically parses complex textual definitions of "rewards" and "fee waivers" into clean, comparable mathematical data points.
*   **Dynamic Valuation:** Calculates the "Net Annual Value" factoring in expected rewards, joining/annual fees, and fee-waiver thresholds based on projected spends.

## 3. Tech Stack
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (Single Page Architecture).
*   **Backend & APIs:** Python 3, FastAPI.
*   **Data Processing & Engineering:** Pandas, NumPy, Scikit-learn (KNNImputer, MultiLabelBinarizer, StandardScaler).
*   **AI & Machine Learning:** Ollama (serving the `llama3.2:3b` LLM model locally) for RAG capabilities, Multi-Criteria Decision Analysis (MCDA) algorithms (e.g., TOPSIS) for ranking.
*   **Data Storage:** CSV-based tabular data sets acting as a lightweight, read-optimized database.

## 4. System Architecture
*   **Phase 1 (Data Acquisition):** Python scraping scripts fetch real-time card data from the web.
*   **Phase 2 (Data Pipeline):** The raw data is passed through `CrediWiseDataPipeline` which standardizes text, extracts Indian currency values/milestones, scales features, and resolves partner merchants.
*   **Phase 3 (Decision Engine):** Machine learning components formulate predictive models, storing weights as artifacts to enable fast inference.
*   **Phase 4 (API & Frontend):** The FastAPI instance serves the pre-calculated recommendations and bridges the RAG chatbot with the dataset and the user interface.

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
