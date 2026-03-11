const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crediwise';

async function connectDb() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');
        await seedCardDirectory();
        await seedDemoAccount();
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        throw err;
    }
}

async function seedCardDirectory() {
    const Card = require('../models/Card');
    
    try {
        // Check if cards already exist to avoid re-seeding and wiping user state
        const count = await Card.countDocuments();
        if (count > 0) {
            console.log('✅ Card directory already seeded');
            return;
        }

        // Drop stale index if it exists to avoid duplicate key errors
        try {
            await Card.collection.dropIndex('Card_Name_1');
        } catch (idxErr) {
            // Index might not exist, ignore
        }

        const rawData = [
            ["HDFC Regalia Gold Credit Card","HDFC",18,2500,"4 points per ₹150","Reward Points",0.50,"Domestic + International","Yes","Bonus points on yearly spend","Fee waived on ₹4L annual spend","SmartBuy; Vistara; MakeMyTrip; Myntra"],
            ["HDFC Infinia Credit Card","HDFC",40,12500,"5 points per ₹150","Reward Points",1.00,"Unlimited Domestic + International","Yes","High spend milestone vouchers","Fee waived on ₹10L annual spend","Marriott Bonvoy; SmartBuy; Tata Cliq"],
            ["HDFC Diners Club Black Credit Card","HDFC",21,10000,"5 points per ₹150","Reward Points",0.80,"Unlimited Domestic + International","Yes","Bonus reward points at milestones","Fee waived on ₹5L annual spend","SmartBuy; Marriott; Airline Partners"],
            ["HDFC Millennia Credit Card","HDFC",6,1000,"5% on select partners","Cashback",1.00,"Limited Domestic","Yes","Quarterly cashback milestones","Fee waived on ₹1L annual spend","Amazon; Flipkart; Paytm"],
            ["Axis Magnus Credit Card","Axis",24,12500,"12 points per ₹200","Reward Points",0.80,"Unlimited Domestic + International","Yes","Travel vouchers on milestones","Fee waived on ₹25L annual spend","Airline Partners; Hotel Partners"],
            ["Axis Atlas Credit Card","Axis",12,5000,"2–5 miles per ₹100","Air Miles",1.00,"Domestic + International","Yes","Bonus EDGE miles","Fee waived on ₹7.5L annual spend","Marriott Bonvoy; Accor; Airline Programs"],
            ["Axis Select Credit Card","Axis",10,3000,"10 points per ₹200","Reward Points",0.40,"Domestic + International","Yes","Dining vouchers","Fee waived on ₹3L annual spend","Swiggy; Zomato; BigBasket"],
            ["Flipkart Axis Bank Credit Card","Axis",3,500,"5% Flipkart","Cashback",1.00,"Domestic + International","No","Occasional cashback offers","Fee waived on ₹2L annual spend","Flipkart; Myntra"],
            ["SBI Cashback Credit Card","SBI",3,999,"5% online spending","Cashback",1.00,"No lounge","Yes","Extra cashback campaigns","Fee waived on ₹2L annual spend","Amazon; Myntra; Online Merchants"],
            ["SBI Card Prime","SBI",8,2999,"2 points per ₹100","Reward Points",0.25,"Domestic + International","Yes","Welcome vouchers","Fee waived on ₹3L annual spend","Club Vistara; Yatra; Trident Hotels"],
            ["SBI Card Elite","SBI",15,4999,"2 points per ₹100","Reward Points",0.25,"Domestic + International","Yes","Luxury brand vouchers","Fee waived on ₹10L annual spend","Taj Hotels; BookMyShow"],
            ["Flipkart SBI Credit Card","SBI",3,500,"5% Flipkart","Cashback",1.00,"No lounge","Yes","Occasional cashback offers","Fee waived on ₹1L annual spend","Flipkart"],
            ["Amazon Pay ICICI Credit Card","ICICI",3,0,"5% Amazon Prime","Cashback",1.00,"No lounge","Yes","Amazon sale cashback","No fee (lifetime free)","Amazon"],
            ["ICICI Coral Credit Card","ICICI",4,500,"2 points per ₹100","Reward Points",0.25,"Domestic","Yes","Movie ticket offers","Fee waived on ₹1.5L annual spend","BookMyShow; Dining Partners"],
            ["ICICI Rubyx Credit Card","ICICI",10,3000,"2 points per ₹100","Reward Points",0.25,"Domestic + International","Yes","Milestone reward points","Fee waived on ₹3L annual spend","BookMyShow; Airlines"],
            ["ICICI Sapphiro Credit Card","ICICI",15,6500,"2 points per ₹100","Reward Points",0.25,"Domestic + International","Yes","Travel vouchers","Fee waived on ₹6L annual spend","EaseMyTrip; Tata Cliq"]
        ];

        const cards = rawData.map(c => ({
            name: c[0],
            bank: c[1],
            min_income_lpa: c[2],
            annual_fee_inr: c[3],
            reward_rate: c[4],
            reward_type: c[5],
            reward_value_per_point_inr: c[6],
            lounge_access: c[7],
            international_usage: c[8],
            milestone_reward: c[9],
            spend_based_fee_waiver: c[10],
            third_party_tieups: c[11].split(';').map(s => s.trim())
        }));

        console.log('🌱 Refreshing card directory...');
        await Card.insertMany(cards);
        console.log(`✅ Card directory seeded with ${cards.length} cards`);
    } catch (err) {
        // Concise error logging as requested
        console.error(`❌ Error seeding card directory: ${err.message}`);
    }
}

async function seedDemoAccount() {
    const User = require('../models/User');
    const UserCredential = require('../models/UserCredential');
    const UserRepository = require('../repositories/UserRepository');

    const demoEmail = 'demo@crediwise.com';
    const demoPassword = 'password123';

    try {
        const existing = await User.findOne({ email: demoEmail });
        if (!existing) {
            console.log('🌱 Seeding demo account...');
            const salt = bcrypt.genSaltSync(12);
            const password_hash = bcrypt.hashSync(demoPassword, salt);
            
            await UserRepository.create({
                name: 'Demo User',
                email: demoEmail,
                password_hash,
                role: 'user'
            });
            console.log('✅ Demo account created: demo@crediwise.com / password123');
        }
    } catch (err) {
        console.error('❌ Error seeding demo account:', err);
    }
}

// Keeping getDb for compatibility during migration if needed, 
// though repositories will use models directly.
function getDb() {
    return mongoose.connection;
}

module.exports = { connectDb, getDb };
