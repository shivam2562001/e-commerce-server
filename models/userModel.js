const mongoose = require('mongoose');


let userScheme = new mongoose.Schema({
  username : {
    type: String,
    required: true,
    trim: true,
  },
  email : {
    type: String,
    required: true,
    trim: true,
  },
  password :{
    type: String,
    required: true,
    trim: true,
  },
  cart:[
    Object
  ],
  orders:[
    Object
  ],
  favourites:[
    String
  ]
  // resetPasswordToken : String,
  // resetPasswordExpires : Date
});


module.exports = mongoose.model('User', userScheme);