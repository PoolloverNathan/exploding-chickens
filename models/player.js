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
        default: undefined
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
        default: -1
    },
    wins: {
        type: Number,
        default: 0
    },
    sockets_open: {
        type: Number,
        default: 0
    },
    is_host: {
        type: Boolean,
        default: false
    },
    is_dead: {
        type: Boolean,
        default: false
    },
    is_disabled: {
        type: Boolean,
        default: false
    },
    created: {
        type: Date,
        default: Date.now
    }
});
