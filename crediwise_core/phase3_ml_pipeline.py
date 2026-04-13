import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, classification_report
import joblib
import logging
import os

logger = logging.getLogger("Phase3_MLPipeline")
logger.setLevel(logging.INFO)

class MLPipelineManager:
    """
    Manages the lifecycle (training, prediction, persistence) of the three required ML models:
    1. Auto-Categorization (NLP/Classification)
    2. User Clustering
    3. Expense Prediction (Regression)
    """
    
    def __init__(self, model_dir: str = "models/"):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        
        # In-memory models
        self.category_model = None
        self.clustering_model = None
        self.expense_model = None

    # --- 1. Auto-Categorization (NLP/Classification) ---
    def train_categorization_model(self, transactions_df: pd.DataFrame):
        """Builds an NLP model to categorize raw merchant strings into categories (Travel, Dining, etc.)"""
        logger.info("Training Auto-Categorization Model...")
        
        if 'merchant_name' not in transactions_df.columns or 'category' not in transactions_df.columns:
            raise ValueError("Dataframe must contain 'merchant_name' and 'category' columns.")
            
        X = transactions_df['merchant_name']
        y = transactions_df['category']
        
        # Pipeline: TF-IDF -> Logistic Regression
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
            ('clf', LogisticRegression(max_iter=1000, class_weight='balanced'))
        ])
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        pipeline.fit(X_train, y_train)
        
        # Evaluate
        preds = pipeline.predict(X_test)
        logger.info(f"\nCategorization Report:\n{classification_report(y_test, preds)}")
        
        self.category_model = pipeline
        joblib.dump(pipeline, os.path.join(self.model_dir, "auto_categorizer.pkl"))

    def predict_category(self, merchant_name: str) -> str:
        """Predict category for a new merchant string."""
        if not self.category_model:
            self.category_model = joblib.load(os.path.join(self.model_dir, "auto_categorizer.pkl"))
        return self.category_model.predict([merchant_name])[0]


    # --- 2. Clustering (Unsupervised Learning) ---
    def train_clustering_model(self, user_profiles_df: pd.DataFrame):
        """Groups users based on spending distributions (e.g., High-Travel vs High-Dining)."""
        logger.info("Training User Clustering Model...")
        
        # Assume df has columns: ['pct_travel', 'pct_dining', 'pct_shopping', 'total_spend', 'tx_count']
        features = ['pct_travel', 'pct_dining', 'pct_shopping', 'total_spend']
        X = user_profiles_df[features]
        
        # Pipeline: Scale -> KMeans
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('kmeans', KMeans(n_clusters=4, random_state=42, n_init=10))
        ])
        
        pipeline.fit(X)
        self.clustering_model = pipeline
        joblib.dump(pipeline, os.path.join(self.model_dir, "user_clustering.pkl"))
        logger.info("Clustering model trained and saved.")

    def predict_cluster(self, user_features: dict) -> int:
        """Assign a user to a cluster ID."""
        if not self.clustering_model:
            self.clustering_model = joblib.load(os.path.join(self.model_dir, "user_clustering.pkl"))
            
        df = pd.DataFrame([user_features])
        return int(self.clustering_model.predict(df)[0])


    # --- 3. Expense Prediction (Regression) ---
    def train_expense_model(self, historical_df: pd.DataFrame):
        """Estimates future numerical expenses based on historical features."""
        logger.info("Training Expense Prediction (Regression) Model...")
        
        # Target: Next month's total spend
        # Features: previous month spend, age, income, is_holiday_month
        features = ['prev_month_spend', 'user_age_years', 'income_lpa', 'is_holiday_month']
        target = 'target_next_month_spend'
        
        X = historical_df[features]
        y = historical_df[target]
        
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('rf', RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))
        ])
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        pipeline.fit(X_train, y_train)
        
        # Evaluate
        preds = pipeline.predict(X_test)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        logger.info(f"Regression RMSE: ₹{rmse:.2f}")
        
        self.expense_model = pipeline
        joblib.dump(pipeline, os.path.join(self.model_dir, "expense_predictor.pkl"))

    def predict_expenses(self, features: dict) -> float:
        """Predict next month's total spend."""
        if not self.expense_model:
            self.expense_model = joblib.load(os.path.join(self.model_dir, "expense_predictor.pkl"))
        df = pd.DataFrame([features])
        return float(self.expense_model.predict(df)[0])

if __name__ == "__main__":
    # Internal Unit Tests & Dummy Training Generation
    manager = MLPipelineManager(model_dir="models")
    
    # 1. Mock Data for Categorization
    logger.info("--- Testing Categorization ---")
    mock_merchants = pd.DataFrame([
        {'merchant_name': 'STARBUCKS', 'category': 'dining'},
        {'merchant_name': 'ZOMATO ONLINE', 'category': 'dining'},
        {'merchant_name': 'INDIGO AIRLINES', 'category': 'travel'},
        {'merchant_name': 'MAKEMYTRIP', 'category': 'travel'},
        {'merchant_name': 'AMAZON HOLDINGS', 'category': 'shopping'},
        {'merchant_name': 'FLIPKART INTERNET', 'category': 'shopping'}
    ])
    # Duplicate to give model some mass
    mock_merchants = pd.concat([mock_merchants]*20, ignore_index=True)
    manager.train_categorization_model(mock_merchants)
    print(f"Prediction for 'MCDONALDS': {manager.predict_category('MCDONALDS')}")
    
    # 2. Mock Data for Clustering
    logger.info("--- Testing Clustering ---")
    mock_users = pd.DataFrame([
        {'pct_travel': 0.7, 'pct_dining': 0.1, 'pct_shopping': 0.2, 'total_spend': 100000},
        {'pct_travel': 0.1, 'pct_dining': 0.8, 'pct_shopping': 0.1, 'total_spend': 30000},
        {'pct_travel': 0.2, 'pct_dining': 0.2, 'pct_shopping': 0.6, 'total_spend': 75000},
        {'pct_travel': 0.25, 'pct_dining': 0.25, 'pct_shopping': 0.5, 'total_spend': 50000}
    ])
    mock_users = pd.concat([mock_users]*50, ignore_index=True)
    manager.train_clustering_model(mock_users)
    print(f"Cluster Assignment: {manager.predict_cluster({'pct_travel': 0.8, 'pct_dining': 0.1, 'pct_shopping': 0.1, 'total_spend': 150000})}")
    
    # 3. Mock Data for Regression
    logger.info("--- Testing Regression ---")
    mock_history = pd.DataFrame({
        'prev_month_spend': np.random.uniform(20000, 150000, 500),
        'user_age_years': np.random.uniform(22, 60, 500),
        'income_lpa': np.random.uniform(5, 50, 500),
        'is_holiday_month': np.random.choice([0, 1], 500)
    })
    # Target linearly structured with some noise
    mock_history['target_next_month_spend'] = (
        mock_history['prev_month_spend'] * 0.8 + 
        mock_history['is_holiday_month'] * 20000 + 
        np.random.normal(0, 5000, 500)
    )
    manager.train_expense_model(mock_history)
    future_spend = manager.predict_expenses({
        'prev_month_spend': 50000, 
        'user_age_years': 30, 
        'income_lpa': 12, 
        'is_holiday_month': 1
    })
    print(f"Predicted Future Spend: ₹{future_spend:.2f}")
