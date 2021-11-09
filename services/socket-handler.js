/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/socket-handler.js
Desc     : handles all socket.io actions
           and sends data back to client
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let lobby = require('../models/lobby.js');
let game = require('../models/game.js');
const chalk = require('chalk');
const wipe = chalk.white;
const moment = require('moment');
const waterfall = require('async-waterfall');
const Filter = require('bad-words'), filter = new Filter();

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');

// Export to app.js file
module.exports = function (fastify, stats_storage, config_storage, bot) {
    stats_storage.set('sockets_active', 0);
    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Successfully opened socket.io connection`));

    // Name : socket.on.connection
    // Desc : runs when a new connection is created through socket.io
    // Author(s) : RAk3rman
    fastify.io.on('connection', function (socket) {
        console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.green('new-connection  ')} ${chalk.dim.blue(socket.id)}`));
        stats_storage.set('sockets_active', stats_storage.get('sockets_active') + 1);
        let player_data = {};
        let draw_cooldown = false;

        // Name : socket.on.player-online
        // Desc : runs when the client receives game data and is hosting a valid player
        // Author(s) : RAk3rman
        socket.on('player-online', async function (data) {
            let action = "player-online   ";
            if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to mark existing player as online`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_lobby, // Get lobby_details
                async function(lobby_details, req_data, action, socket_id, callback) { // Send game data
                    player_data = req_data;
                    await player_actions.update_sockets_open(lobby_details, req_data.player_id, "inc");
                    await lobby_details.save();
                    await update_lobby_ui(lobby_details, "", action, socket_id, req_data.player_id);
                    callback(false, `Player now ${chalk.dim.green('connected')}`, req_data.slug, action, socket_id, req_data.player_id);
                }
            ], wf_final_lobby_callback);
        })

        // Name : socket.on.retrieve-lobby
        // Desc : runs when lobby data is requested from the client
        // Author(s) : RAk3rman
        socket.on('retrieve-lobby', async function (data) {
            let action = "retrieve-lobby  ";
            if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to retrieve lobby data`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_lobby, // Get lobby_details
                async function(lobby_details, req_data, action, socket_id, callback) { // Send lobby data
                    await update_lobby_ui(lobby_details, socket_id, action, socket_id, req_data.player_id);
                    callback(false, `Retrieved and sent lobby data`, req_data.slug, action, socket_id, req_data.player_id);
                }
            ], wf_final_lobby_callback);
        })

        // Name : socket.on.retrieve-game
        // Desc : runs when game data is requested from the client
        // Author(s) : RAk3rman
        socket.on('retrieve-game', async function (data) {
            let action = "retrieve-game   ";
            if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to retrieve game data`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                async function(game_details, req_data, action, socket_id, callback) { // Send game data
                    await update_game_ui(req_data.slug, socket_id, action, socket_id, req_data.player_id);
                    callback(false, `Retrieved and sent game data`, req_data.slug, action, socket_id, req_data.player_id);
                }
            ], wf_final_game_callback);
        })

        // Name : socket.on.create-player
        // Desc : runs when a new player to be created
        // Author(s) : RAk3rman
        socket.on('create-player', async function (data) {
            let action = "create-player   ";
            if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to create new player`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_lobby, // Get lobby_details
                async function(lobby_details, req_data, action, socket_id, callback) { // Validation checks
                    let options = ["bear.png", "bull.png", "cat.png", "dog.png", "elephant.png", "flamingo.png", "fox.png", "lion.png", "mandrill.png", "meerkat.png", "monkey.png", "panda.png", "puma.png", "raccoon.png", "wolf.png"];
                    if (req_data.nickname === "" || !/^[a-zA-Z]/.test(req_data.nickname) || req_data.nickname.length > 12 || filter.isProfane(req_data.nickname)) { // Make sure nickname matches filters
                        callback(true, `PLYR-NAME`, req_data.slug, action, socket_id, req_data.player_id);
                    } else if (req_data.avatar === "default.png" && options.includes(req_data.avatar)) { // Make sure a valid avatar was chosen
                        callback(true, `PLYR-AVTR`, req_data.slug, action, socket_id, req_data.player_id);
                    } else {
                        callback(false, lobby_details, req_data, action, socket_id);
                    }
                },
                async function(lobby_details, req_data, action, socket_id, callback) { // Create player
                    let new_player_id = await player_actions.create_player(lobby_details, req_data.nickname, req_data.avatar);
                    await event_actions.log_event(lobby_details, action.trim(), new_player_id, "", "");
                    await lobby_actions.partition_players(lobby_details);
                    await lobby_details.save();
                    fastify.io.to(socket_id).emit("player-created", new_player_id);
                    await update_lobby_ui(lobby_details, "", action, socket_id, new_player_id);
                    callback(false, `Created new player`, req_data.slug, action, socket_id, new_player_id);
                }
            ], wf_final_lobby_callback);
        })

        // // Name : socket.on.start-game
        // // Desc : runs when the host requests the game to start
        // // Author(s) : RAk3rman
        // socket.on('start-game', async function (data) {
        //     let action = "start-game      ";
        //     if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to start game`));
        //     waterfall([
        //         async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
        //         wf_get_game, // Get game_details
        //         wf_validate_host, // Validate req player is host
        //         async function(game_details, req_data, action, socket_id, callback) { // Start game if player cap is satisfied
        //             if (game_details.players.length > 1 && game_details.players.length <= game_details.player_cap) {
        //                 game_details.start_time = moment();
        //                 await game_actions.reset_game(game_details, "playing", "in_game");
        //                 await player_actions.create_hand(game_details);
        //                 await player_actions.randomize_seats(game_details);
        //                 await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
        //                 await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
        //                 callback(false, `Game has been started`, req_data.slug, action, socket_id, req_data.player_id);
        //             } else {
        //                 callback(true, `You must have 2-` + game_details.player_cap + ` players`, req_data.slug, action, socket_id, req_data.player_id);
        //             }
        //         }
        //     ], wf_final_game_callback);
        // })
        //
        // // Name : socket.on.reset-game
        // // Desc : runs when the host requests the game to reset back to the lobby
        // // Author(s) : RAk3rman
        // socket.on('reset-game', async function (data) {
        //     let action = "reset-game      ";
        //     if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to reset game`));
        //     waterfall([
        //         async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
        //         wf_get_game, // Get game_details
        //         wf_validate_host, // Validate req player is host
        //         async function(game_details, req_data, action, socket_id, callback) { // Reset game
        //             await game_actions.reset_game(game_details, "idle", "in_lobby");
        //             await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
        //             await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
        //             callback(false, `Game has been reset`, req_data.slug, action, socket_id, req_data.player_id);
        //         }
        //     ], wf_final_game_callback);
        // })
        //
        // // Name : socket.on.play-card
        // // Desc : runs when a card is played on the client
        // // Author(s) : RAk3rman
        // // TODO : Redesign play card structure
        // socket.on('play-card', async function (data) {
        //     if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} ${chalk.dim.green(data.card_id)} Received request to play card`));
        //     // Verify game exists
        //     if (await game.exists({ slug: data.slug, "players._id": data.player_id })) {
        //         // Get game details
        //         let game_details = await game_actions.game_details_slug(data.slug);
        //         if (validate_turn(data.player_id, game_details)) {
        //             if (game_details.status === "in_game") {
        //                 // Send card id to router
        //                 let action_res = await game_actions.base_router(game_details, data.player_id, data.card_id, data.target, stats_storage, config_storage, bot, socket.id, fastify);
        //                 if (action_res.data === "true") {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} ${chalk.dim.greenBright(data.card_id)} Card action completed, no callbacks`));
        //                     // Update clients
        //                     let card_details = await card_actions.find_card(data.card_id, game_details["cards"]);
        //                     await game_actions.log_event(game_details, "play-card", card_details.action, card_details._id, (await player_actions.get_player(game_details, data.player_id)).nickname, "");
        //                     fastify.io.to(socket.id).emit(data.slug + "-play-card", {
        //                         card: card_details,
        //                         game_details: await game_actions.get_game_export(data.slug, "play-card       ", data.player_id)
        //                     });
        //                     await update_game_ui(data.slug, "", "play-card       ", socket.id, data.player_id);
        //                 } else if (action_res.trigger === "seethefuture") {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} ${chalk.dim.greenBright(action_res.trigger)} Card action completed, seethefuture callback`));
        //                     // Update clients
        //                     let card_details = await card_actions.find_card(data.card_id, game_details["cards"]);
        //                     await game_actions.log_event(game_details, "play-card", card_details.action, card_details._id, (await player_actions.get_player(game_details, data.player_id)).nickname, "");
        //                     await update_game_ui(data.slug, "", "play-card       ", socket.id, "seethefuture_callback");
        //                     // Trigger stf callback
        //                     fastify.io.to(socket.id).emit(data.slug + "-callback", {
        //                         trigger: "seethefuture",
        //                         payload: await card_actions.filter_cards("draw_deck", game_details["cards"])
        //                     });
        //                 } else if (action_res.trigger === "favor_target") {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} ${chalk.dim.greenBright(action_res.trigger)} Favor callback, requesting target player`));
        //                     // Trigger favor_target callback
        //                     fastify.io.to(socket.id).emit(data.slug + "-callback", {
        //                         trigger: "favor_target",
        //                         payload: {
        //                             game_details: await game_actions.get_game_export(data.slug, "play-card       ", data.player_id),
        //                             card_id: data.card_id
        //                         }
        //                     });
        //                 } else if (action_res.trigger === "chicken_target") {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} ${chalk.dim.greenBright(action_res.trigger)} Chicken placement callback, requesting target position`));
        //                     // Trigger favor_target callback
        //                     fastify.io.to(socket.id).emit(data.slug + "-callback", {
        //                         trigger: "chicken_target",
        //                         payload: {
        //                             max_pos: action_res.data["max_pos"],
        //                             card_id: action_res.data["card_id"]
        //                         }
        //                     });
        //                 } else if (action_res.trigger === "favor_taken") {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} ${chalk.dim.greenBright(action_res.trigger)} Favor callback, notifying player of card taken`));
        //                     // Trigger favor_taken callback
        //                     let card_details = await card_actions.find_card(data.card_id, game_details["cards"]);
        //                     await game_actions.log_event(game_details, "play-card", card_details.action, card_details._id, (await player_actions.get_player(game_details, data.player_id)).nickname, data.target !== "" ? (await player_actions.get_player(game_details, data.target)).nickname : "");
        //                     fastify.io.emit(data.slug + "-callback", {
        //                         trigger: "favor_taken",
        //                         payload: {
        //                             game_details: await game_actions.get_game_export(data.slug, "play-card       ", data.player_id),
        //                             target_player_id: action_res.data["target_player_id"],
        //                             favor_player_name: action_res.data["favor_player_name"],
        //                             card_image_loc: action_res.data["card_image_loc"],
        //                             used_gator: action_res.data["used_gator"]
        //                         }
        //                     });
        //                 } else if (action_res.trigger === "hotpotato") {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Hot Potato callback`));
        //                     let card_details = await card_actions.find_card(data.card_id, game_details["cards"]);
        //                     await game_actions.log_event(game_details, "play-card", card_details.action, card_details._id, (await player_actions.get_player(game_details, data.player_id)).nickname, "");
        //                     await update_game_ui(data.slug, "", "draw-card", socket.id, data.player_id);
        //                 } else if (action_res.trigger === "drawbottom") {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Draw from the Bottom callback`));
        //                     let card_details = await card_actions.find_card(data.card_id, game_details["cards"]);
        //                     await game_actions.log_event(game_details, "play-card", card_details.action, card_details._id, (await player_actions.get_player(game_details, data.player_id)).nickname, "");
        //                     await update_game_ui(data.slug, "", "play-card", socket.id, "drawbottom");
        //                     fastify.io.to(socket.id).emit(data.slug + "-draw-card", action_res.data);
        //                 } else if (action_res.trigger === "error") {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} ${chalk.dim.red('game-error')} ` + action_res.data));
        //                     fastify.io.to(socket.id).emit(data.slug + "-error", { msg: action_res.data });
        //                 } else {
        //                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Invalid error when playing card`));
        //                 }
        //             } else {
        //                 console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Player attempted to play card while game is in lobby`));
        //                 fastify.io.to(socket.id).emit(data.slug + "-error", { msg: "Game has not started" });
        //             }
        //         } else {
        //             console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Player attempted to play a card when it is not their turn`));
        //             fastify.io.to(socket.id).emit(data.slug + "-error", { msg: "Please wait your turn" });
        //         }
        //     } else {
        //         console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Target game does not exist`));
        //         fastify.io.to(socket.id).emit(data.slug + "-error", { msg: "GAME-DNE" });
        //     }
        // })
        //
        // // Name : socket.on.draw-card
        // // Desc : runs when a card is drawn on the client
        // // Author(s) : RAk3rman
        // socket.on('draw-card', async function (data) {
        //     let action = "draw-card       ";
        //     if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to draw card`));
        //     waterfall([
        //         async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
        //         wf_get_game, // Get game_details
        //         wf_validate_in_game, // Validate we are in game
        //         wf_validate_turn, // Validate it is req player's turn
        //         async function(game_details, req_data, action, socket_id, callback) { // Verify player isn't exploding
        //             for (let i = 0; i < game_details.players.length; i++) {
        //                 if (game_details.players[i]._id === req_data.player_id) {
        //                     if (game_details.players[i].status !== "exploding") {
        //                         callback(false, game_details, req_data, action, socket_id);
        //                     } else {
        //                         callback(true, `You cannot draw a card now`, req_data.slug, action, socket_id, req_data.player_id);
        //                     }
        //                 }
        //             }
        //         },
        //         async function(game_details, req_data, action, socket_id, callback) { // Draw card
        //             if (!draw_cooldown) {
        //                 // Handle draw cooldown
        //                 draw_cooldown = true;
        //                 setTimeout( function () {draw_cooldown = false}, 300);
        //                 // Draw card from draw deck and check if it is a chicken
        //                 let card_drawn = await game_actions.draw_card(game_details, req_data.player_id, "top");
        //                 if (card_drawn.action !== "chicken") await game_actions.advance_turn(game_details);
        //                 await game_actions.log_event(game_details, action.trim(), card_drawn.action, card_drawn._id, (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
        //                 await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
        //                 fastify.io.to(socket_id).emit(req_data.slug + "-draw-card", card_drawn);
        //                 if (card_drawn.action === "chicken") await game_actions.explode_tick(game_details.slug, 15, req_data.player_id, card_drawn._id, "public/cards/base/chicken.png", socket_id, fastify, config_storage, stats_storage, bot);
        //                 callback(false, `${chalk.greenBright(card_drawn._id)} Drew new card`, req_data.slug, action, socket_id, req_data.player_id);
        //             } else {
        //                 callback(true, `You cannot draw a card now`, req_data.slug, action, socket_id, req_data.player_id);
        //             }
        //         }
        //     ], wf_final_game_callback);
        // })
        //
        // // Name : socket.on.kick-player
        // // Desc : kicks a target player from a game
        // // Author(s) : RAk3rman
        // socket.on('kick-player', async function (data) {
        //     let action = "kick-player     ";
        //     if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to kick player`));
        //     waterfall([
        //         async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
        //         wf_get_game, // Get game_details
        //         wf_validate_host, // Validate req player is host
        //         async function(game_details, req_data, action, socket_id, callback) { // Kick player
        //             await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, req_data.player_id)).nickname, (await player_actions.get_player(game_details, req_data.kick_player_id)).nickname);
        //             await player_actions.kick_player(game_details, req_data.player_id, req_data.kick_player_id);
        //             await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
        //             callback(false, `Kicked player: ` + req_data.kick_player_id, req_data.slug, action, socket_id, req_data.player_id);
        //         }
        //     ], wf_final_game_callback);
        // })
        //
        // // Name : socket.on.make-host
        // // Desc : makes a new player the host
        // // Author(s) : RAk3rman
        // socket.on('make-host', async function (data) {
        //     let action = "make-host       ";
        //     if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to transfer host role`));
        //     waterfall([
        //         async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
        //         wf_get_game, // Get game_details
        //         wf_validate_host, // Validate req player is host
        //         async function(game_details, req_data, action, socket_id, callback) { // Make host
        //             await player_actions.make_host(game_details, req_data.player_id, req_data.suc_player_id);
        //             await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, req_data.player_id)).nickname, (await player_actions.get_player(game_details, req_data.suc_player_id)).nickname);
        //             await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
        //             callback(false, `Transferred host role from: ` + req_data.player_id + ` -> ` + req_data.suc_player_id, req_data.slug, action, socket_id, req_data.player_id);
        //         }
        //     ], wf_final_game_callback);
        // })
        //
        // // Name : socket.on.import-pack
        // // Desc : imports a new pack into a game
        // // Author(s) : RAk3rman
        // socket.on('import-pack', async function (data) {
        //     let action = "import-pack     ";
        //     if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to import card pack`));
        //     waterfall([
        //         async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
        //         wf_get_game, // Get game_details
        //         wf_validate_host, // Validate req player is host
        //         wf_validate_in_lobby, // Validate we are in lobby
        //         async function(game_details, req_data, action, socket_id, callback) { // Verify pack isn't imported already
        //             if (!game_details.imported_packs.includes(req_data.pack_name)) {
        //                 callback(false, game_details, req_data, action, socket_id);
        //             } else {
        //                 callback(true, `Pack has already been imported`, req_data.slug, action, socket_id, req_data.player_id);
        //             }
        //         },
        //         async function(game_details, req_data, action, socket_id, callback) { // Make sure pack exists
        //             if (req_data.pack_name === "yolking_around") {
        //                 game_details.player_cap += 2;
        //                 callback(false, game_details, req_data, action, socket_id);
        //             } else {
        //                 callback(true, `Pack does not exist`, req_data.slug, action, socket_id, req_data.player_id);
        //             }
        //         },
        //         async function(game_details, req_data, action, socket_id, callback) { // Import card pack
        //             await game_actions.import_cards(game_details, req_data.pack_name);
        //             await game_actions.log_event(game_details, action.trim(), "", req_data.pack_name, (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
        //             await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
        //             callback(false, `Imported card pack: ` + req_data.pack_name, req_data.slug, action, socket_id, req_data.player_id);
        //         }
        //     ], wf_final_game_callback);
        // })
        //
        // // Name : socket.on.export-pack
        // // Desc : exports a new pack from a game
        // // Author(s) : RAk3rman
        // socket.on('export-pack', async function (data) {
        //     let action = "export-pack     ";
        //     if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to export card pack`));
        //     waterfall([
        //         async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
        //         wf_get_game, // Get game_details
        //         wf_validate_host, // Validate req player is host
        //         wf_validate_in_lobby, // Validate we are in lobby
        //         async function(game_details, req_data, action, socket_id, callback) { // Verify pack was imported already
        //             if (game_details.imported_packs.includes(req_data.pack_name)) {
        //                 callback(false, game_details, req_data, action, socket_id);
        //             } else {
        //                 callback(true, `Pack was never imported`, req_data.slug, action, socket_id, req_data.player_id);
        //             }
        //         },
        //         async function(game_details, req_data, action, socket_id, callback) { // Make sure pack exists
        //             if (req_data.pack_name === "yolking_around") {
        //                 game_details.player_cap -= 2;
        //                 callback(false, game_details, req_data, action, socket_id);
        //             } else {
        //                 callback(true, `Pack does not exist`, req_data.slug, action, socket_id, req_data.player_id);
        //             }
        //         },
        //         async function(game_details, req_data, action, socket_id, callback) { // Export card pack
        //             await game_actions.export_cards(game_details, req_data.pack_name);
        //             await game_actions.log_event(game_details, action.trim(), "", req_data.pack_name, (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
        //             await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
        //             callback(false, `Exported card pack: ` + req_data.pack_name, req_data.slug, action, socket_id, req_data.player_id);
        //         }
        //     ], wf_final_game_callback);
        // })

        // Name : socket.on.check-lobby-slug
        // Desc : runs when we need to see if a slug exists in the db
        // Author(s) : RAk3rman
        socket.on('check-lobby-slug', async function (data) {
            if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-lobby-slug')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Received request to verify lobby slug`));
            // Check to see if game exists
            if (await lobby.exists({ slug: data.slug })) {
                fastify.io.to(socket.id).emit("slug-response", data.slug);
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-lobby-slug')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Lobby slug is ${chalk.dim.green('valid')}`));
            } else {
                fastify.io.to(socket.id).emit("slug-response", false);
                if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-lobby-slug')} ${chalk.dim.yellow(data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(data.player_id)} Lobby slug is ${chalk.dim.red('invalid')}`));
            }
        })

        // Name : socket.on.disconnect
        // Desc : runs when the client disconnects
        // Author(s) : RAk3rman
        socket.on('disconnect', async function () {
            let action = "player-offline  ";
            stats_storage.set('sockets_active', stats_storage.get('sockets_active') - 1);
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.red('new-disconnect  ')} ${chalk.dim.blue(socket.id)}`));
            // Check if active player is using socket
            if (player_data["player_id"] !== undefined) {
                if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(player_data.slug)} ${chalk.dim.blue(socket.id)} ${chalk.dim.magenta(player_data.player_id)} Received request to mark existing player as offline`));
                waterfall([
                    async function(callback) {callback(null, player_data, action, socket.id)}, // Start waterfall
                    wf_get_lobby, // Get lobby_details
                    async function(lobby_details, req_data, action, socket_id, callback) { // Update sockets open
                        player_data = req_data;
                        await player_actions.update_sockets_open(lobby_details, req_data.player_id, "dec");
                        await lobby_details.save();
                        await update_lobby_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                        callback(false, `Player now ${chalk.dim.red('disconnected')}`, req_data.slug, action, socket_id, req_data.player_id);
                    }
                ], wf_final_lobby_callback);
            }
        });
    })

    // Name : wf_final_lobby_callback(err, msg, slug, action, socket_id, player_id)
    // Desc : final callback from waterfall, handles error if triggered
    // Author(s) : RAk3rman
    async function wf_final_lobby_callback(err, msg, slug, action, socket_id, player_id) {
        if (err) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(player_id)} ${chalk.dim.red('lobby-error')} ` + msg));
            fastify.io.to(socket_id).emit(slug + "-lobby-error", {
                msg: msg,
                lobby_details: await lobby_actions.lobby_export(slug, action, player_id)
            });
        } else {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(player_id)} ` + msg));
        }
    }

    // Name : wf_final_game_callback(err, msg, slug, action, socket_id, player_id)
    // Desc : final callback from waterfall, handles error if triggered
    // Author(s) : RAk3rman
    async function wf_final_game_callback(err, msg, slug, action, socket_id, player_id) {
        if (err) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(player_id)} ${chalk.dim.red('game-error')} ` + msg));
            fastify.io.to(socket_id).emit(slug + "-game-error", {
                msg: msg,
                game_details: await game_actions.game_export(slug, action, player_id)
            });
        } else {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(player_id)} ` + msg));
        }
    }

    // Name : wf_get_game(req_data, action, socket_id, callback)
    // Desc : get game details from waterfall
    // Author(s) : RAk3rman
    async function wf_get_game(req_data, action, socket_id, callback) {
        // Determine if we should filter by slug and player_id
        let filter = req_data.player_id === "spectator" ? { slug: req_data.slug } : { slug: req_data.slug, "players._id": req_data.player_id };
        // Determine if game exists
        if (await game.exists(filter)) {
            callback(false, await game_actions.game_details_slug(req_data.slug), req_data, action, socket_id);
        } else {
            callback(true, "GAME-DNE", req_data.slug, action, socket_id, req_data.player_id);
        }
    }

    // Name : wf_get_lobby(req_data, action, socket_id, callback)
    // Desc : get lobby details from waterfall
    // Author(s) : RAk3rman
    async function wf_get_lobby(req_data, action, socket_id, callback) {
        // Determine if we should filter by slug and player_id
        let filter = req_data.player_id === "spectator" ? { slug: req_data.slug } : { slug: req_data.slug, "players._id": req_data.player_id };
        // Determine if lobby exists
        if (await lobby.exists(filter)) {
            callback(false, await lobby_actions.lobby_details_slug(req_data.slug), req_data, action, socket_id);
        } else {
            callback(true, "LOBBY-DNE", req_data.slug, action, socket_id, req_data.player_id);
        }
    }

    // Name : wf_validate_host(game_details, req_data, action, socket_id, callback)
    // Desc : validate req user is host from waterfall
    // Author(s) : RAk3rman
    async function wf_validate_host(game_details, req_data, action, socket_id, callback) {
        // Find player
        for (let i = 0; i < game_details.players.length; i++) {
            if (game_details.players[i]._id === req_data.player_id) {
                // Check if the user is of type host
                if (game_details.players[i].type === "host") {
                    callback(false, game_details, req_data, action, socket_id);
                } else {
                    callback(true, "You are not the host", req_data.slug, action, socket_id, req_data.player_id);
                }
            }
        }
    }

    // Name : player(game_details, req_data, action, socket_id, callback)
    // Desc : validate that the game is in_lobby
    // Author(s) : RAk3rman
    async function wf_validate_in_lobby(game_details, req_data, action, socket_id, callback) {
        // Find player
        if (game_details.status === "in_lobby") {
            callback(false, game_details, req_data, action, socket_id);
        } else {
            callback(true, "Game must be stopped first", req_data.slug, action, socket_id, req_data.player_id);
        }
    }

    // Name : wf_validate_in_game(game_details, req_data, action, socket_id, callback)
    // Desc : validate that the game is in_game
    // Author(s) : RAk3rman
    async function wf_validate_in_game(game_details, req_data, action, socket_id, callback) {
        // Find player
        if (game_details.status === "in_game") {
            callback(false, game_details, req_data, action, socket_id);
        } else {
            callback(true, "Game must be started first", req_data.slug, action, socket_id, req_data.player_id);
        }
    }

    // Name : wf_validate_turn(game_details, req_data, action, socket_id, callback)
    // Desc : validate req user is on their turn
    // Author(s) : RAk3rman
    async function wf_validate_turn(game_details, req_data, action, socket_id, callback) {
        // Find player
        for (let i = 0; i < game_details.players.length; i++) {
            if (game_details.players[i]._id === req_data.player_id) {
                // Check if seat positions match
                if (game_details.players[i].seat === game_details.seat_playing) {
                    callback(false, game_details, req_data, action, socket_id);
                } else {
                    callback(true, "Please wait your turn", req_data.slug, action, socket_id, req_data.player_id);
                }
            }
        }
    }

    // Name : validate_turn(player_id, game_details)
    // Desc : returns a bool stating if the player_id is on its turn
    // Author(s) : RAk3rman
    function validate_turn(player_id, game_details) {
        // Find player
        for (let i = 0; i < game_details.players.length; i++) {
            if (game_details.players[i]._id === player_id) {
                return game_details.players[i].seat === game_details.seat_playing;
            }
        }
    }

    // Name : update_lobby_ui(lobby_details, target, source, socket_id)
    // Desc : sends an event containing lobby data
    // Author(s) : RAk3rman
    async function update_lobby_ui(lobby_details, target, source, socket_id, player_id) {
        // Get raw pretty lobby details
        let pretty_lobby_details = await lobby_actions.lobby_export(lobby_details, source, player_id);
        if (pretty_lobby_details !== {}) {
            // Send lobby data
            if (target === "") {
                fastify.io.emit(lobby_details.slug + "-lobby-update", pretty_lobby_details);
            } else {
                fastify.io.to(target).emit(lobby_details.slug + "-lobby-update", pretty_lobby_details);
            }
            if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(source)} ${chalk.dim.yellow(lobby_details.slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(player_id)} Emitted lobby update event`));
        }
    }

    // Name : update_game_ui(slug, target, source, socket_id)
    // Desc : sends an event containing game data
    // Author(s) : RAk3rman
    async function update_game_ui(slug, target, source, socket_id, player_id) {
        // Get raw pretty game details
        let pretty_game_details = await game_actions.game_export(slug, source, player_id);
        if (pretty_game_details !== {}) {
            // Send game data
            if (target === "") {
                fastify.io.emit(slug + "-update", pretty_game_details);
            } else {
                fastify.io.to(target).emit(slug + "-update", pretty_game_details);
            }
            if (config_storage.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(source)} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(player_id)} Emitted game update event`));
        }
    }
};
