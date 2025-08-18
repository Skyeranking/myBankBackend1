const express = require('express')
const app = express()
const UserModel = require('../models/User.models')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const otpGenerator = require('otp-generator')
const Transaction = require('../models/transactionHistory.model')
const getNextAccountNumber = require('../models/genAccountNum.model')

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODE_MAIL,
        pass: process.env.NODE_MAIL_PASS,
    },
});

let OTP = '';
const authToken = (req, res, next) => {
    let authHeaders = req.headers["authorization"];

    const token = authHeaders && authHeaders.split(" ")[1];
    console.log(token);

    if (!token) {
        message = "unauthorized";
        res.send({ message, status: false });
    }

    jwt.verify(token, process.env.APP_PASS, (err, user) => {
        if (err) {
            message = "invalid token";
            res.send({ message, status: false });
        } else {
            next();
        }
    });
};




const signUp = async (req, res) => {
    if (!req.body) {
        return res.status(400).json({
            status: false,
            message: 'Request body is required',
        });
    }

    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
            status: false,
            message: 'All fields are required',
        });
    }

    try {
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                status: false,
                message: 'Email already exists',
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const accountNumber = await getNextAccountNumber();

        const newUser = await UserModel.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            accountnum: accountNumber,
        });

        const token = jwt.sign(
            { userId: newUser._id },
            process.env.APP_PASS,
            { expiresIn: '1h' }
        );


        const mailOptions = {
            from: process.env.NODE_MAIL,
            to: email,
            subject: "Account Created! 🎉",
            html: `<h1>Hello ${firstName},</h1>
      <p>Welcome to My Bank!</p>
      <p>Your account number <strong>${accountNumber}</strong> has been created successfully.</p>`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(201).json({
            status: true,
            token,
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                email: newUser.email,
                accountNumber: newUser.accountnum,
            },
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({
            status: false,
            message: 'Internal server error',
        });
    }
};


const login = async (req, res) => {
    const { email, password } = req.body;
    let user = await UserModel.findOne({ email });
    if (!user) {
        res.send({ status: false, message: "invalid credentials" });
    } else {
        let isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {

            const token = jwt.sign({ id: user._id }, process.env.APP_PASS, {
                expiresIn: "1h",
            });
            res.send({
                status: true,
                message: "sign in successful",
                token,
                id: user._id,
            });
        } else {
            console.log("invalid credentials");
            res.json({ status: false, message: "invalid credentials" });

        }
    }
};


const getAllUser = async (req, res) => {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    console.log(user);
    if (!user) return res.status(404).send("User not found");

    res.json({
        name: user.firstName + " " + user.lastName,
        email: user.email,
        balance: user.balance,
        accountnum: user.accountNumber,
    });
};


const forgotPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }


        if (otp !== OTP) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await UserModel.findByIdAndUpdate(user._id, { password: hashedPassword });

        return res.status(200).json({ message: "Password updated successfully." });

    } catch (error) {
        console.error("Error updating password:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};


const requestOtp = async (req, res) => {
    const { email } = req.body;

    try {
        let user = await UserModel.findOne({ email });

        if (!user) {

            return res.status(400).json({ status: false, message: "User does not exist" });

        }

        OTP = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
        });

        console.log("Generated OTP:", OTP);

        const message = "OTP sent to mail";

        const mailOptions = {
            from: process.env.NODE_MAIL,
            to: email,
            subject: "Your OTP for Password Reset",
            html: `
        <h3>Hello ${user.firstName},</h3>
        <p>You requested to reset your password. Use the OTP below to proceed:</p>
        <h2>${OTP}</h2>
        <p>This OTP is valid for 10 minutes.</p>
      `,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Failed to send OTP email:', err);
                return res.status(500).json({ status: false, message: "Failed to send OTP email" });
            } else {
                console.log('OTP email sent:', info.response);
                return res.status(200).json({ status: true, message: "OTP sent to email" });
            }
        });


        // res.redirect(`forgotPassword/${email}`);

    } catch (error) {
        console.error('Error during OTP request:', error);

        return res.status(500).json({ status: false, message: "Error verifying you" });

    }
};


const authenticator = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.send({
            status: 401,
            message: "unauthorized token",
        });
    }

    jwt.verify(token, process.env.APP_PASS, (err, user) => {
        if (err) {
            return res.send({
                status: 403,
                message: " token is invalid",
            });
        }
        req.user = user;
        next();
    });
};

