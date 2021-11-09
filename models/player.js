/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/models/player.js
Desc     : mongoose model for players
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Player schema
module.exports = mongoose.Schema({
    _id: {
        type: String,
        default: nanoid(10)
    },
    game_assign: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    nickname: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: "/public/avatars/default.png"
    },
    seat_pos: {
        type: Number,
        required: true
    },
    wins: {
        type: Number,
        default: 0
    },
    is_connected: {
        type: Boolean,
        default: false
    },
    is_host: {
        type: Boolean,
        default: false
    },
    is_dead: {
        type: Boolean,
        default: false
    },
    created: {
        type: Date,
        default: Date.now
    }
});
