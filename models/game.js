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
let Card = require('../models/card.js');
let Event = require('../models/event.js');

// Game schema
module.exports = mongoose.Schema({
    slug: {
        type: String,
        default: uniqueNamesGenerator({
            dictionaries: [adjectives, animals, colors],
            separator: '-',
            length: 2
        })
    },
    in_progress: {
        type: Boolean,
        default: false
    },
    is_completed: {
        type: Boolean,
        default: false
    },
    turn_seat_pos: {
        type: Number,
        default: 0
    },
    turn_dir: {
        type: String,
        default: "forward"
    },
    turns_remain: {
        type: Number,
        default: 1
    },
    created: {
        type: Date,
        default: Date.now
    },
    cards: [Card],
    events: [Event]
});