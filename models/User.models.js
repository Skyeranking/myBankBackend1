const mongoose = require('mongoose');
const GenAccountModel = require('./genAccountNum.model');



const UserSchema = mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    accountNumber: { type: String, },
    balance:{type:Number, default:0},
    isAdmin: { type: Boolean, required: false, default: false },
    dateCreated: { type: Date, default: Date.now() }
});
UserSchema.pre("save", async function (next) {
    try {
       
        if (!this.isNew) return next();

        const accountdigit = await GenAccountModel.find();

        if (!accountdigit || accountdigit.length === 0) {
            return next(new Error('Account number generator is not initialized'));
        }

        const accountData = accountdigit[0];
        const accountNum = Number(accountData.genAccount) + 1;

        this.accountNumber = `MB${accountNum}`;

        await GenAccountModel.findByIdAndUpdate(accountData._id, { genAccount: accountNum });

        next();
    } catch (err) {
        console.error('Account generation error:', err);
        next(err);
    }
});


const UserModel = mongoose.model('User', UserSchema)
module.exports = UserModel