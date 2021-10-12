/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/models/game.js
Desc     : mongoose model for each game,
           including players and cards
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');

// Imported schemas
let player = require('../models/player.js');
let card = require('../models/card.js');
let event = require('../models/event.js');

// Game schema
let gameSchema = mongoose.Schema({
    slug: {
        type: String,
        default: uniqueNamesGenerator({
            dictionaries: [adjectives, animals, colors],
            separator: '-',
            length: 2
        })
    },
    lobby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'lobby'
    },
    seat_playing: {
        type: Number,
        default: 0
    },
    turn_direction: {
        type: String,
        default: "forward"
    },
    turns_remaining: {
        type: Number,
        default: 1
    },
    player_cap: {
        type: Number,
        default: 5
    },
    status: {
        type: String,
        default: "in_lobby"
    },
    created: {
        type: Date,
        default: Date.now
    },
    start_time: {
        type: Date,
        default: Date.now
    },
    players: [player],
    cards: [card],
    events: [event],
    imported_packs: [String]
});

// Export game model
module.exports = mongoose.model('game', gameSchema);