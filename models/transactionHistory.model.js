const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'transfer', 'recieved'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    recipient: {
        type: String, 
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);