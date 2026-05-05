/**
 * Comprehensive Indian Credit Card Directory
 * Includes: accelerated rewards, portal deals, category exclusions,
 * monthly caps, UPI benefits, milestone tiers, and merchant-specific rules.
 */

const CARD_DIRECTORY = [
  // ─── HDFC ──────────────────────────────────────────────
  {
    name: "HDFC Regalia Gold Credit Card",
    bank: "HDFC",
    network: "Visa",
    min_income_lpa: 18,
    annual_fee_inr: 2500,
    base_reward_rate: 0.67, // 4 RP per ₹150 = ~0.67%
    reward_type: "Reward Points",
    point_value_inr: 0.50,
    lounge_access: "Domestic + International (8/year)",
    international_usage: "Yes",
    fee_waiver_spend: 400000,
    accelerated_rewards: [
      { channel: "SmartBuy", rate_percent: 3.3, description: "10X points via HDFC SmartBuy portal" },
      { channel: "Dining", rate_percent: 1.33, description: "2X on dining (online & offline)" }
    ],
    exclusions: ["Fuel", "Rent", "Government", "Wallet loads", "Insurance"],
    monthly_caps: [
      { category: "Utilities", cap_points: 2000, description: "Max 2000 RP on utilities/month" }
    ],
    milestone_tiers: [
      { spend: 400000, reward: "Fee waiver" }
    ],
    upi_benefits: null,
    best_for: ["SmartBuy shopping", "Travel bookings", "Premium dining"],
    third_party_tieups: ["SmartBuy", "Vistara", "MakeMyTrip", "Myntra"]
  },
  {
    name: "HDFC Infinia Credit Card",
    bank: "HDFC",
    network: "Visa Infinite",
    min_income_lpa: 40,
    annual_fee_inr: 12500,
    base_reward_rate: 3.3, // 5 RP per ₹150 at ₹1/point via SmartBuy
    reward_type: "Reward Points",
    point_value_inr: 1.00,
    lounge_access: "Unlimited Domestic + International",
    international_usage: "Yes",
    fee_waiver_spend: 1000000,
    accelerated_rewards: [
      { channel: "SmartBuy", rate_percent: 6.6, description: "10X on SmartBuy (33 RP per ₹150)" },
      { channel: "All spends", rate_percent: 3.3, description: "5 RP per ₹150, each point = ₹1" }
    ],
    exclusions: ["Fuel surcharge waiver capped at ₹400/month"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 800000, reward: "₹5,000 travel voucher" },
      { spend: 1000000, reward: "Fee waiver + bonus points" }
    ],
    upi_benefits: null,
    best_for: ["All premium spends", "Travel via SmartBuy", "International"],
    third_party_tieups: ["Marriott Bonvoy", "SmartBuy", "Tata CLiQ"]
  },
  {
    name: "HDFC Diners Club Black Credit Card",
    bank: "HDFC",
    network: "Diners Club",
    min_income_lpa: 21,
    annual_fee_inr: 10000,
    base_reward_rate: 3.3,
    reward_type: "Reward Points",
    point_value_inr: 0.80,
    lounge_access: "Unlimited Domestic + International",
    international_usage: "Yes",
    fee_waiver_spend: 500000,
    accelerated_rewards: [
      { channel: "SmartBuy", rate_percent: 6.6, description: "10X via SmartBuy" },
      { channel: "Dining/Travel/Shopping", rate_percent: 3.3, description: "5 RP per ₹150 on weekends" }
    ],
    exclusions: ["Fuel", "EMI", "Wallet loads"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 200000, reward: "2500 bonus points" },
      { spend: 500000, reward: "5000 bonus points + fee waiver" },
      { spend: 800000, reward: "Air ticket or hotel stay voucher" }
    ],
    upi_benefits: null,
    best_for: ["SmartBuy power users", "Milestone chasers", "Lounge addicts"],
    third_party_tieups: ["SmartBuy", "Marriott", "Airline Partners"]
  },
  {
    name: "HDFC Millennia Credit Card",
    bank: "HDFC",
    network: "Visa/Mastercard",
    min_income_lpa: 6,
    annual_fee_inr: 1000,
    base_reward_rate: 1.0,
    reward_type: "Cashback",
    point_value_inr: 1.00,
    lounge_access: "Limited Domestic (4/year)",
    international_usage: "Yes",
    fee_waiver_spend: 100000,
    accelerated_rewards: [
      { channel: "Amazon/Flipkart/Myntra", rate_percent: 5.0, description: "5% cashback on select partners" },
      { channel: "Online spends", rate_percent: 2.5, description: "2.5% on all other online transactions" },
      { channel: "Offline", rate_percent: 1.0, description: "1% on POS/offline spends" }
    ],
    exclusions: ["Fuel", "Rent", "Wallet loads", "Government"],
    monthly_caps: [
      { category: "Online Cashback", cap_amount: 750, description: "Max ₹750 cashback/month on online spends" }
    ],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Online shopping", "Entry-level card", "Amazon/Flipkart buyers"],
    third_party_tieups: ["Amazon", "Flipkart", "Paytm"]
  },

  // ─── AXIS ──────────────────────────────────────────────
  {
    name: "Axis Magnus Credit Card",
    bank: "Axis",
    network: "Visa Infinite",
    min_income_lpa: 24,
    annual_fee_inr: 12500,
    base_reward_rate: 1.2, // 12 EP per ₹200
    reward_type: "EDGE Points",
    point_value_inr: 0.80,
    lounge_access: "Unlimited Domestic + International",
    international_usage: "Yes",
    fee_waiver_spend: 2500000,
    accelerated_rewards: [
      { channel: "Grab Deals", rate_percent: 4.8, description: "5X via Axis Grab Deals portal" },
      { channel: "Travel (Vistara/Air India)", rate_percent: 2.4, description: "2X on partner airlines" }
    ],
    exclusions: ["Fuel", "Rent payments", "Government/Tax", "Insurance premiums"],
    monthly_caps: [
      { category: "Utilities", cap_points: 5000, description: "5000 EP cap on utility spends" }
    ],
    milestone_tiers: [
      { spend: 1500000, reward: "25,000 bonus EDGE points" },
      { spend: 2500000, reward: "50,000 bonus points + fee waiver" }
    ],
    upi_benefits: null,
    best_for: ["Axis Grab Deals", "High spenders", "Travel redemptions"],
    third_party_tieups: ["Airline Partners", "Hotel Partners", "Grab Deals"]
  },
  {
    name: "Axis Atlas Credit Card",
    bank: "Axis",
    network: "Visa",
    min_income_lpa: 12,
    annual_fee_inr: 5000,
    base_reward_rate: 2.0, // 2 miles per ₹100
    reward_type: "Air Miles (EDGE Miles)",
    point_value_inr: 1.00,
    lounge_access: "Domestic + International (8/year)",
    international_usage: "Yes",
    fee_waiver_spend: 750000,
    accelerated_rewards: [
      { channel: "Travel portals", rate_percent: 5.0, description: "5 miles per ₹100 on travel" },
      { channel: "Grab Deals", rate_percent: 4.0, description: "4X via Grab Deals" },
      { channel: "International", rate_percent: 3.0, description: "3 miles per ₹100 on intl spends" }
    ],
    exclusions: ["Fuel", "Rent", "Government payments"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 100000, reward: "500 bonus miles" },
      { spend: 300000, reward: "2000 bonus miles" },
      { spend: 750000, reward: "7500 bonus miles + fee waiver" }
    ],
    upi_benefits: null,
    best_for: ["Frequent flyers", "Travel spenders", "Mile collectors"],
    third_party_tieups: ["Marriott Bonvoy", "Accor", "Airline Programs"]
  },
  {
    name: "Axis Select Credit Card",
    bank: "Axis",
    network: "Visa",
    min_income_lpa: 10,
    annual_fee_inr: 3000,
    base_reward_rate: 0.5, // 10 EP per ₹200 = ~0.4-0.5%
    reward_type: "EDGE Points",
    point_value_inr: 0.40,
    lounge_access: "Domestic + International (4/year)",
    international_usage: "Yes",
    fee_waiver_spend: 300000,
    accelerated_rewards: [
      { channel: "Dining (Swiggy/Zomato)", rate_percent: 2.0, description: "5X on food delivery" },
      { channel: "Grab Deals", rate_percent: 2.0, description: "Bonus points on Grab Deals" }
    ],
    exclusions: ["Fuel", "Rent", "Insurance"],
    monthly_caps: [
      { category: "Dining", cap_points: 1000, description: "Max 1000 EP on dining/month" }
    ],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Dining", "Foodies", "Swiggy/Zomato regulars"],
    third_party_tieups: ["Swiggy", "Zomato", "BigBasket"]
  },
  {
    name: "Flipkart Axis Bank Credit Card",
    bank: "Axis",
    network: "Visa",
    min_income_lpa: 3,
    annual_fee_inr: 500,
    base_reward_rate: 1.5,
    reward_type: "Cashback",
    point_value_inr: 1.00,
    lounge_access: "Domestic + International (4/year)",
    international_usage: "No",
    fee_waiver_spend: 200000,
    accelerated_rewards: [
      { channel: "Flipkart/Myntra", rate_percent: 5.0, description: "5% unlimited cashback on Flipkart & Myntra" },
      { channel: "Preferred partners", rate_percent: 4.0, description: "4% on Swiggy, Uber, PVR" },
      { channel: "Online", rate_percent: 1.5, description: "1.5% on all other online" },
      { channel: "Offline", rate_percent: 1.5, description: "1.5% on offline/POS" }
    ],
    exclusions: ["Fuel", "Rent", "Wallet loads"],
    monthly_caps: [],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Flipkart shoppers", "Myntra buyers", "Budget card"],
    third_party_tieups: ["Flipkart", "Myntra"]
  },

  // ─── SBI ──────────────────────────────────────────────
  {
    name: "SBI Cashback Credit Card",
    bank: "SBI",
    network: "Visa",
    min_income_lpa: 3,
    annual_fee_inr: 999,
    base_reward_rate: 5.0,
    reward_type: "Cashback",
    point_value_inr: 1.00,
    lounge_access: "No lounge",
    international_usage: "Yes",
    fee_waiver_spend: 200000,
    accelerated_rewards: [
      { channel: "Online", rate_percent: 5.0, description: "5% cashback on ALL online spends" },
      { channel: "Offline", rate_percent: 1.0, description: "1% on offline/POS" }
    ],
    exclusions: ["Fuel", "Rent", "EMI", "Wallet loads", "Jewellery", "Government"],
    monthly_caps: [
      { category: "Cashback", cap_amount: 5000, description: "Max ₹5000 cashback/month" }
    ],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Online shopping addicts", "Best flat-rate online card", "Budget-friendly"],
    third_party_tieups: ["Amazon", "Myntra", "Online Merchants"]
  },
  {
    name: "SBI Card Prime",
    bank: "SBI",
    network: "Visa/Mastercard",
    min_income_lpa: 8,
    annual_fee_inr: 2999,
    base_reward_rate: 0.5, // 2 RP per ₹100, each ~ ₹0.25
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic + International (4/quarter)",
    international_usage: "Yes",
    fee_waiver_spend: 300000,
    accelerated_rewards: [
      { channel: "Dining", rate_percent: 2.5, description: "10X on dining partners" },
      { channel: "Online", rate_percent: 1.0, description: "2X on online transactions" }
    ],
    exclusions: ["Fuel", "Rent", "Government"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 300000, reward: "Fee waiver" }
    ],
    upi_benefits: null,
    best_for: ["Dining enthusiasts", "Airport travellers", "Club Vistara members"],
    third_party_tieups: ["Club Vistara", "Yatra", "Trident Hotels"]
  },
  {
    name: "SBI Card Elite",
    bank: "SBI",
    network: "Visa",
    min_income_lpa: 15,
    annual_fee_inr: 4999,
    base_reward_rate: 0.5,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic + International (6/quarter)",
    international_usage: "Yes",
    fee_waiver_spend: 1000000,
    accelerated_rewards: [
      { channel: "Dining", rate_percent: 2.5, description: "10X on dining" },
      { channel: "Travel/Entertainment", rate_percent: 1.0, description: "5X on movies & travel" }
    ],
    exclusions: ["Fuel", "Rent", "Government"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 1000000, reward: "Fee waiver + luxury vouchers" }
    ],
    upi_benefits: null,
    best_for: ["Luxury spenders", "Movie buffs", "Premium lounges"],
    third_party_tieups: ["Taj Hotels", "BookMyShow"]
  },
  {
    name: "Flipkart SBI Credit Card",
    bank: "SBI",
    network: "Visa",
    min_income_lpa: 3,
    annual_fee_inr: 500,
    base_reward_rate: 1.0,
    reward_type: "Cashback",
    point_value_inr: 1.00,
    lounge_access: "No lounge",
    international_usage: "Yes",
    fee_waiver_spend: 100000,
    accelerated_rewards: [
      { channel: "Flipkart", rate_percent: 5.0, description: "5% unlimited cashback on Flipkart" },
      { channel: "Myntra/Cleartrip", rate_percent: 2.5, description: "2.5% on Myntra" },
      { channel: "Online", rate_percent: 1.0, description: "1% on all other online" }
    ],
    exclusions: ["Fuel", "Rent", "Wallet loads"],
    monthly_caps: [],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Flipkart shoppers", "Entry-level cashback"],
    third_party_tieups: ["Flipkart"]
  },

  // ─── ICICI ──────────────────────────────────────────────
  {
    name: "Amazon Pay ICICI Credit Card",
    bank: "ICICI",
    network: "Visa",
    min_income_lpa: 3,
    annual_fee_inr: 0,
    base_reward_rate: 1.0,
    reward_type: "Cashback (Amazon Pay balance)",
    point_value_inr: 1.00,
    lounge_access: "No lounge",
    international_usage: "Yes",
    fee_waiver_spend: 0,
    accelerated_rewards: [
      { channel: "Amazon (Prime member)", rate_percent: 5.0, description: "5% on Amazon with Prime" },
      { channel: "Amazon (Non-Prime)", rate_percent: 3.0, description: "3% on Amazon without Prime" },
      { channel: "Amazon Pay partners", rate_percent: 2.0, description: "2% on Swiggy, BookMyShow, etc." },
      { channel: "All other spends", rate_percent: 1.0, description: "1% on everything else" }
    ],
    exclusions: ["Fuel surcharge (partial)", "EMI transactions"],
    monthly_caps: [],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Amazon shoppers", "Lifetime free card", "Amazon Prime members"],
    third_party_tieups: ["Amazon"]
  },
  {
    name: "ICICI Coral Credit Card",
    bank: "ICICI",
    network: "Visa/Mastercard",
    min_income_lpa: 4,
    annual_fee_inr: 500,
    base_reward_rate: 0.5,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic (4/year)",
    international_usage: "Yes",
    fee_waiver_spend: 150000,
    accelerated_rewards: [
      { channel: "Dining/Movies", rate_percent: 1.5, description: "2X on dining & BookMyShow" },
      { channel: "Amazon/Flipkart", rate_percent: 1.0, description: "Bonus points on e-commerce" }
    ],
    exclusions: ["Fuel", "Rent", "Government"],
    monthly_caps: [],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Movie lovers", "Entry-level ICICI", "Dining"],
    third_party_tieups: ["BookMyShow", "Dining Partners"]
  },
  {
    name: "ICICI Rubyx Credit Card",
    bank: "ICICI",
    network: "Visa",
    min_income_lpa: 10,
    annual_fee_inr: 3000,
    base_reward_rate: 0.5,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic + International (4/quarter)",
    international_usage: "Yes",
    fee_waiver_spend: 300000,
    accelerated_rewards: [
      { channel: "Shopping", rate_percent: 1.5, description: "2X on shopping" },
      { channel: "Dining", rate_percent: 1.5, description: "2X on dining" }
    ],
    exclusions: ["Fuel", "Rent", "Government", "Insurance"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 300000, reward: "Fee waiver + milestone reward" }
    ],
    upi_benefits: null,
    best_for: ["Mid-premium ICICI", "Shopping & Dining"],
    third_party_tieups: ["BookMyShow", "Airlines"]
  },
  {
    name: "ICICI Sapphiro Credit Card",
    bank: "ICICI",
    network: "Visa",
    min_income_lpa: 15,
    annual_fee_inr: 6500,
    base_reward_rate: 0.5,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic + International (unlimited)",
    international_usage: "Yes",
    fee_waiver_spend: 600000,
    accelerated_rewards: [
      { channel: "Travel", rate_percent: 2.0, description: "4X on travel portals" },
      { channel: "Dining", rate_percent: 1.5, description: "3X on dining" }
    ],
    exclusions: ["Fuel", "Rent", "Government"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 600000, reward: "Fee waiver + travel vouchers" }
    ],
    upi_benefits: null,
    best_for: ["Travel + Dining premium", "Lounge access unlimited"],
    third_party_tieups: ["EaseMyTrip", "Tata CLiQ"]
  },

  // ─── KOTAK ──────────────────────────────────────────────
  {
    name: "Kotak 811 Dream Different",
    bank: "Kotak",
    network: "Visa",
    min_income_lpa: 2,
    annual_fee_inr: 0,
    base_reward_rate: 0.5,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "No lounge",
    international_usage: "Yes",
    fee_waiver_spend: 0,
    accelerated_rewards: [
      { channel: "Online", rate_percent: 1.0, description: "2X on online shopping" },
      { channel: "Offline", rate_percent: 0.5, description: "1X standard on POS" }
    ],
    exclusions: ["Fuel", "Rent", "Wallet loads", "Government"],
    monthly_caps: [
      { category: "Rewards", cap_points: 500, description: "Max 500 RP/month" }
    ],
    milestone_tiers: [],
    upi_benefits: { rate_percent: 0.25, description: "Basic rewards on RuPay UPI" },
    best_for: ["Zero annual fee", "First-time card holders", "Students"],
    third_party_tieups: []
  },
  {
    name: "Kotak League Platinum",
    bank: "Kotak",
    network: "Visa/Mastercard",
    min_income_lpa: 6,
    annual_fee_inr: 1499,
    base_reward_rate: 1.0,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic (4/year)",
    international_usage: "Yes",
    fee_waiver_spend: 200000,
    accelerated_rewards: [
      { channel: "Dining", rate_percent: 2.0, description: "4X on dining" },
      { channel: "Weekend spends", rate_percent: 1.5, description: "3X on weekend transactions" }
    ],
    exclusions: ["Fuel", "Rent", "Government", "Insurance"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 200000, reward: "Fee waiver" }
    ],
    upi_benefits: null,
    best_for: ["Weekend shoppers", "Dining enthusiasts"],
    third_party_tieups: []
  },

  // ─── INDUSIND ──────────────────────────────────────────────
  {
    name: "IndusInd Platinum Credit Card",
    bank: "IndusInd",
    network: "Visa/Mastercard",
    min_income_lpa: 4,
    annual_fee_inr: 599,
    base_reward_rate: 0.7,
    reward_type: "Reward Points",
    point_value_inr: 0.30,
    lounge_access: "Domestic (2/quarter)",
    international_usage: "Yes",
    fee_waiver_spend: 150000,
    accelerated_rewards: [
      { channel: "Weekend dining", rate_percent: 1.4, description: "2X on weekend dining" },
      { channel: "Online shopping", rate_percent: 1.0, description: "Bonus on online" }
    ],
    exclusions: ["Fuel", "Rent", "Government"],
    monthly_caps: [],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Budget card", "Weekend spenders"],
    third_party_tieups: []
  },
  {
    name: "IndusInd Legend Credit Card",
    bank: "IndusInd",
    network: "Visa Infinite",
    min_income_lpa: 20,
    annual_fee_inr: 10000,
    base_reward_rate: 1.5,
    reward_type: "Reward Points",
    point_value_inr: 0.50,
    lounge_access: "Unlimited Domestic + International",
    international_usage: "Yes",
    fee_waiver_spend: 800000,
    accelerated_rewards: [
      { channel: "Golf/Luxury", rate_percent: 3.0, description: "2X on luxury & lifestyle" },
      { channel: "Travel", rate_percent: 2.5, description: "Bonus on travel bookings" },
      { channel: "International", rate_percent: 2.0, description: "Forex markup lower" }
    ],
    exclusions: ["Fuel", "Rent", "Government"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 400000, reward: "Complimentary golf rounds" },
      { spend: 800000, reward: "Fee waiver + luxury vouchers" }
    ],
    upi_benefits: null,
    best_for: ["Luxury lifestyle", "Golf enthusiasts", "High-net-worth"],
    third_party_tieups: []
  },

  // ─── AU ──────────────────────────────────────────────
  {
    name: "AU LIT Credit Card",
    bank: "AU Small Finance",
    network: "RuPay/Visa",
    min_income_lpa: 3,
    annual_fee_inr: 0,
    base_reward_rate: 1.0,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic (4/year on Visa variant)",
    international_usage: "Yes (Visa variant)",
    fee_waiver_spend: 0,
    accelerated_rewards: [
      { channel: "Online", rate_percent: 2.0, description: "2X on online spends" },
      { channel: "Offline", rate_percent: 1.0, description: "Base on POS" }
    ],
    exclusions: ["Fuel (above ₹400)", "Rent"],
    monthly_caps: [
      { category: "Rewards", cap_points: 1000, description: "Max 1000 RP/month on Visa; RuPay no cap" }
    ],
    milestone_tiers: [],
    upi_benefits: { rate_percent: 1.0, description: "RuPay variant earns rewards on UPI (₹100+ txns)" },
    best_for: ["UPI rewards", "Lifetime free", "RuPay UPI benefits"],
    third_party_tieups: []
  },

  // ─── AMEX ──────────────────────────────────────────────
  {
    name: "Amex Gold Card",
    bank: "American Express",
    network: "Amex",
    min_income_lpa: 8,
    annual_fee_inr: 1500,
    base_reward_rate: 1.0, // 1 MR per ₹50
    reward_type: "Membership Rewards",
    point_value_inr: 0.50,
    lounge_access: "Domestic (4/year)",
    international_usage: "Yes",
    fee_waiver_spend: 150000,
    accelerated_rewards: [
      { channel: "Travel (Amex Travel)", rate_percent: 5.0, description: "5X MR on Amex Travel Online" },
      { channel: "Dining (select)", rate_percent: 3.0, description: "3X on select restaurants" },
      { channel: "International", rate_percent: 2.0, description: "Bonus MR on intl spends" }
    ],
    exclusions: ["Fuel", "Insurance", "Government", "Utilities"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 150000, reward: "Fee waiver (renewal year)" },
      { spend: 400000, reward: "10,000 bonus MR points" }
    ],
    upi_benefits: null,
    best_for: ["Amex Travel portal", "Dining", "Milestone rewards"],
    third_party_tieups: ["Taj Hotels", "Amex Travel"]
  },
  {
    name: "Amex Membership Rewards Card",
    bank: "American Express",
    network: "Amex",
    min_income_lpa: 5,
    annual_fee_inr: 1500,
    base_reward_rate: 0.5,
    reward_type: "Membership Rewards",
    point_value_inr: 0.30,
    lounge_access: "No lounge",
    international_usage: "Yes",
    fee_waiver_spend: 150000,
    accelerated_rewards: [
      { channel: "Online shopping", rate_percent: 1.5, description: "Bonus MR on online merchants" },
      { channel: "Amex Offers", rate_percent: 2.5, description: "Statement credits via Amex Offers" }
    ],
    exclusions: ["Fuel", "Insurance", "Government", "Utilities"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 40000, reward: "1000 bonus MR (quarterly)" },
      { spend: 150000, reward: "Fee waiver" }
    ],
    upi_benefits: null,
    best_for: ["Amex Offers", "Entry Amex card", "Quarterly milestone"],
    third_party_tieups: []
  },

  // ─── IDFC ──────────────────────────────────────────────
  {
    name: "IDFC FIRST Classic Credit Card",
    bank: "IDFC FIRST",
    network: "Visa/RuPay",
    min_income_lpa: 3,
    annual_fee_inr: 0,
    base_reward_rate: 0.75,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic (2/quarter)",
    international_usage: "Yes",
    fee_waiver_spend: 0,
    accelerated_rewards: [
      { channel: "All spends (no exclusion)", rate_percent: 0.75, description: "3X RP on all spends including rent & fuel" },
      { channel: "Online/Offline", rate_percent: 0.75, description: "No online/offline differentiation" }
    ],
    exclusions: [], // IDFC FIRST has NO category exclusions — unique!
    monthly_caps: [
      { category: "Rewards", cap_points: 2500, description: "Max 10,000 RP/month on Classic" }
    ],
    milestone_tiers: [],
    upi_benefits: { rate_percent: 0.75, description: "RuPay variant earns RP on UPI spends" },
    best_for: ["Rent payments", "Fuel", "No-exclusion card", "Government payments", "Insurance"],
    third_party_tieups: []
  },

  // ─── ONECARD ──────────────────────────────────────────────
  {
    name: "OneCard Metal Credit Card",
    bank: "OneCard (FPL Technologies)",
    network: "Visa/Mastercard",
    min_income_lpa: 4,
    annual_fee_inr: 0,
    base_reward_rate: 1.0,
    reward_type: "Cashback (5X Reward Points)",
    point_value_inr: 0.25,
    lounge_access: "Domestic (4/quarter)",
    international_usage: "Yes",
    fee_waiver_spend: 0,
    accelerated_rewards: [
      { channel: "Top spend category (auto-detected)", rate_percent: 5.0, description: "5X on your highest spend category" },
      { channel: "All other", rate_percent: 1.0, description: "1% on everything else" }
    ],
    exclusions: ["Fuel", "Rent", "Wallet loads"],
    monthly_caps: [
      { category: "5X Rewards", cap_amount: 1000, description: "5X category capped per cycle" }
    ],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Auto-category detection", "Metal card lovers", "Lifetime free"],
    third_party_tieups: []
  },

  // ─── RBL ──────────────────────────────────────────────
  {
    name: "RBL ShopRite Credit Card",
    bank: "RBL",
    network: "Mastercard",
    min_income_lpa: 3,
    annual_fee_inr: 500,
    base_reward_rate: 1.5,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic (2/quarter)",
    international_usage: "Yes",
    fee_waiver_spend: 200000,
    accelerated_rewards: [
      { channel: "Grocery (BigBasket/JioMart)", rate_percent: 5.0, description: "10X on grocery platforms" },
      { channel: "Departmental stores", rate_percent: 3.0, description: "6X on departmental stores" },
      { channel: "Other", rate_percent: 1.5, description: "3X base on all other" }
    ],
    exclusions: ["Fuel", "Rent", "Government", "Insurance"],
    monthly_caps: [
      { category: "Grocery", cap_points: 5000, description: "Max 5000 RP on grocery/month" }
    ],
    milestone_tiers: [],
    upi_benefits: null,
    best_for: ["Grocery shoppers", "BigBasket", "Departmental stores"],
    third_party_tieups: []
  },

  // ─── YES BANK ──────────────────────────────────────────────
  {
    name: "YES Prosperity Edge Credit Card",
    bank: "YES Bank",
    network: "Visa",
    min_income_lpa: 4,
    annual_fee_inr: 499,
    base_reward_rate: 0.5,
    reward_type: "Reward Points",
    point_value_inr: 0.25,
    lounge_access: "Domestic (2/quarter)",
    international_usage: "Yes",
    fee_waiver_spend: 100000,
    accelerated_rewards: [
      { channel: "Online", rate_percent: 1.0, description: "2X on online transactions" },
      { channel: "Fuel", rate_percent: 0.0, description: "Fuel surcharge waiver (₹1% saved)" }
    ],
    exclusions: ["Rent", "Government", "Wallet loads"],
    monthly_caps: [],
    milestone_tiers: [
      { spend: 100000, reward: "Fee waiver" }
    ],
    upi_benefits: null,
    best_for: ["Fuel surcharge waiver", "Entry-level YES card"],
    third_party_tieups: []
  }
];

module.exports = { CARD_DIRECTORY };

