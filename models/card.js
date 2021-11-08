/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/models/card.js
Desc     : mongoose model for cards
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let mongoose = require('mongoose');

// Card schema
module.exports = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    assign: {
        type: String,
        default: "draw_deck"
    },
    pos: {
        type: Number,
        required: true
    },
    placed_by_plyr_id: {
        type: String,
        required: false
    },
    pack: {
        type: String,
        required: true
    },
});
