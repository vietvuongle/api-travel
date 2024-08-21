const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
    place: {type:mongoose.Schema.Types.ObjectId, require: true},
    checkIn: {type: Date, require: true},
    name: {type:String, require: true},
    phone: {type:String, require: true},
    price: Number,

})

const BookingModel = mongoose.model('Booking', bookingSchema)
module.exports =  BookingModel 