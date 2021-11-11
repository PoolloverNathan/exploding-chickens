/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/lobby-actions.js
Desc     : all actions and helper functions
           related to lobby usage
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let Lobby = require('../models/lobby.js');
const chalk = require('chalk');
const moment = require('moment');
let momentDurationFormatSetup = require("moment-duration-format");
const wipe = chalk.white;
const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');
const dataStore = require('data-store');
const config_storage = new dataStore({path: './config/config.json'});
const pkg = require('../package.json');
const { nanoid } = require('nanoid');

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
    try {
        return await Lobby.create({
            slug: uniqueNamesGenerator({dictionaries: [adjectives, animals], separator: '-', length: 2}),
            auth_token: nanoid(6)
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

// Name : lobby_actions.save_lobby(lobby_details)
// Desc : saves a lobby_details object
// Author(s) : RAk3rman
exports.save_lobby = async function (lobby_details) {
    // Save lobby
    try {
        return await lobby_details.save();
    } catch (err) {
        throw new Error(err);
    }
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
        // Make sure player isn't disabled and isn't included as host if param set
        // TODO Don't include player in bucket if in an active game
        if (!lobby_details.players[i].is_disabled &&
            (lobby_details.players[i].is_host ? lobby_details.include_host : true)) {
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
            if (lobby_details.grp_method === "random") {
                let rand_index = Math.floor(Math.random() * player_bucket.length);
                grp.push(player_bucket.splice(rand_index, 1)[0]._id);
            } else if (lobby_details.grp_method === "wins") {
                grp.push(player_bucket.splice(0, 1)[0]._id);
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
                await game_actions.import_cards(lobby_details, game_pos, lobby_details.packs[j]);
            }
            game_candidates.push(lobby_details.games[game_pos]._id);
        }
    } else if (groups.length < game_candidates.length) { // Check if we have too many candidates, delete if so
        for (let i = groups.length; i < game_candidates.length; i++) {
            await game_actions.delete_game(lobby_details, game_candidates[i]);
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
                j = groups.length;
            }
        }
    }
}

// Name : lobby_actions.start_games(lobby_details)
// Desc : starts all games in lobby that aren't completed
// Author(s) : RAk3rman
exports.start_games = async function (lobby_details) {
    // Loop through each game
    for (let i = 0; i < lobby_details.games.length; i++) {
        // Game isn't in progress (not started) and not completed
        if (!lobby_details.games[i].in_progress && !lobby_details.games[i].is_completed) {
            // Reset game and update in_progress
            await game_actions.reset_game(lobby_details, i);
            lobby_details.games[i].in_progress = true;
            // Create hands and randomize seats
            await player_actions.create_hand(lobby_details, i);
            await player_actions.randomize_seats(lobby_details, i);
            // Add prelim events to game
            let host_id = "";
            for (let j = 0; j < lobby_details.players.length; j++) {
                if (lobby_details.players[j].game_assign?.equals(lobby_details.games[i]._id)) {
                    await event_actions.log_event(lobby_details.games[i], "include-player", lobby_details.players[j]._id, "", "", "");
                }
                if (lobby_details.players[j].is_host) host_id = lobby_details.players[j]._id;
            }
            await event_actions.log_event(lobby_details.games[i], "start-game", host_id, "", "", "");
        }
    }
    // Update lobby settings
    lobby_details.in_progress = true;
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

// Name : game_actions.lobby_export(lobby_details, source, req_player_id)
// Desc : prepares lobby data for export to client
// Author(s) : RAk3rman
exports.lobby_export = async function (lobby_details, source, req_player_id) {
    if (!lobby_details) return;
    // Prepare events payload
    let events_payload = [];
    for (let i = lobby_details.events.length - 1; i >= 0 && i >= (lobby_details.events.length - 20); i--) {
        events_payload.push(await event_actions.parse_event(lobby_details, lobby_details.events[i]));
    }
    // Prepare games payload
    let games_payload = [];
    let games_completed = 0;
    for (let i = 0; i < lobby_details.games.length; i++) {
        if (!lobby_details.games[i].is_completed) {
            games_payload.push(await game_actions.game_export(lobby_details, i, source, req_player_id));
        }
        if (lobby_details.games[i].is_completed) games_completed++;
    }
    // Prepare players payload
    let players_payload = [];
    for (let i = 0; i < lobby_details.players.length; i++) {
        // Make sure player isn't disabled
        if (!lobby_details.players[i].is_disabled) {
            players_payload.push(await player_actions.player_export(lobby_details, i));
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
        req_player_id: req_player_id,
        trigger: source.trim()
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