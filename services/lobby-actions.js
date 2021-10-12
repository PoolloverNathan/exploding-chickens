/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/lobby-actions.js
Desc     : all actions and helper functions
           related to lobby usage
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let Lobby = require('../models/lobby.js');
let Game = require('../models/game.js');
const chalk = require('chalk');
const moment = require('moment');
let momentDurationFormatSetup = require("moment-duration-format");
const wipe = chalk.white;
const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');
const dataStore = require('data-store');
const config_storage = new dataStore({path: './config/config.json'});
const pkg = require('../package.json');

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');

// Name : lobby_actions.create_lobby()
// Desc : creates a new lobby in mongodb, returns lobby_details
// Author(s) : RAk3rman
exports.create_lobby = async function () {
    // Create new lobby
    try {
        return await Lobby.create({
            slug: uniqueNamesGenerator({dictionaries: [adjectives, animals], separator: '-', length: 2})
        });
    } catch (err) {
        throw new Error(err);
    }
}

// Name : lobby_actions.lobby_details_slug(slug)
// Desc : returns the details for a lobby slug
// Author(s) : RAk3rman
exports.lobby_details_slug = async function (slug) {
    // Find lobby and return
    try {
        return await Lobby.findOne({ slug: slug });
    } catch (err) {
        throw new Error(err);
    }
}

// Name : lobby_actions.lobby_details_id(_id)
// Desc : returns the details for a lobby id
// Author(s) : RAk3rman
exports.lobby_details_id = async function (_id) {
    // Find lobby and return
    try {
        return await Lobby.findOne({ _id: _id });
    } catch (err) {
        throw new Error(err);
    }
}

// Name : game_actions.get_lobby_export(slug, source, player_id)
// Desc : prepares lobby data for export to client
// Author(s) : RAk3rman
exports.get_lobby_export = async function (slug, source, player_id) {
    // Get raw lobby details from mongodb
    let raw_lobby_details = await lobby_actions.lobby_details_slug(slug);
    if (raw_lobby_details !== null) {
        // Prepare events payload
        let parsed_events = [];
        for (let i = raw_lobby_details["events"].length - 1; i >= 0 && i >= (raw_lobby_details["events"].length - 20); i--) {
            parsed_events.push(await game_actions.parse_event(raw_lobby_details, raw_lobby_details["events"][i]));
        }
        // Prepare pretty game details
        let pretty_game_details = {
            players: [],
            slug: raw_lobby_details["slug"],
            created: moment(raw_lobby_details["created"]),
            status: raw_lobby_details["status"],
            imported_packs: raw_lobby_details["imported_packs"],
            grouping_method: raw_lobby_details["grouping_method"],
            room_size: raw_lobby_details["room_size"],
            events: parsed_events,
            events_length: raw_lobby_details["events"].length,
            req_player_id: player_id,
            trigger: source.trim()
        }
        // Sort and add players to json array
        raw_lobby_details["players"].sort(function(a, b) {
            return a.seat - b.seat;
        });
        // Loop through each player
        for (let i = 0; i < raw_lobby_details["players"].length; i++) {
            let card_array = await card_actions.filter_cards(raw_lobby_details["players"][i]._id, raw_lobby_details["cards"]);
            // Sort card hand in reverse order
            card_array.sort(function(a, b) {
                return b.position - a.position;
            });
            // Found current player, return extended details
            pretty_game_details.players.push({
                _id: raw_lobby_details["players"][i]._id,
                cards: card_array,
                card_num: card_array.length,
                avatar: raw_lobby_details["players"][i].avatar,
                type: raw_lobby_details["players"][i].type,
                status: raw_lobby_details["players"][i].status,
                connection: raw_lobby_details["players"][i].connection,
                nickname: raw_lobby_details["players"][i].nickname,
                seat: raw_lobby_details["players"][i].seat,
                wins: raw_lobby_details["players"][i].wins
            });
        }
        // Send game data
        return pretty_game_details;
    } else {
        return {};
    }
}

