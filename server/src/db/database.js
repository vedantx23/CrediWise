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
    const cards = [
        {
            name: 'HDFC Bank Regalia Gold',
            bank: 'HDFC Bank',
            type: 'credit',
            network: 'Visa/Mastercard',
            base_reward_rate: 1.33,
            redemption_value: 0.5,
            category_multipliers: { 'Travel': 5, 'Dining': 5 },
            benefits: ['Lounge Access', 'Priority Pass', 'Insurance Cover']
        },
        {
            name: 'Amazon Pay ICICI Bank Credit Card',
            bank: 'ICICI Bank',
            type: 'credit',
            network: 'Visa',
            base_reward_rate: 1.0,
            redemption_value: 1.0,
            category_multipliers: { 'Shopping': 5, 'Utilities': 2 },
            benefits: ['Unlimited 5% back on Amazon for Prime members', 'No Joining Fee']
        },
        {
            name: 'SBI Card ELITE',
            bank: 'SBI Card',
            type: 'credit',
            network: 'Visa/Mastercard',
            base_reward_rate: 0.5,
            redemption_value: 0.25,
            category_multipliers: { 'Dining': 5, 'Departmental Stores': 5, 'Grocery': 5 },
            benefits: ['Movie Tickets', 'Lounge Access', 'Milestone Rewards']
        },
        {
            name: 'Axis Bank Ace Credit Card',
            bank: 'Axis Bank',
            type: 'credit',
            network: 'Visa',
            base_reward_rate: 2.0,
            redemption_value: 1.0,
            category_multipliers: { 'Utilities': 5, 'Food Delivery': 4 },
            benefits: ['Flat 2% Cashback', 'Lounge Access']
        },
        {
            name: 'ICICI Bank Coral Contactless Card',
            bank: 'ICICI Bank',
            type: 'credit',
            network: 'Visa/Mastercard',
            base_reward_rate: 0.5,
            redemption_value: 0.25,
            category_multipliers: { 'Dining': 2 },
            benefits: ['Movie Discounts', 'Lounge Access']
        }
    ];

    try {
        const count = await Card.countDocuments();
        if (count === 0) {
            console.log('🌱 Seeding card directory...');
            await Card.insertMany(cards);
            console.log('✅ Card directory seeded with 5 cards');
        }
    } catch (err) {
        console.error('❌ Error seeding card directory:', err);
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