const depositMoney = async (req, res) => {
    const id = req.user.id;
    const { amount } = req.body;

    try {
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.send({
                status: false,
                message: "Please enter a valid deposit amount",
            });
        }

        const user = await UserModel.findById(id);
        if (!user) {
            return res.send({
                status: false,
                message: "User not found",
            });
        }

        user.balance += parseFloat(amount);
        await user.save();

        await Transaction.create({
            userId: user._id,
            type: 'deposit',
            amount: parseFloat(amount),
        });


        const mailOptions = {
            from: process.env.NODE_MAIL,
            to: user.email,
            subject: "Deposit Confirmation 💰",
            html: `
                <h2>Hello ${user.firstName},</h2>
                <p>Your deposit of <strong>₦${parseFloat(amount).toFixed(2)}</strong> was successful.</p>
                <p>Your updated account balance is <strong>₦${user.balance.toFixed(2)}</strong>.</p>
                <p>Thank you for banking with us.</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        return res.send({
            status: true,
            message: "Deposit successful",
            newBalance: user.balance,
        });

    } catch (err) {
        console.error(err);
        return res.send({
            status: false,
            message: "Server error. Please try again later.",
        });
    }
};


const withdrawMoney = async (req, res) => {
    const id = req.user.id;
    const { amount } = req.body;

    try {
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.send({
                status: false,
                message: "Please enter a valid withdrawal amount",
            });
        }

        const user = await UserModel.findById(id);
        if (!user) {
            return res.send({
                status: false,
                message: "User not found",
            });
        }

        if (user.balance < amount) {
            return res.send({
                status: false,
                message: "Insufficient balance",
            });
        }

        user.balance -= parseFloat(amount);
        await user.save();

        await Transaction.create({
            userId: user._id,
            type: 'withdrawal',
            amount: parseFloat(amount),
        });


        const mailOptions = {
            from: process.env.NODE_MAIL,
            to: user.email,
            subject: "Withdrawal Confirmation 💸",
            html: `
                <h2>Hi ${user.firstName},</h2>
                <p>You have successfully withdrawn <strong>₦${parseFloat(amount).toFixed(2)}</strong> from your account.</p>
                <p>Your new balance is: <strong>₦${user.balance.toFixed(2)}</strong></p>
                <p>Thank you for banking with us.</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        return res.send({
            status: true,
            message: "Withdrawal successful",
            newBalance: user.balance,
        });

    } catch (err) {
        console.error(err);
        return res.send({
            status: false,
            message: "Server error. Please try again later.",
        });
    }
};

const getTransactions = async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const total = await Transaction.countDocuments({ userId });
        const transactions = await Transaction.find({ userId })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        return res.send({
            status: true,
            transactions: transactions.map(tx => ({
                id: tx._id,
                type: tx.type,
                amount: tx.amount,
                date: tx.date,
                description: generateDescription(tx),
            })),
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error(err);
        return res.send({
            status: false,
            message: 'Failed to fetch transactions',
        });
    }
};


function generateDescription(tx) {
    switch (tx.type) {
        case 'deposit':
            return `Deposited ₦${tx.amount}`;
        case 'withdrawal':
            return `Withdrew ₦${tx.amount}`;
        case 'transfer':
            return `Sent ₦${tx.amount} to ${tx.recipient}`;
        case 'Recieved':
            return `Recieved ₦${tx.amount} from ${tx.sender}`;
        default:
            return `Unknown transaction of ₦${tx.amount}`;
    }
}

const transferMoney = async (req, res) => {
    const senderId = req.user.id;
    const { recipientAccount, amount } = req.body;

    if (!recipientAccount || !amount || isNaN(amount) || amount <= 0) {
        return res.send({
            status: false,
            message: "Invalid input.",
        });
    }

    try {
        const sender = await UserModel.findById(senderId);
        const recipient = await UserModel.findOne({ accountNumber: recipientAccount });

        if (!recipient) {
            return res.send({ status: false, message: "Recipient not found." });
        }

        if (sender.accountNumber === recipientAccount) {
            return res.send({ status: false, message: "Cannot transfer to self." });
        }

        const amt = parseFloat(amount);

        if (sender.balance < amt) {
            return res.send({ status: false, message: "Insufficient balance." });
        }

        sender.balance = parseFloat((sender.balance - amt).toFixed(2));
        recipient.balance = parseFloat((recipient.balance + amt).toFixed(2));

        await sender.save();
        await recipient.save();

        await Transaction.create({
            userId: sender._id,
            type: "transfer",
            amount: amt,
            recipient: recipientAccount,
        });

        await Transaction.create({
            userId: recipient._id,
            type: "deposit",
            amount: amt,
        });

        await transporter.sendMail({
            from: process.env.NODE_MAIL,
            to: sender.email,
            subject: "Transfer Successful",
            html: `
                <p>Dear ${sender.firstName},</p>
                <p>You have successfully transferred <strong>₦${amt}</strong> to account <strong>${recipientAccount}</strong>.</p>
                <p>Your new balance is: ₦${sender.balance.toFixed(2)}</p>
                <p>Thank you for banking with us.</p>
            `,
        });

        await transporter.sendMail({
            from: process.env.NODE_MAIL,
            to: recipient.email,
            subject: "You've Received Money!",
            html: `
                <p>Hi ${recipient.firstName},</p>
                <p>You just received <strong>₦${amt}</strong> from <strong>${sender.firstName} ${sender.lastName}</strong>.</p>
                <p>Your new balance is: ₦${recipient.balance.toFixed(2)}</p>
                <p>Log in to see more details.</p>
            `,
        });

        return res.send({
            status: true,
            message: `Successfully sent ₦${amt} to account ${recipientAccount}`,
            newBalance: sender.balance,
        });

    } catch (error) {
        console.error("Transfer error:", error);
        return res.send({
            status: false,
            message: "Internal server error",
        });
    }
};


const resolveAccount = async (req, res) => {
    const { accountnum } = req.body;

    try {
        let user = await UserModel.findOne({ accountNumber: accountnum });
        if (!user) {
            res.json({ status: false, message: "invalid account details" });
        } else {
            res.json({
                status: true,
                accountName: `${user.firstName} ${user.lastName}`,
            });
        }
    } catch (error) {
        res.json({ status: false, message: "Error getting account at this time" });
    }
};

module.exports = {
    signUp,
    login,
    forgotPassword,
    requestOtp,
    getAllUser,
    authenticator,
    depositMoney,
    withdrawMoney,
    getTransactions,
    transferMoney,
    resolveAccount
}