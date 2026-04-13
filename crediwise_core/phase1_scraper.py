import requests
from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import time
import re
import logging

# Configure robust logging for production readiness
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Phase1_Scraper")

class CreditCardScraper:
    """
    A robust web scraping pipeline designed to extract credit card configurations
    (reward rates, multipliers, milestone bonuses) from public financial sites.
    """
    def __init__(self, target_urls: list):
        self.target_urls = target_urls
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
        self.raw_data = []
        
    def fetch_page(self, url: str) -> str:
        """Fetches the HTML content of the target URL with retry logic."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Fetching URL (Attempt {attempt+1}): {url}")
                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()
                return response.text
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed: {e}")
                time.sleep(2 ** attempt) # Exponential backoff
        logger.error(f"Failed to fetch {url} after {max_retries} attempts.")
        return ""

    def parse_card_data(self, html_content: str, source_url: str):
        """
        Parses DOM elements to extract card details using BeautifulSoup.
        (Note: the specific CSS selectors below are illustrative placeholders
         and would be adapted to the actual target site structure in production).
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Example: assuming cards are contained in semantic <article> or <div class="card-listing">
        card_elements = soup.find_all('div', class_=re.compile(r'card-listing|credit-card-item'))
        
        for element in card_elements:
            try:
                # 1. Card Identity
                name_elem = element.find(['h2', 'h3'])
                card_name = name_elem.text.strip() if name_elem else "Unknown Card"
                
                # 2. Base Rates & Fees
                # (Pattern matching for dynamic text extraction)
                fees_elem = element.find(text=re.compile(r'(?i)annual fee'))
                annual_fee = fees_elem.parent.text if fees_elem else "0"
                
                # 3. Features & Multipliers
                features = [li.text.strip() for li in element.find_all('li')]
                
                self.raw_data.append({
                    'card_name': card_name,
                    'annual_fee_raw': annual_fee,
                    'raw_features': " | ".join(features),
                    'source_url': source_url
                })
            except Exception as e:
                logger.error(f"Error parsing card element: {e}")

    def run_pipeline(self) -> pd.DataFrame:
        """Executes the scraping pipeline across all target URLs."""
        for url in self.target_urls:
            html = self.fetch_page(url)
            if html:
                self.parse_card_data(html, url)
            time.sleep(1.5) # Anti-ban rate limiting
            
        return pd.DataFrame(self.raw_data)


class DataPreprocessor:
    """
    Pandas-based preprocessing pipeline to clean, normalize, 
    and extract structured numerical features from raw scraped text.
    """
    
    @staticmethod
    def extract_fee(fee_string: str) -> float:
        """Extract numerical fee values handling strings like '₹1,500' or 'Lifetime Free'."""
        if pd.isna(fee_string) or 'free' in str(fee_string).lower() or 'nil' in str(fee_string).lower():
            return 0.0
        
        # Extract digits
        digits = re.findall(r'\d+', str(fee_string).replace(',', ''))
        if digits:
            return float(digits[0])
        return 0.0

    @staticmethod
    def parse_multipliers(features: str) -> dict:
        """NLP pattern matching to extract base reward rates and categorical multipliers."""
        features_lower = str(features).lower()
        
        # Defaults
        metrics = {
            'base_reward_rate': 0.01, # 1% default
            'dining_multiplier': 1.0,
            'travel_multiplier': 1.0,
            'shopping_multiplier': 1.0,
            'has_milestone': 0
        }
        
        # Extract specific multipliers (e.g., "5x points on dining", "10% cashback on travel")
        if re.search(r'dining|restaurant|food', features_lower):
            match = re.search(r'(\d+)[x%]', features_lower)
            if match: metrics['dining_multiplier'] = float(match.group(1))
            else: metrics['dining_multiplier'] = 2.0
            
        if re.search(r'travel|flight|hotel|lounge', features_lower):
            match = re.search(r'(\d+)[x%]', features_lower)
            if match: metrics['travel_multiplier'] = float(match.group(1))
            else: metrics['travel_multiplier'] = 2.0
            
        if re.search(r'milestone|spend \d+ \w+ get', features_lower):
            metrics['has_milestone'] = 1
            
        return metrics

    def clean_and_normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        """Applies normalization functions across the entire dataframe."""
        if df.empty:
            logger.warning("Empty dataframe provided to preprocessor.")
            return df
            
        logger.info(f"Preprocessing {len(df)} scraped records...")
        
        # 1. Clean Fees
        df['annual_fee_inr'] = df['annual_fee_raw'].apply(self.extract_fee)
        
        # 2. Extract Reward Nuances
        extracted_df = df['raw_features'].apply(self.parse_multipliers).apply(pd.Series)
        
        # 3. Concatenate and clean
        final_df = pd.concat([df, extracted_df], axis=1)
        
        # Drop raw text columns to keep it analytical
        cols_to_drop = ['annual_fee_raw', 'raw_features']
        final_df = final_df.drop(columns=[c for c in cols_to_drop if c in final_df.columns])
        
        final_df = final_df.drop_duplicates(subset=['card_name'])
        
        logger.info("Preprocessing complete.")
        return final_df

if __name__ == "__main__":
    # Example test runner for Phase 1
    sample_urls = [
        "https://example.com/credit-cards/travel",
        "https://example.com/credit-cards/cashback"
    ]
    
    scraper = CreditCardScraper(sample_urls)
    raw_df = scraper.run_pipeline()
    
    if not raw_df.empty:
        preprocessor = DataPreprocessor()
        clean_df = preprocessor.clean_and_normalize(raw_df)
        print("Pipeline Summary:")
        print(clean_df.head())
        clean_df.to_csv("processed_card_data.csv", index=False)
    else:
        print("No data extracted during the test run.")
