/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/models/lobby.js
Desc     : mongoose model for each lobby,
           including players
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');

// Imported schemas
let game = require('../models/game.js');
let player = require('../models/player.js');
let event = require('../models/event.js');

// Lobby schema
let lobbySchema = mongoose.Schema({
    slug: {
        type: String,
        default: uniqueNamesGenerator({
            dictionaries: [adjectives, animals, colors],
            separator: '-',
            length: 2
        })
    },
    status: {
        type: String,
        default: "in_queue"
    },
    tournament_mode: {
        type: Boolean,
        default: false
    },
    matching_method: {
        type: String,
        default: "random"
    },
    players_per_game: {
        type: Number,
        default: 4
    },
    created: {
        type: Date,
        default: Date.now
    },
    games: [game],
    players: [player],
    imported_packs: [String],
    events: [event]
});

// Export game model
module.exports = mongoose.model('lobby', lobbySchema);