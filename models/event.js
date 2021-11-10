/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/models/event.js
Desc     : mongoose model for logging
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let mongoose = require('mongoose');

// Event schema
module.exports = mongoose.Schema({
    tag: {
        type: String,
        required: true
    },
    req_plyr_id: {
        type: String,
        required: true
    },
    target_plyr_id: {
        type: String,
        required: false
    },
    rel_id: {
        type: String,
        required: false
    },
    rel_val: {
        type: String,
        required: false
    },
    created: {
        type: Date,
        default: Date.now
    }
});
