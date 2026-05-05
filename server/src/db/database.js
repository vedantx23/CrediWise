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
    const { CARD_DIRECTORY } = require('../data/cardDirectory');

    try {
        const count = await Card.countDocuments();
        if (count > 0) {
            console.log('✅ Card directory already seeded');
            return;
        }

        // Drop stale index if it exists to avoid duplicate key errors
        try {
            await Card.collection.dropIndex('name_1');
        } catch (idxErr) {
            // Index might not exist, ignore
        }

        const cards = CARD_DIRECTORY.map(c => ({
            name: c.name,
            bank: c.bank,
            network: c.network,
            min_income_lpa: c.min_income_lpa,
            annual_fee_inr: c.annual_fee_inr,
            base_reward_rate: c.base_reward_rate,
            reward_type: c.reward_type,
            point_value_inr: c.point_value_inr,
            lounge_access: c.lounge_access,
            international_usage: c.international_usage,
            fee_waiver_spend: c.fee_waiver_spend,
            accelerated_rewards: c.accelerated_rewards,
            exclusions: c.exclusions,
            monthly_caps: c.monthly_caps,
            milestone_tiers: c.milestone_tiers,
            upi_benefits: c.upi_benefits,
            best_for: c.best_for,
            third_party_tieups: c.third_party_tieups
        }));

        console.log('🌱 Refreshing card directory...');
        await Card.insertMany(cards);
        console.log(`✅ Card directory seeded with ${cards.length} cards`);
    } catch (err) {
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
