import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger("Phase2_DecisionEngine")

class RewardCalculator:
    """Calculates granular rewards based on transaction categorical data and card multipliers."""
    
    @staticmethod
    def calculate_transaction_reward(amount: float, category: str, card_config: pd.Series) -> float:
        """
        Calculates the exact reward yield for a single transaction.
        card_config must contain 'base_reward_rate' and specific multipliers.
        """
        # Feature fallback to handle missing config columns gracefully
        base_rate = card_config.get('base_reward_rate', 0.01)
        
        category_mapping = {
            'dining': card_config.get('dining_multiplier', 1.0),
            'travel': card_config.get('travel_multiplier', 1.0),
            'shopping': card_config.get('shopping_multiplier', 1.0)
        }
        
        # Apply category multiplier if available, else 1.0
        multiplier = category_mapping.get(category.lower(), 1.0)
        
        # Total effective reward rate for this transaction
        effective_rate = base_rate * multiplier
        
        return amount * effective_rate

class MilestoneEngine:
    """Evaluates whether user spending hits card milestone thresholds to unlock bonuses."""
    
    @staticmethod
    def calculate_milestone_bonus(annual_spend: float, card_config: pd.Series) -> float:
        """
        Checks if the annual spend exceeds the milestone target.
        If yes, returns the monetary value of the milestone bonus.
        """
        if card_config.get('has_milestone', 0) == 1:
            # Assume a structured dataset where these exist, providing safe defaults
            target = card_config.get('milestone_target', float('inf')) 
            bonus_value = card_config.get('milestone_bonus_value', 0.0)
            
            if annual_spend >= target:
                return bonus_value
        return 0.0

class RedemptionOptimizer:
    """Converts abstract reward points into standard fiat currency equivalent (INR/USD)."""
    
    @staticmethod
    def get_fiat_value(raw_rewards: float, card_config: pd.Series) -> float:
        """
        Converts reward points to monetary value.
        Assumes raw_rewards is already equivalent to cash back for simplicity, 
        or multiplies by a conversion ratio if the card uses a point system.
        """
        point_value = card_config.get('point_to_fiat_ratio', 1.0)
        return raw_rewards * point_value


class DecisionEngine:
    """
    The orchestrator that scores all available cards against a user's specific 
    transaction portfolio and returns ranked recommendations.
    """
    
    def __init__(self, card_database: pd.DataFrame):
        self.card_db = card_database
        self.reward_calc = RewardCalculator()
        self.milestone_engine = MilestoneEngine()
        self.redemption_opt = RedemptionOptimizer()
        
    def _simulate_annual_rewards(self, card_row: pd.Series, transactions: List[Dict]) -> Tuple[float, str]:
        """Runs a full simulation of user transactions through a single card's reward structure."""
        
        total_spend = sum(t['amount'] for t in transactions)
        total_base_rewards = 0.0
        
        # 1. Process each transaction
        for tx in transactions:
            reward = self.reward_calc.calculate_transaction_reward(
                amount=tx['amount'],
                category=tx['category'],
                card_config=card_row
            )
            total_base_rewards += reward
            
        # 2. Check Milestones
        milestone_bonus = self.milestone_engine.calculate_milestone_bonus(total_spend, card_row)
        
        # 3. Convert to Fiat
        fiat_base = self.redemption_opt.get_fiat_value(total_base_rewards, card_row)
        
        # 4. Calculate Net Value (Rewards + Bonus - Annual Fee)
        annual_fee = card_row.get('annual_fee_inr', 0.0)
        net_fiat_value = (fiat_base + milestone_bonus) - annual_fee
        
        # 5. Generate Explanation
        explanation = (
            f"Generated ₹{fiat_base:.2f} in category rewards "
            f"({len(transactions)} transactions). "
        )
        if milestone_bonus > 0:
            explanation += f"Unlocked milestone bonus of ₹{milestone_bonus:.2f}! "
        if annual_fee > 0:
            explanation += f"Deducted ₹{annual_fee:.2f} annual fee. "
            
        explanation += f"Total Net Value: ₹{net_fiat_value:.2f}"
            
        return net_fiat_value, explanation

    def get_best_card(self, transactions: List[Dict], top_n: int = 3) -> List[Dict]:
        """
        Main entry point. Scores all cards in the database against the user's spending.
        """
        if self.card_db.empty:
            logger.warning("Empty card database. Cannot run Decision Engine.")
            return []
            
        results = []
        for index, card in self.card_db.iterrows():
            net_value, explanation = self._simulate_annual_rewards(card, transactions)
            
            results.append({
                'card_name': card.get('card_name', f"Card_{index}"),
                'net_fiat_value': net_value,
                'explanation': explanation
            })
            
        # Sort by best net fiat value descending
        ranked_results = sorted(results, key=lambda x: x['net_fiat_value'], reverse=True)
        return ranked_results[:top_n]


if __name__ == "__main__":
    # Internal Unit Test
    logger.setLevel(logging.DEBUG)
    
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
    
    mock_transactions = [
        {'amount': 50000, 'category': 'travel'},
        {'amount': 20000, 'category': 'dining'},
        {'amount': 40000, 'category': 'shopping'} 
        # Total spend: 110,000 (Hits milestone for Travel Plus)
    ]
    
    engine = DecisionEngine(mock_db)
    recommendations = engine.get_best_card(mock_transactions)
    
    print("\nDecision Engine Results:")
    for rank, rec in enumerate(recommendations, 1):
        print(f"#{rank} {rec['card_name']} (Net Value: ₹{rec['net_fiat_value']:.2f})")
        print(f"    Rationale: {rec['explanation']}")
