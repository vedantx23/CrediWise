import pytest
import json
import os
import sys

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_audit_endpoint_missing_fields(client):
    rv = client.post('/api/audit', json={})
    assert rv.status_code == 400
    json_data = rv.get_json()
    assert json_data['success'] is False

def test_audit_endpoint_calculation(client):
    payload = {
        "monthly_spend": {
            "dining": 10000,
            "online": 20000,
            "travel": 5000,
            "other": 5000
        },
        "current_cards": ["sbi_simplyclick"]
    }
    
    rv = client.post('/api/audit', json=payload)
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert json_data['success'] is True
    
    data = json_data['data']
    assert 'leakage_inr' in data
    assert 'status' in data
    assert 'recommendations' in data
    
    # We can print or check specific math here.
    # For instance, SBI SimplyCLICK has 1.25% for online and 0.25% for other.
    # Current NAV: (20000*0.0125 + 5000*0.0025 + 10000*0.0025 + 5000*0.0025) * 12
    # = (250 + 12.5 + 25 + 12.5) * 12 = 300 * 12 = 3600
    
    # Asserting that recommendation uses SHAP values
    if len(data['recommendations']) > 0:
        rec = data['recommendations'][0]
        assert 'shap_values' in rec
        assert 'card_id' in rec

