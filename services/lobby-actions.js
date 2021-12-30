/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/lobby-actions.js
Desc     : all actions and helper functions
           related to lobby usage
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let Lobby = require('../models/lobby.js');
const moment = require('moment');
const chalk = require('chalk');
const wipe = chalk.white;
const { uniqueNamesGenerator, adjectives, animals } = require('unique-names-generator');
const dataStore = require('data-store');
const config_store = new dataStore({path: './config/config.json'});

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');

// Name : lobby_actions.create_lobby()
// Desc : creates a new lobby in mongodb, returns lobby_details
// Author(s) : RAk3rman
exports.create_lobby = async function () {
    // Create new lobby
    return await Lobby.create({
        slug: uniqueNamesGenerator({dictionaries: [adjectives, animals], separator: '-', length: 2})
    });
}

// Name : lobby_actions.partition_players(lobby_details)
// Desc : takes a lobby and partitions players into open game rooms based on grouping settings
// Author(s) : RAk3rman
exports.partition_players = async function (lobby_details) {
    // Find player groupings
    let groups = []; // Array of groups of player _id's
    // Insert players into bucket
    let player_bucket = [];
    for (let i = 0; i < lobby_details.players.length; i++) {
        // Make sure player isn't disabled, isn't included as host if param set, and not already in an active game
        if (!lobby_details.players[i].is_disabled &&
            (lobby_details.players[i].is_host ? lobby_details.include_host : true) &&
            (lobby_details.in_progress ? lobby_details.players[i].game_assign === undefined : true)) {
            player_bucket.push(lobby_details.players[i]);
        }
    }
    // Sort bucket by number of wins (most -> least)
    player_bucket.sort(function(a, b) {
        return b.wins - a.wins;
    });
    // Pull players from bucket and form groups according to grp_method
    while (player_bucket.length > 0) {
        // Determine room_size
        let room_size = lobby_details.room_size;
        if (player_bucket.length === room_size + 1 && room_size > 2) { // One left out, reduce current room_size
            room_size -= 1;
        }
        // Generate group
        let grp = [];
        for (let i = 0; i < room_size && player_bucket.length > 0; i++) {
            if (lobby_details.grp_method === "wins") {
                grp.push(player_bucket.splice(0, 1)[0]._id);
            } else {
                let rand_index = Math.floor(Math.random() * player_bucket.length);
                grp.push(player_bucket.splice(rand_index, 1)[0]._id);
            }
        }
        groups.push(grp);
    }
    // Look through all games for a possible placement
    let game_candidates = [];
    for (let i = 0; i < lobby_details.games.length; i++) {
        // Look for games that are not completed and not in progress
        if (!lobby_details.games[i].is_completed && !lobby_details.games[i].in_progress) {
            game_candidates.push(lobby_details.games[i]._id);
        }
    }
    // Determine if we have enough candidates, if not, create more
    if (groups.length > game_candidates.length) {
        let diff = groups.length - game_candidates.length;
        for (let i = 0; i < diff; i++) {
            let game_pos = await game_actions.create_game(lobby_details);
            for (let j = 0; j < lobby_details.packs.length; j++) {
                game_actions.import_cards(lobby_details, game_pos, lobby_details.packs[j]);
            }
            game_candidates.push(lobby_details.games[game_pos]._id);
        }
    } else if (groups.length < game_candidates.length) { // Check if we have too many candidates, delete if so
        for (let i = groups.length; i < game_candidates.length; i++) {
            game_actions.delete_game(lobby_details, game_candidates[i]);
        }
    }
    // Map game candidates to player groupings
    for (let i = 0; i < lobby_details.players.length; i++) {
        // Attempt to find player _id in groups array
        for (let j = 0; j < groups.length; j++) {
            if (groups[j].includes(lobby_details.players[i]._id)) {
                // Found match, map assign and seat position
                lobby_details.players[i].game_assign = game_candidates[j];
                lobby_details.players[i].seat_pos = groups[j].indexOf(lobby_details.players[i]._id);
                lobby_details.players[i].is_dead = false;
                j = groups.length;
            }
        }
    }
}

// Name : lobby_actions.start_games(lobby_details)
// Desc : starts all games in lobby that aren't completed
// Author(s) : RAk3rman
exports.start_games = function (lobby_details) {
    // Loop through each game
    for (let i = 0; i < lobby_details.games.length; i++) {
        // Game isn't in progress (not started) and not completed
        if (!lobby_details.games[i].in_progress && !lobby_details.games[i].is_completed) {
            // Reset game and update in_progress
            game_actions.reset_game(lobby_details, i);
            lobby_details.games[i].in_progress = true;
            // Create hands and randomize seats
            player_actions.create_hand(lobby_details, i);
            player_actions.randomize_seats(lobby_details, i);
            // Add prelim events to game
            let host_id = "";
            for (let j = 0; j < lobby_details.players.length; j++) {
                if (lobby_details.players[j].game_assign?.equals(lobby_details.games[i]._id)) {
                    event_actions.log_event(lobby_details.games[i], "include-player", lobby_details.players[j]._id, "", "", "");
                }
                if (lobby_details.players[j].is_host) host_id = lobby_details.players[j]._id;
            }
            event_actions.log_event(lobby_details.games[i], "start-game", host_id, "", "", "");
        }
    }
    // Update lobby settings
    lobby_details.in_progress = true;
}

