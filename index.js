const express = require('express')
const app = express()
const ejs = require('ejs')
const cors = require('cors')
app.use(cors({
    origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}))
const path = require('path')
app.use(express.static(path.join(__dirname, 'pubic')))
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config()
const userRouter = require('./routes/User.routes')
app.use('/user', userRouter)
const URI = process.env.DATABASE_URI

mongoose
    .connect(URI)
    .then(() => {
        console.log("database connected successfully");
    })
    .catch((err) => {
        console.log(err);
    });


app.get('/', (req, res) => {

    res.send({ status: true, message: 'bank app working fine' })
})

let port = 5000
app.listen(port, (err) => {
    if (err) {
        console.log(err);

    }
    else {
        console.log(`server started successfully on port ${port}`);

    }
})