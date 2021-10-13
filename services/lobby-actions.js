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
const game = require("../models/game.js");

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
            parsed_events.push(await lobby_actions.parse_event(raw_lobby_details, raw_lobby_details["events"][i]));
        }
        // Prepare pretty lobby details
        let pretty_lobby_details = {
            games: [],
            slug: raw_lobby_details["slug"],
            created: moment(raw_lobby_details["created"]),
            status: raw_lobby_details["status"],
            imported_packs: raw_lobby_details["imported_packs"],
            grouping_method: raw_lobby_details["grouping_method"],
            room_size: raw_lobby_details["room_size"],
            players_length: raw_lobby_details["players"].length,
            games_completed: 0,
            events: parsed_events,
            events_length: raw_lobby_details["events"].length,
            req_player_id: player_id,
            trigger: source.trim()
        }
        // Sort by game_slug then by seat, then add players to json array
        raw_lobby_details["players"].sort(function(a, b) {
            return a.game_slug - b.game_slug || a.seat.localeCompare(b.seat);
        });
        // Loop through each game using sorted array of players
        let total_wins = 0;
        for (let i = 0; i < raw_lobby_details["players"].length; i++) {
            // Get game details
            let game_details = await game_actions.game_details_slug(raw_lobby_details["players"][i].game_slug);
            // Determine number of exploding chickens
            let ec_count = 0;
            for (let j = 0; j < game_details.cards.length; j++) {
                // If the card is assigned to deck, add to count
                if (game_details.cards[j].action === "chicken" && game_details.cards[j].assignment === "draw_deck") {
                    ec_count += 1;
                }
            }
            // Prepare draw deck
            let draw_deck = await card_actions.filter_cards("draw_deck", game_details.cards);
            // Create array of players
            let game_players = {};
            while (raw_lobby_details["players"][i].game_slug === game_details.slug) {
                // Push in player data
                let card_array = await card_actions.filter_cards(raw_lobby_details["players"][i]._id, game_details.cards);
                game_players.push({
                    _id: raw_lobby_details["players"][i]._id,
                    card_num: card_array.length,
                    avatar: raw_lobby_details["players"][i].avatar,
                    type: raw_lobby_details["players"][i].type,
                    status: raw_lobby_details["players"][i].status,
                    connection: raw_lobby_details["players"][i].connection,
                    nickname: raw_lobby_details["players"][i].nickname,
                    seat: raw_lobby_details["players"][i].seat,
                    wins: raw_lobby_details["players"][i].wins
                });
                // Increment total number of wins
                total_wins += raw_lobby_details["players"][i].wins;
                // Increment i
                i++;
            }
            // Push game object into payload
            pretty_lobby_details.games.push({
                slug: game_details.slug,
                status: game_details.status,
                cards_remaining: draw_deck.length,
                total_cards: game_details.cards.length,
                ec_remaining: ec_count,
                seat_playing: game_details.seat_playing,
                players: game_players
            });
        }
        // Send lobby data
        pretty_lobby_details.games_completed = total_wins;
        return pretty_lobby_details;
    } else {
        return {};
    }
}

// Name : lobby_actions.parse_event(lobby_details, event_obj)
// Desc : parses an event into readable html
// Author(s) : RAk3rman
exports.parse_event = async function (game_details, event_obj) {
    if (event_obj.event_name === "create-player") {
        return {
            icon_path: "<path d=\"M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z\"/>",
            icon_color: "text-purple-500",
            desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> joined the lobby",
            created: moment(event_obj.created).format()
        };
    } else if (event_obj.event_name === "kick-player") {
        return {
            icon_path: "<path d=\"M11 6a3 3 0 11-6 0 3 3 0 016 0zM14 17a6 6 0 00-12 0h12zM13 8a1 1 0 100 2h4a1 1 0 100-2h-4z\"/>",
            icon_color: "text-red-500",
            desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> kicked <strong class=\"text-gray-700\">" + event_obj.target_player + "</strong> from the game",
            created: moment(event_obj.created).format()
        };
    } else if (event_obj.event_name === "make-host") {
        return {
            icon_path: "<path d=\"M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z\"/>",
            icon_color: "text-purple-500",
            desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> made <strong class=\"text-gray-700\">" + event_obj.target_player + "</strong> the host",
            created: moment(event_obj.created).format()
        };
    } else if (event_obj.event_name === "import-pack") {
        let pack = "";
        if (event_obj.rel_id === "yolking_around") {
            pack = "Yolking Around";
        }
        return {
            icon_path: "<path fill-rule=\"evenodd\" d=\"M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z\" clip-rule=\"evenodd\"/>",
            icon_color: "text-green-500",
            desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> added the <strong class=\"text-gray-700\">" + pack + "</strong> card pack",
            created: moment(event_obj.created).format()
        };
    } else if (event_obj.event_name === "export-pack") {
        let pack = "";
        if (event_obj.rel_id === "yolking_around") {
            pack = "Yolking Around";
        }
        return {
            icon_path: "<path fill-rule=\"evenodd\" d=\"M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm1 8a1 1 0 100 2h6a1 1 0 100-2H7z\" clip-rule=\"evenodd\"/>",
            icon_color: "text-red-500",
            desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> removed the <strong class=\"text-gray-700\">" + pack + "</strong> card pack",
            created: moment(event_obj.created).format()
        };
    } else if (event_obj.event_name === "game-won") {
        return {
            icon_path: "<path d=\"M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z\"/>",
            icon_color: "text-yellow-400",
            desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> won the game",
            created: moment(event_obj.created).format()
        };
    } else {
        return {
            icon_path: "<path fill-rule=\"evenodd\" d=\"M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z\" clip-rule=\"evenodd\"/>",
            icon_color: "text-red-500",
            desc: "Invalid event action",
            created: moment(event_obj.created).format()
        };
    }
}

// Name : game_actions.delete_lobby(_id)
// Desc : deletes a existing lobby in mongodb
// Author(s) : RAk3rman
exports.delete_lobby = async function (_id) {
    // Delete lobby and return
    try {
        return await Lobby.deleteOne({ _id: _id });
    } catch (err) {
        throw new Error(err);
    }
}

// Name : lobby_actions.lobby_purge()
// Desc : deletes all lobbies that are older than the purge age
// Author(s) : RAk3rman
exports.lobby_purge = async function () {
    // Filter which objects to purge
    try {
        let to_purge = await Lobby.find({ created: { $lte: moment().subtract(config_storage.get('purge_age_hrs'), "hours").toISOString() } });
        to_purge.forEach(ele => {
            // Delete lobby
            lobby_actions.delete_lobby(ele._id).then(() => {
                console.log(wipe(`${chalk.bold.red('Purge')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.yellow(ele.slug)} Deleted lobby created on ` + moment(ele.created).format('MM/DD/YY-HH:mm:ss')));
            });
        });
    } catch (err) {
        throw new Error(err);
    }
}

// Name : lobby_actions.log_event(lobby_details, event_name, card_action, rel_id, req_player, target_player)
// Desc : creates a new event
// Author(s) : RAk3rman
exports.log_event = async function (lobby_details, event_name, card_action, rel_id, req_player, target_player) {
    lobby_details.events.push({
        event_name: event_name,
        card_action: card_action,
        rel_id: rel_id,
        req_player: req_player,
        target_player: target_player
    });
    // Save lobby
    try {
        return await lobby_details.save();
    } catch (err) {
        throw new Error(err);
    }
}