// Name : lobby_actions.reset_games(lobby_details)
// Desc : resets all games in lobby
// Author(s) : RAk3rman
exports.reset_games = function (lobby_details) {
    // Loop through each game
    for (let i = 0; i < lobby_details.games.length; i++) {
        // Game is not completed
        if (!lobby_details.games[i].is_completed) {
            // Reset game
            game_actions.reset_game(lobby_details, i);
            lobby_details.games[i].events = [];
        }
    }
    // Update lobby settings
    lobby_details.in_progress = false;
}

// Name : lobby_actions.update_option(lobby_details, option, value)
// Desc : updates an option from the client
// Author(s) : RAk3rman
exports.update_option = async function (lobby_details, option, value) {
    // Determine which option to change and verify parameter
    if (option === "grp_method" && (value === "random" || value === "wins")) {
        lobby_details.grp_method = value;
        await lobby_actions.partition_players(lobby_details);
        return true;
    } else if (option === "room_size" && (value < 7 && value > 1)) {
        lobby_details.room_size = value;
        await lobby_actions.partition_players(lobby_details);
        return true;
    } else if (option === "play_timeout" && (value === "-1" || value === "30" || value === "60" || value === "120")) {
        lobby_details.play_timeout = value;
        return true;
    } else if (option === "include_host") {
        lobby_details.include_host = !lobby_details.include_host;
        // Update host if not included in game
        if (!lobby_details.include_host) {
            for (let i = 0; i < lobby_details.players.length; i++) {
                if (lobby_details.players[i].is_host) {
                    lobby_details.players[i].game_assign = undefined;
                    lobby_details.players[i].seat_pos = -1;
                    break;
                }
            }
        }
        await lobby_actions.partition_players(lobby_details);
        return true;
    }
    return false;
}

// Name : lobby_actions.lobby_export(lobby_details, source, req_plyr_id)
// Desc : prepares lobby data for export to client
// Author(s) : RAk3rman
exports.lobby_export = function (lobby_details, source, req_plyr_id) {
    if (!lobby_details) return;
    // Prepare events payload
    let events_payload = [];
    for (let i = lobby_details.events.length - 1; i >= 0 && i >= (lobby_details.events.length - 20); i--) {
        events_payload.push(event_actions.parse_event(lobby_details, lobby_details.events[i]));
    }
    // Prepare games payload
    let games_payload = [];
    let games_completed = 0;
    for (let i = 0; i < lobby_details.games.length; i++) {
        if (!lobby_details.games[i].is_completed) {
            games_payload.push(game_actions.game_export(lobby_details, i, undefined, source, req_plyr_id));
        }
        if (lobby_details.games[i].is_completed) games_completed++;
    }
    // Prepare players payload
    let players_payload = [];
    for (let i = 0; i < lobby_details.players.length; i++) {
        // Make sure player isn't disabled
        if (!lobby_details.players[i].is_disabled) {
            players_payload.push(player_actions.player_export(lobby_details, i));
        }
    }
    // Return pretty lobby details
    return {
        slug: lobby_details.slug,
        in_progress: lobby_details.in_progress,
        grp_method: lobby_details.grp_method,
        room_size: lobby_details.room_size,
        play_timeout: lobby_details.play_timeout,
        include_host: lobby_details.include_host,
        created: moment(lobby_details.created),
        games: games_payload,
        games_completed: games_completed,
        players: players_payload,
        packs: lobby_details.packs,
        events: events_payload,
        events_length: lobby_details.events.length,
        auth_token: req_plyr_id !== "spectator" ? lobby_details.auth_token : "undefined",
        req_plyr_id: req_plyr_id,
        trigger: source.trim()
    }
}

// Name : game_actions.delete_lobby(_id)
// Desc : deletes an existing lobby in mongodb
// Author(s) : RAk3rman
exports.delete_lobby = function (_id) {
    // Delete lobby and return
    return Lobby.deleteOne({_id: _id});
}

// Name : lobby_actions.lobby_purge(suppress_debug)
// Desc : deletes all lobbies that are older than the purge age
// Author(s) : RAk3rman
exports.lobby_purge = async function (suppress_debug) {
    // Filter which objects to purge
    let to_purge = await Lobby.find({ created: { $lte: moment().subtract(config_store.get('purge_age_hrs'), "hours").toISOString() } });
    to_purge.forEach(ele => {
        // Delete lobby
        lobby_actions.delete_lobby(ele._id).then(() => {
            if (!suppress_debug) console.log(wipe(`${chalk.bold.red('Purge')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.yellow(ele.slug)} Deleted lobby created on ` + moment(ele.created).format('MM/DD/YY-HH:mm:ss')));
        });
    });
}