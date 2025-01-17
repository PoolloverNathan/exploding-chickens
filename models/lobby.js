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
let Game = require('../models/game.js');
let Player = require('../models/player.js');
let Event = require('../models/event.js');
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet('123456789ABCDEF', 6);

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
    in_progress: {
        type: Boolean,
        default: false
    },
    grp_method: {
        type: String,
        default: "random"
    },
    room_size: {
        type: Number,
        default: 5
    },
    play_timeout: {
        type: Number,
        default: -1
    },
    include_host: {
        type: Boolean,
        default: true
    },
    auth_token: {
        type: String,
        default: () => nanoid()
    },
    created: {
        type: Date,
        default: Date.now
    },
    games: [Game],
    players: [Player],
    packs: {
        type: [String],
        default: ["base"]
    },
    events: [Event]
});

// Export game model
module.exports = mongoose.model('Lobby', lobbySchema);