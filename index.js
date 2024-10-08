const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const imageDownloader = require('image-downloader')
const mongoose = require('mongoose')
const User = require('./models/User')
const Place = require('./models/Place')
const Booking = require('./models/Booking')
const multer = require('multer')
const fs = require('fs')
const { log } = require('console')
const { resolve } = require('path')
const { rejects } = require('assert')

require('dotenv').config()
const app = express()

const bcryptSalt = bcrypt.genSaltSync(10)
const jwtSecret = 'dfhdsjkfhsdjf'

app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(__dirname+'/uploads'))
app.use(cors({
    credentials: true, 
    origin: 'http://localhost:3000'
}))

mongoose.connect(process.env.MONGO_URL)

function getUserDataFromReq(req) {
    return new Promise((resolve, rejects) => {
        jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
            if(err) throw err
            resolve(userData)
        })
    })
}

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

app.post('/upload-by-link', async (req, res) => {
    const {link} = req.body
    const newName = 'photo' + Date.now() + '.jpg'
    await imageDownloader.image({
        url: link,
        dest: __dirname + '/uploads/' + newName
    })
    res.json(newName)
})

const photosMiddleware = multer({dest:'uploads/'})
app.post('/upload', photosMiddleware.array('photos', 100), (req, res) => {
    const uploadedFiles = []
    for (let i = 0; i < req.files.length; i++) {
        const {path, originalname} = req.files[i]
        const parts = originalname.split('.')
        const ext = parts[parts.length - 1]
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath)
        uploadedFiles.push(newPath.replace('uploads', ''))
        
    }
    res.json(uploadedFiles)
})

app.post('/places',async (req, res) => {
    const {token} = req.cookies;
    const {title, address, addedPhotos, description, extraInfo, checkIn, checkOut, maxPerson, price} = req.body
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if(err) throw err;
        const placeDoc = await Place.create({
            owner: userData.id,
            title, address, photos:addedPhotos, description, extraInfo, checkIn, checkOut, maxPerson, price
        })
        res.json(placeDoc)
    })
   
})

app.get('/user-places', (req, res) => {
    const {token} = req.cookies;
    if(token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            const {id} = userData
            res.json(await Place.find({owner: id}))
        })
    } else {
        res.json(null)
    }
})

app.get('/places/:id',async (req, res) => {
    const {id} = req.params
    res.json( await Place.findById(id))
})

app.put('/places', async (req, res) => {
    const {token} = req.cookies
    const {
        id,
        title,
        address,
        addedPhotos,
        description,
        extraInfo,
        checkIn,
        checkOut,
        maxPerson,
        price
    } = req.body
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err
        const placeDoc = await Place.findById(id)
        if(userData.id === placeDoc.owner.toString()){
            placeDoc.set({
                title, address, photos:addedPhotos, description, extraInfo, checkIn, checkOut, maxPerson, price
            })
            
            await placeDoc.save()
            res.json('ok')
        }
    })
})

app.delete('/places/:id', async (req, res) => {
    const { token } = req.cookies;
    const { id } = req.params;
    console.log(id);
    

    // Xác thực token
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) return res.status(401).json({ error: 'Chưa xác thực' });
            await Place.deleteOne({_id: id});

            res.json('ok')
       

    });
});


app.get('/places',async (req, res) => {
    res.json(await Place.find())
})

app.post('/bookings', async (req, res) => {
    const userData = await getUserDataFromReq(req)
    const {place, checkIn, numberOfGuests, name, phone, price} = req.body
    Booking.create({
        place, checkIn, numberOfGuests, name, phone, price, user:userData.id
    }).then((doc) => {
        res.json(doc)
    }).catch(err => {
        throw err
    })
})



app.get('/bookings', async (req, res) => {
    const userData = await getUserDataFromReq(req)
    res.json(await Booking.find({user:userData.id}).populate('place'))
})

app.listen(4000)