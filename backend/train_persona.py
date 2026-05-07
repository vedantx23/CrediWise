import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# Define categories
CATEGORIES = ['dining', 'fuel', 'grocery', 'travel', 'online', 'utilities', 'international']

def generate_synthetic_data(n_samples=1000):
    data = []
    labels = []
    
    for _ in range(n_samples):
        # 0 = "The Stealth Nomad" (high travel + intl spend)
        if np.random.rand() < 0.25:
            spend = {
                'dining': np.random.randint(2000, 10000),
                'fuel': np.random.randint(1000, 5000),
                'grocery': np.random.randint(2000, 8000),
                'travel': np.random.randint(20000, 100000),
                'online': np.random.randint(5000, 20000),
                'utilities': np.random.randint(1000, 5000),
                'international': np.random.randint(10000, 50000)
            }
            label = 0
        # 1 = "The High-Street Architect" (high dining + online)
        elif np.random.rand() < 0.5:
            spend = {
                'dining': np.random.randint(15000, 40000),
                'fuel': np.random.randint(1000, 5000),
                'grocery': np.random.randint(2000, 10000),
                'travel': np.random.randint(1000, 10000),
                'online': np.random.randint(20000, 60000),
                'utilities': np.random.randint(1000, 5000),
                'international': np.random.randint(0, 5000)
            }
            label = 1
        # 2 = "The Reward Arbitrageur" (high online + grocery + fuel)
        elif np.random.rand() < 0.75:
            spend = {
                'dining': np.random.randint(5000, 15000),
                'fuel': np.random.randint(5000, 15000),
                'grocery': np.random.randint(10000, 25000),
                'travel': np.random.randint(5000, 15000),
                'online': np.random.randint(10000, 25000),
                'utilities': np.random.randint(2000, 8000),
                'international': np.random.randint(0, 2000)
            }
            label = 2
        # 3 = "The Frugal Zen Master" (low spend, utilities + grocery)
        else:
            spend = {
                'dining': np.random.randint(0, 3000),
                'fuel': np.random.randint(0, 3000),
                'grocery': np.random.randint(2000, 8000),
                'travel': np.random.randint(0, 2000),
                'online': np.random.randint(0, 5000),
                'utilities': np.random.randint(1000, 4000),
                'international': 0
            }
            label = 3
            
        data.append([spend[cat] for cat in CATEGORIES])
        labels.append(label)
        
    return pd.DataFrame(data, columns=CATEGORIES), np.array(labels)

def train_and_save():
    X, y = generate_synthetic_data()
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    os.makedirs('backend/models', exist_ok=True)
    joblib.dump(model, 'backend/models/persona_rf.pkl')
    print("Model trained and saved to backend/models/persona_rf.pkl")

if __name__ == "__main__":
    train_and_save()
