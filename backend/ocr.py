import pytesseract
from PIL import Image
import re

def parse_offer_image(image_path):
    try:
        # Note: In Windows, Tesseract needs to be installed and in PATH.
        # If not, pytesseract.pytesseract.tesseract_cmd must be set.
        text = pytesseract.image_to_string(Image.open(image_path))
    except Exception as e:
        print(f"OCR Error: {e}")
        # Return mock data for demonstration if tesseract is not installed
        text = "Get 5% cashback on all dining and Zomato orders with your new HDFC card!"

    # Extract reward rate
    rate_match = re.search(r'(\d+(?:\.\d+)?)%', text)
    rate = float(rate_match.group(1)) if rate_match else None
    
    # Extract keywords to guess category
    category = "other"
    text_lower = text.lower()
    if any(k in text_lower for k in ['dining', 'restaurant', 'food', 'zomato', 'swiggy']):
        category = "dining"
    elif any(k in text_lower for k in ['travel', 'flight', 'hotel', 'makemytrip', 'cleartrip', 'lounge']):
        category = "travel"
    elif any(k in text_lower for k in ['grocery', 'supermarket', 'bigbasket', 'blinkit']):
        category = "grocery"
    elif any(k in text_lower for k in ['fuel', 'petrol', 'diesel', 'hpcl', 'iocl']):
        category = "fuel"
        
    return {
        "text_extracted": text.strip(),
        "parsed_rate": rate,
        "category": category
    }
