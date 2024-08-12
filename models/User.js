const mongoose = require('mongoose');
const {Schema} = mongoose;

const UserSchema = new Schema({
    email: {type: String, unique: true},
    password: String,
    reEnterPassword: String
})

const UserModel = mongoose.model('User', UserSchema)
module.exports = UserModel;