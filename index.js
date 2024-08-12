const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const User = require('./models/User')
require('dotenv').config()
const app = express()

const bcryptSalt = bcrypt.genSaltSync(10)
const jwtSecret = 'dfhdsjkfhsdjf'

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    credentials: true, 
    origin: 'http://localhost:3000'
}))

mongoose.connect(process.env.MONGO_URL)

app.get('/test', (req, res) => {
    res.json('test ok')
})

app.post('/register', async(req, res) => {
    const {email, password, reEnterPassword} = req.body;
    try {
        const userDoc =  await User.create({
            email, 
            password:bcrypt.hashSync(password, bcryptSalt), 
            reEnterPassword
        })
        res.json(userDoc)
    } catch (error) {
        res.status(422).json(error)
    }
})

app.post('/login', async (req, res) => {
    console.log(req.body)
    const {email, password} = req.body

    const userDoc = await User.findOne({email})

       if(userDoc){
            const passOk = bcrypt.compareSync(password, userDoc.password)
            if(passOk){
                jwt.sign({email:userDoc.email, id:userDoc._id}, jwtSecret, {}, (err, token) => {
                    if(err) throw err
                    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'Lax' }).json(userDoc)
                })
            } else {
                res.status(422).json('pass not ok')
            }
       } else {
            res.json('not found')
       }
   
})

app.get('/profile', (req, res) => {
    const {token} = req.cookies;
    if(token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if(err) throw err;
            const userDoc = await User.findById(userData.id)
            
            res.json(userData)
        })
    } else {
        res.json(null)
    }
})

app.post('/loggout', (req, res) => {
    res.cookie('token','').json(true)
})

app.listen(4000)