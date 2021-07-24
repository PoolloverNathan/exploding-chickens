/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/models/event.js
Desc     : mongoose model for logging
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let mongoose = require('mongoose');

// Event schema
module.exports = mongoose.Schema({
    action: {
        type: String,
        required: true
    },
    desc: {
        type: String,
        default: ""
    },
    req_player: {
        type: String,
        required: true
    },
    target_player: {
        type: String,
        default: ""
    },
    created: {
        type: Date,
        default: Date.now
    }
});
