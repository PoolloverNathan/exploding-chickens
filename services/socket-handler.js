/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/socket-handler.js
Desc     : handles all socket.io actions
           and sends data back to client
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
const Lobby = require("../models/lobby.js");
const moment = require('moment');
const chalk = require('chalk');
const wipe = chalk.white;
const waterfall = require('async-waterfall');
const Filter = require('bad-words'), filter = new Filter();

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');
let socket_helpers = require('./socket-helpers.js');

// Export to app.js file
module.exports = function (fastify, stats_store, config_store, bot) {
    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Successfully opened socket.io connection`));
    stats_store.set('sockets_active', 0);

    // Name : socket.on.connection
    // Desc : runs when a new connection is created through socket.io
    // Author(s) : RAk3rman
    fastify.io.on('connection', function (socket) {
        console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.green('new-connection  ')} ${chalk.dim.blue(socket.id)}`));
        stats_store.set('sockets_active', stats_store.get('sockets_active') + 1);

        // Variables in scope of connection thread
        let player_data = {};
        let card_lock = false;

        // Name : socket.on.player-online
        // Desc : runs when the client receives game data and is hosting a valid player
        // Author(s) : RAk3rman
        socket.on('player-online', async function (data) {
            let action = "player-online   ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to mark existing player as online`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                async function(lobby_details, req_data, action, socket_id, callback) { // Send game data
                    player_data = req_data;
                    player_actions.update_sockets_open(lobby_details, req_data.plyr_id, "inc");
                    await lobby_details.save();
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Player now ${chalk.dim.green('connected')}`, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.retrieve-lobby
        // Desc : runs when lobby data is requested from the client
        // Author(s) : RAk3rman
        socket.on('retrieve-lobby', async function (data) {
            let action = "retrieve-lobby  ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to retrieve lobby data`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                async function(lobby_details, req_data, action, socket_id, callback) { // Send lobby data
                    socket.join(lobby_details.slug);
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, socket_id, action, fastify, config_store);
                    callback(false, `Retrieved and sent lobby data`, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.retrieve-game
        // Desc : runs when game data is requested from the client
        // Author(s) : RAk3rman
        socket.on('retrieve-game', async function (data) {
            let action = "retrieve-game   ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.game_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to retrieve game data`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_g_get, // Get game_details
                async function(lobby_details, game_pos, req_data, action, socket_id, callback) { // Send game data
                    socket.join(lobby_details.slug);
                    await socket_helpers.update_g_ui(lobby_details, game_pos, req_data.plyr_id, socket_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Retrieved and sent game data`, lobby_details, game_pos, req_data, action, socket_id);
                }
            ], wf_g_final_callback);
        })

        // Name : socket.on.create-player
        // Desc : runs when a new player to be created
        // Author(s) : RAk3rman
        socket.on('create-player', async function (data) {
            let action = "create-player   ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to create new player`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                async function(lobby_details, req_data, action, socket_id, callback) { // Validation checks
                    let options = ["bear.png", "bull.png", "cat.png", "dog.png", "elephant.png", "flamingo.png", "fox.png", "lion.png", "mandrill.png", "meerkat.png", "monkey.png", "panda.png", "puma.png", "raccoon.png", "wolf.png"];
                    if (req_data.nickname === undefined || // Not blank
                        !/^[a-zA-Z]/.test(req_data.nickname) || // Doesn't contain letters
                        req_data.nickname.length > 12 || // Length is over 12 chars
                        filter.isProfane(req_data.nickname) || // Uses profane language
                        lobby_details.players.some(e => e.nickname === req_data.nickname && !e.is_disabled)) // Nickname doesn't exist already
                    { // Make sure nickname matches filters
                        callback(true, `PLYR-NAME`, lobby_details, req_data, action, socket_id);
                    } else if (req_data.avatar === "default.png" && options.includes(req_data.avatar)) { // Make sure a valid avatar was chosen
                        callback(true, `PLYR-AVTR`, lobby_details, req_data, action, socket_id);
                    } else if (req_data.auth_token !== lobby_details.auth_token) { // Make sure auth_token matches
                        callback(true, `AUTH-TOKN`, lobby_details, req_data, action, socket_id);
                    } else {
                        callback(false, lobby_details, req_data, action, socket_id);
                    }
                },
                async function(lobby_details, req_data, action, socket_id, callback) { // Create player
                    req_data.plyr_id = player_actions.create_player(lobby_details, req_data.nickname, req_data.avatar);
                    event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, undefined, undefined, undefined);
                    await lobby_actions.partition_players(lobby_details);
                    await lobby_details.save();
                    fastify.io.to(socket_id).emit("player-created", req_data.plyr_id);
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Created new player`, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.start-games
        // Desc : runs when the host requests the lobby to start all games
        // Author(s) : RAk3rman
        socket.on('start-games', async function (data) {
            let action = "start-games     ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to start all games`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                wf_l_validate_host, // Validate req player is host
                wf_l_validate_not_in_progress, // Validate we are not in progress
                async function(lobby_details, req_data, action, socket_id, callback) { // Start game if player cap is satisfied
                    if (lobby_details.players.length < (lobby_details.include_host ? 2 : 3)) {
                        callback(true, `At least 2 players are required`, lobby_details, req_data, action, socket_id);
                    } else if (lobby_details.players.length % 2 === 1 && lobby_details.room_size === 2) {
                        callback(true, `Uneven number of players`, lobby_details, req_data, action, socket_id);
                    } else {
                        lobby_actions.start_games(lobby_details);
                        event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, undefined, undefined, undefined);
                        await lobby_details.save();
                        await socket_helpers.validate_timeout(lobby_details._id, fastify, bot, config_store, stats_store);
                        await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                        callback(false, `All active lobby games have been ${chalk.dim.green('started')}`, lobby_details, req_data, action, socket_id);
                    }
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.reset-lobby
        // Desc : runs when the host requests the game to reset back to the lobby
        // Author(s) : RAk3rman
        socket.on('reset-lobby', async function (data) {
            let action = "reset-lobby     ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to reset all games in lobby`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                wf_l_validate_host, // Validate req player is host
                async function(lobby_details, req_data, action, socket_id, callback) { // Reset all games
                    lobby_actions.reset_lobby(lobby_details);
                    event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, undefined, undefined, undefined);
                    await lobby_details.save();
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `All active lobby games have been ${chalk.dim.yellow('reset')}`, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.reset-game
        // Desc : runs when the host requests an individual game to be reset
        // Author(s) : RAk3rman
        socket.on('reset-game', async function (data) {
            let action = "reset-game      ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.game_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to reset game`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_g_get, // Get lobby_details
                wf_g_validate_host, // Validate req player is host
                async function(lobby_details, game_pos, req_data, action, socket_id, callback) { // Reset game
                    game_actions.start_game(lobby_details, game_pos);
                    event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, undefined, lobby_details.games[game_pos]._id, undefined);
                    await lobby_details.save();
                    await socket_helpers.update_g_ui(lobby_details, game_pos, req_data.plyr_id, socket_id, undefined, undefined, action, fastify, config_store);
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Game has been ${chalk.dim.yellow('reset')}`, lobby_details, req_data, action, socket_id);
                }
            ], wf_g_final_callback);
        })

        // Name : socket.on.play-card
        // Desc : runs when a card is played on the client
        // Author(s) : RAk3rman
        socket.on('play-card', async function (data) {
            let action = "play-card       ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.game_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to play card`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_g_get, // Get game_details
                wf_g_validate_in_progress, // Validate we are in game
                wf_g_validate_turn, // Validate it is req player's turn
                wf_g_validate_lock, // Validate player is able to modify cards
                async function(lobby_details, game_pos, req_data, action, socket_id, callback) {
                    // Play card
                    let cb_data = game_actions.play_card(lobby_details, game_pos, req_data.card_id, req_data.plyr_id, req_data.target, stats_store);
                    await lobby_details.save();
                    // Throw err if play_card throws err
                    if (cb_data.err) {
                        card_lock = false; callback(true, cb_data.err, lobby_details, game_pos, req_data, action, socket_id);
                    } else {
                        await socket_helpers.update_g_ui(lobby_details, game_pos, req_data.plyr_id, socket_id, undefined, cb_data, action, fastify, config_store);
                        // Start explode tick if we are exploding
                        if (!cb_data.incomplete) await socket_helpers.explode_tick(lobby_details._id, game_pos, req_data.plyr_id, socket_id, undefined, 15, fastify, bot, config_store, stats_store);
                        card_lock = false; callback(false, `Played card ` + req_data.card_id, lobby_details, game_pos, req_data, action, socket_id);
                    }
                }
            ], wf_g_final_callback);
        })

        // Name : socket.on.draw-card
        // Desc : runs when a card is drawn on the client
        // Author(s) : RAk3rman
        socket.on('draw-card', async function (data) {
            let action = "draw-card       ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.game_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to draw card`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_g_get, // Get game_details
                wf_g_validate_in_progress, // Validate we are in game
                wf_g_validate_turn, // Validate it is req player's turn
                wf_g_validate_lock, // Validate player is able to modify cards
                async function(lobby_details, game_pos, req_data, action, socket_id, callback) {
                    // Make sure we aren't exploding
                    if (player_actions.is_exploding(card_actions.filter_cards(req_data.plyr_id, lobby_details.games[game_pos].cards))) {
                        card_lock = false; callback(true, 'Cannot draw while exploding', lobby_details, game_pos, req_data, action, socket_id);
                    } else {
                        // Draw card
                        let card_details = game_actions.draw_card(lobby_details, game_pos, req_data.plyr_id);
                        await lobby_details.save();
                        await socket_helpers.update_g_ui(lobby_details, game_pos, req_data.plyr_id, socket_id, undefined, game_actions.generate_cb(undefined, card_details, undefined, undefined, false), action, fastify, config_store);
                        // Start explode tick if we are exploding
                        await socket_helpers.explode_tick(lobby_details._id, game_pos, req_data.plyr_id, socket_id, undefined, 15, fastify, bot, config_store, stats_store);
                        card_lock = false; callback(false, `Drew card ` + card_details._id, lobby_details, game_pos, req_data, action, socket_id);
                    }
                }
            ], wf_g_final_callback);
        })

        // Name : socket.on.update-option
        // Desc : updates a lobby option
        // Author(s) : RAk3rman
        socket.on('update-option', async function (data) {
            let action = "update-option   ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to update lobby option`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                wf_l_validate_host, // Validate req player is host
                wf_l_validate_not_in_progress, // Validate we are not in progress
                async function(lobby_details, req_data, action, socket_id, callback) { // Update option
                    let result = await lobby_actions.update_option(lobby_details, req_data.option, req_data.value);
                    if (!result) callback(true, `Invalid option`, lobby_details, req_data, action, socket_id);
                    if (req_data.option === "include_host") req_data.value = lobby_details.include_host;
                    event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, undefined, req_data.option, req_data.value);
                    await lobby_details.save();
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Updated option: ` + req_data.option, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.kick-player
        // Desc : kicks a target player from a lobby
        // Author(s) : RAk3rman
        socket.on('kick-player', async function (data) {
            let action = "kick-player     ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to kick player`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                wf_l_validate_host, // Validate req player is host
                async function(lobby_details, req_data, action, socket_id, callback) { // Kick player
                    await player_actions.kick_player(lobby_details, req_data.plyr_id, req_data.kick_plyr_id);
                    event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, req_data.kick_plyr_id, undefined, undefined);
                    await lobby_details.save();
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Kicked player: ` + req_data.kick_plyr_id, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.make-host
        // Desc : makes a new player the host
        // Author(s) : RAk3rman
        socket.on('make-host', async function (data) {
            let action = "make-host       ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to transfer host role`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                wf_l_validate_host, // Validate req player is host
                async function(lobby_details, req_data, action, socket_id, callback) { // Make host
                    player_actions.make_host(lobby_details, req_data.plyr_id, req_data.suc_plyr_id);
                    event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, req_data.suc_plyr_id, undefined, undefined);
                    await lobby_details.save();
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Transferred host role from: ` + req_data.plyr_id + ` -> ` + req_data.suc_plyr_id, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.import-pack
        // Desc : imports a new pack into a game
        // Author(s) : RAk3rman
        socket.on('import-pack', async function (data) {
            let action = "import-pack     ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to import card pack`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                wf_l_validate_host, // Validate req player is host
                wf_l_validate_not_in_progress, // Validate we are not in progress
                async function(lobby_details, req_data, action, socket_id, callback) { // Verify pack isn't imported already
                    if (!lobby_details.packs.includes(req_data.pack_name)) {
                        callback(false, lobby_details, req_data, action, socket_id);
                    } else {
                        callback(true, `Pack has already been imported`, lobby_details, req_data, action, socket_id);
                    }
                },
                async function(lobby_details, req_data, action, socket_id, callback) { // Make sure pack exists
                    if (req_data.pack_name === "yolking_around") {
                        callback(false, lobby_details, req_data, action, socket_id);
                    } else {
                        callback(true, `Pack does not exist`, lobby_details, req_data, action, socket_id);
                    }
                },
                async function(lobby_details, req_data, action, socket_id, callback) { // Import card pack across all games
                    for (let i = 0; i < lobby_details.games.length; i++) {
                        game_actions.import_cards(lobby_details, i, req_data.pack_name);
                    }
                    event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, undefined, req_data.pack_name, undefined);
                    await lobby_details.save();
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Imported card pack: ` + req_data.pack_name, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.export-pack
        // Desc : exports a new pack from a game
        // Author(s) : RAk3rman
        socket.on('export-pack', async function (data) {
            let action = "export-pack     ";
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to export card pack`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_l_get, // Get lobby_details
                wf_l_validate_host, // Validate req player is host
                wf_l_validate_not_in_progress, // Validate we are not in progress
                async function(lobby_details, req_data, action, socket_id, callback) { // Verify pack is imported already
                    if (lobby_details.packs.includes(req_data.pack_name)) {
                        callback(false, lobby_details, req_data, action, socket_id);
                    } else {
                        callback(true, `Pack was never imported`, lobby_details, req_data, action, socket_id);
                    }
                },
                async function(lobby_details, req_data, action, socket_id, callback) { // Make sure pack exists
                    if (req_data.pack_name === "yolking_around") {
                        callback(false, lobby_details, req_data, action, socket_id);
                    } else {
                        callback(true, `Pack does not exist`, lobby_details, req_data, action, socket_id);
                    }
                },
                async function(lobby_details, req_data, action, socket_id, callback) { // Export card pack across all games
                    for (let i = 0; i < lobby_details.games.length; i++) {
                        game_actions.export_cards(lobby_details, i, req_data.pack_name);
                    }
                    event_actions.log_event(lobby_details, action.trim(), req_data.plyr_id, undefined, req_data.pack_name, undefined);
                    await lobby_details.save();
                    await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                    callback(false, `Exported card pack: ` + req_data.pack_name, lobby_details, req_data, action, socket_id);
                }
            ], wf_l_final_callback);
        })

        // Name : socket.on.check-lobby-slug
        // Desc : runs when we need to see if a slug exists in the db
        // Author(s) : RAk3rman
        socket.on('check-lobby-slug', async function (data) {
            if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-lobby-slug')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Received request to verify lobby slug`));
            // Check to see if game exists
            if (await Lobby.exists({ slug: data.slug })) {
                fastify.io.to(socket.id).emit("slug-response", data.slug);
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-lobby-slug')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Lobby slug is ${chalk.dim.green('valid')}`));
            } else {
                fastify.io.to(socket.id).emit("slug-response", false);
                if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-lobby-slug')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.plyr_id)} Lobby slug is ${chalk.dim.red('invalid')}`));
            }
        })

        // Name : socket.on.disconnect
        // Desc : runs when the client disconnects
        // Author(s) : RAk3rman
        socket.on('disconnect', async function () {
            let action = "player-offline  ";
            stats_store.set('sockets_active', stats_store.get('sockets_active') - 1);
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.red('new-disconnect  ')} ${chalk.dim.blue(socket.id)}`));
            // Check if active player is using socket
            if (player_data.plyr_id !== undefined) {
                if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(player_data.lobby_slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(player_data.plyr_id)} Received request to mark existing player as offline`));
                waterfall([
                    async function(callback) {callback(null, player_data, action, socket.id)}, // Start waterfall
                    wf_l_get, // Get lobby_details
                    async function(lobby_details, req_data, action, socket_id, callback) { // Update sockets open
                        player_actions.update_sockets_open(lobby_details, req_data.plyr_id, "dec");
                        await lobby_details.save();
                        await socket_helpers.update_l_ui(lobby_details, req_data.plyr_id, socket_id, undefined, action, fastify, config_store);
                        callback(false, `Player now ${chalk.dim.red('disconnected')}`, lobby_details, req_data, action, socket_id);
                    }
                ], wf_l_final_callback);
            }
        });

        // Name : wf_l_final_callback(err, msg, lobby_details, req_data, action, req_sock)
        // Desc : final callback from waterfall, handles error if triggered
        // Author(s) : RAk3rman
        async function wf_l_final_callback(err, msg, lobby_details, req_data, action, req_sock) {
            if (err) {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(req_data.lobby_slug)} ${chalk.dim.blue(req_sock)} ${chalk.dim.magenta(req_data.plyr_id)} ${chalk.dim.red('lobby-error')} ` + msg));
                fastify.io.to(req_sock).emit(req_data.lobby_slug + "-lobby-error", {
                    msg: msg,
                    lobby_details: lobby_actions.lobby_export(lobby_details, action, req_data.plyr_id)
                });
            } else {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(req_data.lobby_slug)} ${chalk.dim.blue(req_sock)} ${chalk.dim.magenta(req_data.plyr_id)} ` + msg));
            }
        }

        // Name : wf_g_final_callback(err, msg, lobby_details, game_pos, req_data, action, req_sock)
        // Desc : final callback from waterfall, handles error if triggered
        // Author(s) : RAk3rman
        async function wf_g_final_callback(err, msg, lobby_details, game_pos, req_data, action, req_sock) {
            if (err) {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(req_data.game_slug)} ${chalk.dim.blue(req_sock)} ${chalk.dim.magenta(req_data.plyr_id)} ${chalk.dim.red('game-error')} ` + msg));
                fastify.io.to(req_sock).emit(req_data.game_slug + "-game-error", {
                    msg: msg,
                    game_details: game_actions.game_export(lobby_details, game_pos, undefined, action, req_data.plyr_id)
                });
            } else {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(req_data.game_slug)} ${chalk.dim.blue(req_sock)} ${chalk.dim.magenta(req_data.plyr_id)} ` + msg));
            }
        }

        // Name : wf_l_get(req_data, action, req_sock, callback)
        // Desc : get lobby details from waterfall
        // Author(s) : RAk3rman
        async function wf_l_get(req_data, action, req_sock, callback) {
            // Determine if we should filter by slug and plyr_id
            let filter = req_data.plyr_id === "spectator" ? { slug: req_data.lobby_slug } : { slug: req_data.lobby_slug, "players._id": req_data.plyr_id };
            // Determine if lobby exists
            if (await Lobby.exists(filter)) {
                callback(false, await Lobby.findOne({ slug: req_data.lobby_slug}), req_data, action, req_sock);
            } else {
                callback(true, "LOBBY-DNE", undefined, req_data, action, req_sock);
            }
        }

        // Name : wf_g_get(req_data, action, req_sock, callback)
        // Desc : get game details from waterfall
        // Author(s) : RAk3rman
        async function wf_g_get(req_data, action, req_sock, callback) {
            // Determine if we should filter by slug and plyr_id
            let filter = req_data.plyr_id === "spectator" ? { slug: req_data.lobby_slug } : { slug: req_data.lobby_slug, games: { $elemMatch: { slug: req_data.game_slug }}, "players._id": req_data.plyr_id };
            // Determine if game exists
            if (await Lobby.exists(filter)) {
                let lobby_details = await Lobby.findOne({ slug: req_data.lobby_slug});
                for (let i = 0; i < lobby_details.games.length; i++) {
                    if (lobby_details.games[i].slug === req_data.game_slug) {
                        callback(false, lobby_details, i, req_data, action, req_sock);
                    }
                }
            } else {
                callback(true, "GAME-DNE", undefined, undefined, req_data, action, req_sock);
            }
        }

        // Name : wf_l_validate_host(lobby_details, req_data, action, req_sock, callback)
        // Desc : validate req user is host from waterfall
        // Author(s) : RAk3rman
        async function wf_l_validate_host(lobby_details, req_data, action, req_sock, callback) {
            // Find player
            for (let i = 0; i < lobby_details.players.length; i++) {
                if (lobby_details.players[i]._id === req_data.plyr_id) {
                    // Check if the user is of type host
                    if (lobby_details.players[i].is_host) {
                        callback(false, lobby_details, req_data, action, req_sock);
                    } else {
                        callback(true, "You are not the host", lobby_details, req_data, action, req_sock);
                    }
                }
            }
        }

        // Name : wf_g_validate_host(lobby_details, game_pos, req_data, action, req_sock, callback)
        // Desc : validate req user is host from waterfall
        // Author(s) : RAk3rman
        async function wf_g_validate_host(lobby_details, game_pos, req_data, action, req_sock, callback) {
            // Find player
            for (let i = 0; i < lobby_details.players.length; i++) {
                if (lobby_details.players[i]._id === req_data.plyr_id) {
                    // Check if the user is of type host
                    if (lobby_details.players[i].is_host) {
                        callback(false, lobby_details, game_pos, req_data, action, req_sock);
                    } else {
                        callback(true, "You are not the host", lobby_details, game_pos, req_data, action, req_sock);
                    }
                }
            }
        }

        // Name : wf_validate_not_in_progress(lobby_details, req_data, action, req_sock, callback)
        // Desc : validate that the lobby is not in_progress
        // Author(s) : RAk3rman
        async function wf_l_validate_not_in_progress(lobby_details, req_data, action, req_sock, callback) {
            // Verify the object is not in progress
            if (!lobby_details.in_progress) {
                callback(false, lobby_details, req_data, action, req_sock);
            } else {
                callback(true, "Must be in lobby", lobby_details, req_data, action, req_sock);
            }
        }

        // Name : wf_l_validate_in_progress(lobby_details, req_data, action, req_sock, callback)
        // Desc : validate that the lobby is in_progress
        // Author(s) : RAk3rman
        async function wf_l_validate_in_progress(lobby_details, req_data, action, req_sock, callback) {
            // Verify the object is in progress
            if (lobby_details.in_progress) {
                callback(false, lobby_details, req_data, action, req_sock);
            } else {
                callback(true, "Must be in progress", lobby_details, req_data, action, req_sock);
            }
        }

        // Name : wf_g_validate_not_in_progress(lobby_details, game_pos, req_data, action, req_sock, callback)
        // Desc : validate that the game is not in_progress
        // Author(s) : RAk3rman
        async function wf_g_validate_not_in_progress(lobby_details, game_pos, req_data, action, req_sock, callback) {
            // Verify the object is not in progress
            if (!lobby_details.games[game_pos].in_progress) {
                callback(false, lobby_details, req_data, action, req_sock);
            } else {
                callback(true, "Must be in lobby", lobby_details, game_pos, req_data, action, req_sock);
            }
        }

        // Name : wf_g_validate_in_progress(lobby_details, game_pos, req_data, action, req_sock, callback)
        // Desc : validate that the game is in_progress
        // Author(s) : RAk3rman
        async function wf_g_validate_in_progress(lobby_details, game_pos, req_data, action, req_sock, callback) {
            // Verify the object is in progress
            if (lobby_details.games[game_pos].in_progress) {
                callback(false, lobby_details, game_pos, req_data, action, req_sock);
            } else {
                callback(true, "Must be in progress", lobby_details, game_pos, req_data, action, req_sock);
            }
        }

        // Name : wf_g_validate_turn(lobby_details, game_pos, req_data, action, req_sock, callback)
        // Desc : validate req user is on their turn
        // Author(s) : RAk3rman
        async function wf_g_validate_turn(lobby_details, game_pos, req_data, action, req_sock, callback) {
            // Find player
            if (player_actions.get_turn_plyr_id(lobby_details, game_pos) === req_data.plyr_id) {
                callback(false, lobby_details, game_pos, req_data, action, req_sock);
            } else {
                callback(true, "It is not your turn", lobby_details, game_pos, req_data, action, req_sock);
            }
        }

        // Name : wf_g_validate_lock(lobby_details, game_pos, req_data, action, req_sock, callback)
        // Desc : validate req user is able to draw or play a card
        // Author(s) : RAk3rman
        async function wf_g_validate_lock(lobby_details, game_pos, req_data, action, req_sock, callback) {
            // Find player
            if (!card_lock) {
                card_lock = true;
                callback(false, lobby_details, game_pos, req_data, action, req_sock);
            } else {
                callback(true, "Task pending", lobby_details, game_pos, req_data, action, req_sock);
            }
        }
    })
};
