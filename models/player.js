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
    game_slug: {
        type: String,
        required: false // TODO change to true
    },
    nickname: {
        type: String,
        required: true
    },
    seat: {
        type: Number,
        required: true
    },
    avatar: {
        type: String,
        default: "/public/avatars/default.png"
    },
    type: {
        type: String,
        default: "player"
    },
    status: {
        type: String,
        default: "idle"
    },
    connection: {
        type: String,
        default: "connected"
    },
    wins: {
        type: Number,
        default: 0
    },
});
