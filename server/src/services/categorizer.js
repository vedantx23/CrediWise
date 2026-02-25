/**
 * Rule-based auto-categorizer
 * Maps keywords in expense notes/descriptions to standard categories
 */

const CATEGORY_RULES = [
  {
    category: 'Food & Dining',
    keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'mcdonalds',
      'kfc', 'subway', 'food', 'lunch', 'dinner', 'breakfast', 'snack', 'meal', 'eat',
      'dominos', 'starbucks', 'hotel restaurant', 'dhaba', 'biryani', 'sushi', 'thai', 'chinese']
  },
  {
    category: 'Travel',
    keywords: ['uber', 'ola', 'rapido', 'irctc', 'flight', 'airline', 'airport', 'hotel',
      'booking.com', 'airbnb', 'makemytrip', 'goibibo', 'train', 'bus', 'travel', 'trip',
      'taxi', 'cab', 'metro', 'auto', 'petrol', 'diesel', 'fuel', 'toll', 'parking']
  },
  {
    category: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'nykaa', 'snapdeal', 'bigbasket',
      'blinkit', 'zepto', 'dunzo', 'grocery', 'clothes', 'shoes', 'electronics', 'gadget',
      'shopping', 'mall', 'store', 'purchase', 'order', 'delivery', 'instamart']
  },
  {
    category: 'Entertainment',
    keywords: ['netflix', 'spotify', 'amazon prime', 'hotstar', 'disney', 'youtube', 'gaming',
      'game', 'steam', 'playstation', 'xbox', 'movie', 'cinema', 'pvr', 'inox', 'concert',
      'event', 'ticket', 'subscription', 'music', 'bookmyshow']
  },
  {
    category: 'Health & Medical',
    keywords: ['hospital', 'doctor', 'clinic', 'pharmacy', 'medicine', 'health', 'medical',
      'gym', 'fitness', 'yoga', 'pharmeasy', 'netmeds', '1mg', 'apollo', 'lab test',
      'diagnostic', 'insurance', 'dental', 'eye', 'vision', 'physiotherapy']
  },
  {
    category: 'Utilities & Bills',
    keywords: ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'mobile recharge',
      'phone bill', 'jio', 'airtel', 'vi', 'bsnl', 'bill', 'utility', 'rent', 'emi',
      'loan', 'insurance premium', 'property tax', 'municipality']
  },
  {
    category: 'Education',
    keywords: ['udemy', 'coursera', 'unacademy', 'byju', 'course', 'tuition', 'school', 'college',
      'university', 'fee', 'book', 'stationery', 'study', 'education', 'exam', 'certification']
  }
];

function categorize(text) {
  if (!text) return 'Other';
  const lowerText = text.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword)) {
        return rule.category;
      }
    }
  }

  return 'Other';
}

module.exports = { categorize };
