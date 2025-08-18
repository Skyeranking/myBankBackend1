const express = require('express')
const router = express.Router()
const UserModel = require('../models/User.models')

const GenAccountModel = require('../models/genAccountNum.model')
const { signUp, signupPage, login, forgotPassword, requestOtp, getAccountDetails, getAllUser, authenticator, depositMoney, withdrawMoney, getTransactions, transferMoney, resolveAccount } = require('../controllers/User.controllers')

router.post('/signup', signUp)

router.post("/login", login)
router.post('/forgotPassword', forgotPassword)
router.post('/requestOtp', requestOtp)
router.get("/allUser/:id", authenticator, getAllUser)
router.post('/deposit', authenticator, depositMoney);
router.post('/withdraw', authenticator, withdrawMoney);
router.get('/transaction', authenticator, getTransactions);
router.post('/transfer', authenticator, transferMoney);
router.post('/resolve', authenticator, resolveAccount);



// router.get('/signup', signupPage)

module.exports = router