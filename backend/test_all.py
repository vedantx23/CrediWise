import os
import sys

sys.path.append(os.path.dirname(__file__))
from app import app
import json

def test_everything():
    client = app.test_client()
    
    print("1. Testing /api/audit")
    payload = {
        "monthly_spend": {
            "travel": 50000,
            "dining": 10000
        },
        "current_cards": ["hdfc_millennia"]
    }
    resp = client.post('/api/audit', json=payload)
    print(resp.get_json()['message'])
    
    print("\n2. Testing /api/persona")
    resp = client.post('/api/persona', json={"monthly_spend": {"travel": 50000, "international": 20000}})
    print(resp.get_json()['data']['persona_name'])
    
    print("\n3. Testing /api/simulate (salary_hike)")
    resp = client.post('/api/simulate', json={
        "life_event": "salary_hike",
        "user_profile": {"income_annual": 800000},
        "new_income": 4000000
    })
    print(resp.get_json()['data']['message'])
    
    print("\n4. Testing /api/simulate (emi_purchase)")
    resp = client.post('/api/simulate', json={
        "life_event": "emi_purchase",
        "user_profile": {},
        "purchase_amount": 100000
    })
    print(resp.get_json()['data']['message'])
    
    print("\n5. Testing /api/submit-combo")
    resp = client.post('/api/submit-combo', json={
        "combo_id": "test_combo_1",
        "cards": ["Axis Ace", "HDFC Regalia"],
        "city": "Mumbai",
        "persona": "The Reward Arbitrageur",
        "nav_score": 15000
    })
    print(resp.get_json()['data']['message'])
    
    print("\n6. Testing /api/leaderboard")
    resp = client.get('/api/leaderboard?city=Mumbai&persona=The Reward Arbitrageur')
    print(resp.get_json()['data']['leaderboard'][0]['message'])
    
    print("\nAll endpoints tested successfully!")

if __name__ == "__main__":
    test_everything()
