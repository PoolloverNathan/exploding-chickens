/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/socket-handler.js
Desc     : handles all socket.io actions
           and sends data back to client
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let game = require('../models/game.js');
const chalk = require('chalk');
const wipe = chalk.white;
const moment = require('moment');
const waterfall = require('async-waterfall');

// Services
let card_actions = require('../services/card-actions.js');
let game_actions = require('../services/game-actions.js');
let player_actions = require('../services/player-actions.js');

// Export to app.js file
module.exports = function (fastify, stats_storage, config_storage, bot) {
    stats_storage.set('sockets_active', 0);
    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Successfully opened socket.io connection`));

    // Name : socket.on.connection
    // Desc : runs when a new connection is created through socket.io
    // Author(s) : RAk3rman
    fastify.io.on('connection', function (socket) {
        console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.green('new-connection  ')} ` + socket.id ));
        stats_storage.set('sockets_active', stats_storage.get('sockets_active') + 1);
        let player_data = {};
        let draw_cooldown = false;

        // Name : socket.on.player-online
        // Desc : runs when the client receives game data and is hosting a valid player
        // Author(s) : RAk3rman
        socket.on('player-online', async function (data) {
            let action = "player-online   ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to mark existing player as online`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                async function(game_details, req_data, action, socket_id, callback) { // Send game data
                    player_data = req_data;
                    await player_actions.update_connection(req_data.slug, req_data.player_id, "connected");
                    await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                    callback(false, `Player now ${chalk.dim.green('connected')}: ` + req_data.player_id, req_data.slug, action, socket_id);
                }
            ], wf_final_callback);
        })

        // Name : socket.on.retrieve-game
        // Desc : runs when game data is requested from the client
        // Author(s) : RAk3rman
        socket.on('retrieve-game', async function (data) {
            let action = "retrieve-game   ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to retrieve game data`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                async function(game_details, req_data, action, socket_id, callback) { // Send game data
                    await update_game_ui(req_data.slug, socket_id, action, socket_id, "unknown");
                    callback(false, `Successfully retrieved and sent game data`, req_data.slug, action, socket_id);
                }
            ], wf_final_callback);
        })

        // Name : socket.on.create-player
        // Desc : runs when a new player to be created
        // Author(s) : RAk3rman
        socket.on('create-player', async function (data) {
            let action = "create-player   ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to create new player`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                async function(game_details, req_data, action, socket_id, callback) { // Create player
                    if (game_details.players.length >= game_details.player_cap) { // Make sure we aren't over player cap
                        callback(true, `Player cap has been reached`, req_data.slug, action, socket_id);
                    } else { // Add new player
                        let new_player_id = await player_actions.create_player(game_details, req_data.nickname, req_data.avatar);
                        await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, new_player_id)).nickname, "");
                        fastify.io.to(socket_id).emit("player-created", new_player_id);
                        await update_game_ui(req_data.slug, "", action, socket_id, new_player_id);
                        callback(false, `Successfully created new player: ` + new_player_id, req_data.slug, action, socket_id);
                    }
                }
            ], wf_final_callback);
        })

        // Name : socket.on.start-game
        // Desc : runs when the host requests the game to start
        // Author(s) : RAk3rman
        socket.on('start-game', async function (data) {
            let action = "start-game      ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to start game`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                wf_validate_host, // Validate req player is host
                async function(game_details, req_data, action, socket_id, callback) { // Start game if player cap is satisfied
                    if (game_details.players.length > 1 && game_details.players.length <= game_details.player_cap) {
                        game_details.start_time = moment();
                        await game_actions.reset_game(game_details, "playing", "in_game");
                        await player_actions.create_hand(game_details);
                        await player_actions.randomize_seats(game_details);
                        await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
                        await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                        callback(false, `Game has started successfully`, req_data.slug, action, socket_id);
                    } else {
                        callback(true, `You must have 2-` + game_details.player_cap + ` players`, req_data.slug, action, socket_id);
                    }
                }
            ], wf_final_callback);
        })

        // Name : socket.on.reset-game
        // Desc : runs when the host requests the game to reset back to the lobby
        // Author(s) : RAk3rman
        socket.on('reset-game', async function (data) {
            let action = "reset-game      ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to reset game`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                wf_validate_host, // Validate req player is host
                async function(game_details, req_data, action, socket_id, callback) { // Reset game
                    await game_actions.reset_game(game_details, "idle", "in_lobby");
                    await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
                    await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                    callback(false, `Game has been reset successfully`, req_data.slug, action, socket_id);
                }
            ], wf_final_callback);
        })

        // Name : socket.on.play-card
        // Desc : runs when a card is played on the client
        // Author(s) : RAk3rman
        // TODO : Redesign play card structure
        socket.on('play-card', async function (data) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(data.card_id)} Received request to play card for player_id: ` + data.player_id));
            // Verify game exists
            if (await game.exists({ slug: data.slug, "players._id": data.player_id })) {
                // Get game details
                let game_details = await game_actions.game_details_slug(data.slug);
                if (validate_turn(data.player_id, game_details)) {
                    if (game_details.status === "in_game") {
                        // Send card id to router
                        let action_res = await game_actions.base_router(game_details, data.player_id, data.card_id, data.target, stats_storage, config_storage, bot);
                        if (action_res.data === "true") {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(data.card_id)} Card action completed successfully, no callbacks`));
                            // Update clients
                            let card_details = await card_actions.find_card(data.card_id, game_details["cards"]);
                            await game_actions.log_event(game_details, "play-card", card_details.action, card_details._id, (await player_actions.get_player(game_details, data.player_id)).nickname, "");
                            fastify.io.to(socket.id).emit(data.slug + "-play-card", {
                                card: card_details,
                                game_details: await get_game_export(data.slug, "play-card       ", data.player_id)
                            });
                            await update_game_ui(data.slug, "", "play-card       ", socket.id, data.player_id);
                        } else if (action_res.trigger === "seethefuture") {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(action_res.trigger)} Card action completed successfully, seethefuture callback`));
                            // Update clients
                            let card_details = await card_actions.find_card(data.card_id, game_details["cards"]);
                            await game_actions.log_event(game_details, "play-card", card_details.action, card_details._id, (await player_actions.get_player(game_details, data.player_id)).nickname, "");
                            await update_game_ui(data.slug, "", "play-card       ", socket.id, "seethefuture_callback");
                            // Trigger stf callback
                            fastify.io.to(socket.id).emit(data.slug + "-callback", {
                                trigger: "seethefuture",
                                payload: await card_actions.filter_cards("draw_deck", game_details["cards"])
                            });
                        } else if (action_res.trigger === "favor_target") {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(action_res.trigger)} Favor callback, requesting target player`));
                            // Trigger favor_target callback
                            fastify.io.to(socket.id).emit(data.slug + "-callback", {
                                trigger: "favor_target",
                                payload: {
                                    game_details: await get_game_export(data.slug, "play-card       ", data.player_id),
                                    card_id: data.card_id
                                }
                            });
                        } else if (action_res.trigger === "chicken_target") {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(action_res.trigger)} Chicken placement callback, requesting target position`));
                            // Trigger favor_target callback
                            fastify.io.to(socket.id).emit(data.slug + "-callback", {
                                trigger: "chicken_target",
                                payload: {
                                    max_pos: action_res.data["max_pos"],
                                    card_id: action_res.data["card_id"]
                                }
                            });
                        } else if (action_res.trigger === "favor_taken") {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(action_res.trigger)} Favor callback, notifying player of card taken`));
                            // Trigger favor_taken callback
                            let card_details = await card_actions.find_card(data.card_id, game_details["cards"]);
                            await game_actions.log_event(game_details, "play-card", card_details.action, card_details._id, (await player_actions.get_player(game_details, data.player_id)).nickname, data.target !== "" ? (await player_actions.get_player(game_details, data.target)).nickname : "");
                            fastify.io.emit(data.slug + "-callback", {
                                trigger: "favor_taken",
                                payload: {
                                    game_details: await get_game_export(data.slug, "play-card       ", data.player_id),
                                    target_player_id: action_res.data["target_player_id"],
                                    favor_player_name: action_res.data["favor_player_name"],
                                    card_image_loc: action_res.data["card_image_loc"],
                                    used_gator: action_res.data["used_gator"]
                                }
                            });
                        } else if (action_res.trigger === "winner") {
                            // Emit reset game event and winner
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Existing game has ended, a player has won`));
                            await update_game_ui(data.slug, "", "reset-game      ", socket.id, "winner_callback");
                        } else if (action_res.trigger === "error") {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Error while playing card: ` + action_res.data));
                            fastify.io.to(socket.id).emit(data.slug + "-error", action_res.data);
                        } else {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Invalid error when playing card`));
                        }
                    } else {
                        console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Player attempted to play card while game is in lobby`));
                        fastify.io.to(socket.id).emit(data.slug + "-error", "Game has not started");
                    }
                } else {
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Player attempted to play a card when it is not their turn`));
                    fastify.io.to(socket.id).emit(data.slug + "-error", "Please wait your turn");
                }
            } else {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Target game does not exist`));
                fastify.io.to(socket.id).emit(data.slug + "-error", "Game does not exist");
            }
        })

        // Name : socket.on.draw-card
        // Desc : runs when a card is drawn on the client
        // Author(s) : RAk3rman
        socket.on('draw-card', async function (data) {
            let action = "draw-card       ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to draw card`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                wf_validate_in_game, // Validate we are in game
                wf_validate_turn, // Validate it is req player's turn
                async function(game_details, req_data, action, socket_id, callback) { // Verify player isn't exploding
                    for (let i = 0; i < game_details.players.length; i++) {
                        if (game_details.players[i]._id === req_data.player_id) {
                            if (game_details.players[i].status !== "exploding") {
                                callback(false, game_details, req_data, action, socket_id);
                            } else {
                                callback(true, `You cannot draw a card now`, req_data.slug, action, socket_id);
                            }
                        }
                    }
                },
                async function(game_details, req_data, action, socket_id, callback) { // Draw card
                    if (!draw_cooldown) {
                        // Handle draw cooldown
                        draw_cooldown = true;
                        setTimeout( function () {draw_cooldown = false}, 300);
                        // Draw card from draw deck and check if it is a chicken
                        let card_drawn = await game_actions.draw_card(game_details, data.player_id, "top");
                        if (card_drawn.action !== "chicken") {
                            await game_actions.advance_turn(game_details);
                        }
                        await game_actions.log_event(game_details, action.trim(), card_drawn.action, card_drawn._id, (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
                        await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                        fastify.io.to(socket_id).emit(req_data.slug + "-draw-card", card_drawn);
                        callback(false, `${chalk.dim.magenta(card_drawn._id)} Drew new card for player: ` + req_data.player_id, req_data.slug, action, socket_id);
                    } else {
                        callback(true, `You cannot draw a card now`, req_data.slug, action, socket_id);
                    }
                }
            ], wf_final_callback);
        })

        // Name : socket.on.kick-player
        // Desc : kicks a target player from a game
        // Author(s) : RAk3rman
        socket.on('kick-player', async function (data) {
            let action = "kick-player     ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to kick player`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                wf_validate_host, // Validate req player is host
                async function(game_details, req_data, action, socket_id, callback) { // Kick player
                    await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, req_data.player_id)).nickname, (await player_actions.get_player(game_details, req_data.kick_player_id)).nickname);
                    await player_actions.kick_player(game_details, req_data.player_id, req_data.kick_player_id);
                    await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                    callback(false, `Successfully kicked player: ` + req_data.kick_player_id, req_data.slug, action, socket_id);
                }
            ], wf_final_callback);
        })

        // Name : socket.on.make-host
        // Desc : makes a new player the host
        // Author(s) : RAk3rman
        socket.on('make-host', async function (data) {
            let action = "make-host       ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to transfer host role`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                wf_validate_host, // Validate req player is host
                async function(game_details, req_data, action, socket_id, callback) { // Make host
                    await player_actions.make_host(game_details, req_data.player_id, req_data.suc_player_id);
                    await game_actions.log_event(game_details, action.trim(), "", "", (await player_actions.get_player(game_details, req_data.player_id)).nickname, (await player_actions.get_player(game_details, req_data.suc_player_id)).nickname);
                    await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                    callback(false, `Successfully transferred host role from: ` + req_data.player_id + ` -> ` + req_data.suc_player_id, req_data.slug, action, socket_id);
                }
            ], wf_final_callback);
        })

        // Name : socket.on.import-pack
        // Desc : imports a new pack into a game
        // Author(s) : RAk3rman
        socket.on('import-pack', async function (data) {
            let action = "import-pack     ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to import card pack`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                wf_validate_host, // Validate req player is host
                wf_validate_in_lobby, // Validate we are in lobby
                async function(game_details, req_data, action, socket_id, callback) { // Verify pack isn't imported already
                    if (!game_details.imported_packs.includes(req_data.pack_name)) {
                        callback(false, game_details, req_data, action, socket_id);
                    } else {
                        callback(true, `Pack has already been imported`, req_data.slug, action, socket_id);
                    }
                },
                async function(game_details, req_data, action, socket_id, callback) { // Make sure pack exists
                    if (req_data.pack_name === "yolking_around") {
                        game_details.player_cap += 2;
                        callback(false, game_details, req_data, action, socket_id);
                    } else {
                        callback(true, `Pack does not exist`, req_data.slug, action, socket_id);
                    }
                },
                async function(game_details, req_data, action, socket_id, callback) { // Import card pack
                    await game_actions.import_cards(game_details, req_data.pack_name);
                    await game_actions.log_event(game_details, action.trim(), "", req_data.pack_name, (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
                    await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                    callback(false, `Imported new card pack: ` + req_data.pack_name, req_data.slug, action, socket_id);
                }
            ], wf_final_callback);
        })

        // Name : socket.on.export-pack
        // Desc : exports a new pack from a game
        // Author(s) : RAk3rman
        socket.on('export-pack', async function (data) {
            let action = "export-pack     ";
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to export card pack`));
            waterfall([
                async function(callback) {callback(null, data, action, socket.id)}, // Start waterfall
                wf_get_game, // Get game_details
                wf_validate_host, // Validate req player is host
                wf_validate_in_lobby, // Validate we are in lobby
                async function(game_details, req_data, action, socket_id, callback) { // Verify pack was imported already
                    if (game_details.imported_packs.includes(req_data.pack_name)) {
                        callback(false, game_details, req_data, action, socket_id);
                    } else {
                        callback(true, `Pack was never imported`, req_data.slug, action, socket_id);
                    }
                },
                async function(game_details, req_data, action, socket_id, callback) { // Make sure pack exists
                    if (req_data.pack_name === "yolking_around") {
                        game_details.player_cap -= 2;
                        callback(false, game_details, req_data, action, socket_id);
                    } else {
                        callback(true, `Pack does not exist`, req_data.slug, action, socket_id);
                    }
                },
                async function(game_details, req_data, action, socket_id, callback) { // Export card pack
                    await game_actions.export_cards(game_details, req_data.pack_name);
                    await game_actions.log_event(game_details, action.trim(), "", req_data.pack_name, (await player_actions.get_player(game_details, req_data.player_id)).nickname, "");
                    await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                    callback(false, `Imported new card pack: ` + req_data.pack_name, req_data.slug, action, socket_id);
                }
            ], wf_final_callback);
        })

        // Name : socket.on.explode-tick
        // Desc : rebroadcasts tick for exploding player
        // Author(s) : RAk3rman
        socket.on('explode-tick', async function (data) {
            fastify.io.emit(data.slug + "-explode-tick", {
                count: data.count,
                placed_by_name: data.placed_by_name,
                card_url: data.card_url
            });
        });

        // Name : socket.on.check-slug
        // Desc : runs when we need to see if a slug exists in the db
        // Author(s) : RAk3rman
        socket.on('check-slug', async function (data) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-slug      ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to verify game slug`));
            // Check to see if game exists
            if (await game.exists({ slug: data.slug })) {
                fastify.io.to(socket.id).emit("slug-response", data.slug);
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-slug      ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Game slug is ${chalk.dim.green('valid')}`));
            } else {
                fastify.io.to(socket.id).emit("slug-response", false);
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('check-slug      ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Game slug is ${chalk.dim.red('invalid')}`));
            }
        })

        // Name : socket.on.disconnect
        // Desc : runs when the client disconnects
        // Author(s) : RAk3rman
        socket.on('disconnect', async function () {
            stats_storage.set('sockets_active', stats_storage.get('sockets_active') - 1);
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.red('new-disconnect  ')} ` + socket.id));
            // Mark player as disconnected if active
            if (await game.exists({ slug: player_data["slug"] }) && player_data["player_id"] !== "") {
                // Update connection and local player data
                await player_actions.update_connection(player_data["slug"], player_data["player_id"], "offline");
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.red('player-offline  ')} ` + socket.id + ` ${chalk.dim.yellow(player_data["slug"])} Player now ${chalk.dim.red('offline')} with player_id:` + player_data["player_id"]));
                // Update clients
                await update_game_ui(player_data["slug"], "", "player-offline  ", socket.id, player_data["player_id"]);
            }
        });
    })

    // Name : wf_final_callback(err, msg, slug, action, socket_id)
    // Desc : final callback from waterfall, handles error if triggered
    // Author(s) : RAk3rman
    async function wf_final_callback(err, msg, slug, action, socket_id) {
        if (err) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket_id + ` ${chalk.dim.yellow(slug)} ` + msg));
            fastify.io.to(socket_id).emit(slug + "-error", msg);
        } else {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(action)} ` + socket_id + ` ${chalk.dim.yellow(slug)} ` + msg));
        }
    }

    // Name : wf_get_game(req_data, action, socket_id, callback)
    // Desc : get game details from waterfall
    // Author(s) : RAk3rman
    async function wf_get_game(req_data, action, socket_id, callback) {
        // Determine if we should filter by slug and player_id
        let filter = req_data.player_id === undefined ? { slug: req_data.slug } : { slug: req_data.slug, "players._id": req_data.player_id };
        // Determine if game exists
        if (await game.exists(filter)) {
            callback(false, await game_actions.game_details_slug(req_data.slug), req_data, action, socket_id);
        } else {
            callback(true, "Game does not exist", req_data.slug, action, socket_id);
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
                    callback(true, "You are not the host", req_data.slug, action, socket_id);
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
            callback(true, "Game must be stopped first", req_data.slug, action, socket_id);
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
            callback(true, "Game must be started first", req_data.slug, action, socket_id);
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
                    callback(true, "It is not your turn", req_data.slug, action, socket_id);
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

    // Name : update_game_ui(slug, target, source, socket_id)
    // Desc : sends an event containing game data
    // Author(s) : RAk3rman
    async function update_game_ui(slug, target, source, socket_id, player_id) {
        // Get raw pretty game details
        let pretty_game_details = await get_game_export(slug, source, player_id);
        if (pretty_game_details !== {}) {
            // Send game data
            if (target === "") {
                fastify.io.emit(slug + "-update", pretty_game_details);
            } else {
                fastify.io.to(target).emit(slug + "-update", pretty_game_details);
            }
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(source)} ` + socket_id + ` ${chalk.dim.yellow(slug)} Emitted game update event`));
        } else {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(source)} ` + socket_id + ` ${chalk.dim.yellow(slug)} Target game does not exist`));
        }
    }

    // Name : get_game_export(slug, source, player_id)
    // Desc : prepares game data for export to client
    // Author(s) : RAk3rman
    async function get_game_export(slug, source, player_id) {
        // Get raw game details from mongodb
        let raw_game_details = await game_actions.game_details_slug(slug);
        if (raw_game_details !== null) {
            // Determine number of exploding chickens
            let ec_count = 0;
            for (let i = 0; i < raw_game_details["cards"].length; i++) {
                // If the card is assigned to deck, add to count
                if (raw_game_details["cards"][i].action === "chicken" && raw_game_details["cards"][i].assignment === "draw_deck") {
                    ec_count += 1;
                }
            }
            // Prepare draw deck
            let draw_deck = await card_actions.filter_cards("draw_deck", raw_game_details["cards"]);
            // Check if placed_by is active
            let placed_by_name = "";
            for (let i = 0; i < raw_game_details["cards"].length; i++) {
                if (raw_game_details["cards"][i].placed_by_id !== "" && raw_game_details["cards"][i].assignment !== "out_of_play") {
                    // Go through players and find nickname
                    for (let j = 0; j < raw_game_details["players"].length; j++) {
                        if (raw_game_details["cards"][i].placed_by_id === raw_game_details["players"][j]._id) {
                            placed_by_name = raw_game_details["players"][j].nickname;
                            break;
                        }
                    }
                    break;
                }
            }
            // Prepare events payload
            let parsed_events = [];
            for (let i = raw_game_details["events"].length - 1; i >= 0 && i >= (raw_game_details["events"].length - 20); i--) {
                parsed_events.push(await parse_event(raw_game_details, raw_game_details["events"][i]));
            }
            // Prepare pretty game details
            let pretty_game_details = {
                players: [],
                discard_deck: [],
                slug: raw_game_details["slug"],
                created: moment(raw_game_details["created"]),
                status: raw_game_details["status"],
                seat_playing: raw_game_details["seat_playing"],
                turn_direction: raw_game_details["turn_direction"],
                turns_remaining: raw_game_details["turns_remaining"],
                cards_remaining: draw_deck.length,
                ec_remaining: ec_count,
                req_player_id: player_id,
                trigger: source.trim(),
                placed_by_name: placed_by_name,
                imported_packs: raw_game_details["imported_packs"],
                player_cap: raw_game_details["player_cap"],
                events: parsed_events
            }
            // Sort and add players to json array
            raw_game_details["players"].sort(function(a, b) {
                return a.seat - b.seat;
            });
            // Loop through each player
            for (let i = 0; i < raw_game_details["players"].length; i++) {
                let card_array = await card_actions.filter_cards(raw_game_details["players"][i]._id, raw_game_details["cards"]);
                // Sort card hand in reverse order
                card_array.sort(function(a, b) {
                    return b.position - a.position;
                });
                // Found current player, return extended details
                pretty_game_details.players.push({
                    _id: raw_game_details["players"][i]._id,
                    cards: card_array,
                    card_num: card_array.length,
                    avatar: raw_game_details["players"][i].avatar,
                    type: raw_game_details["players"][i].type,
                    status: raw_game_details["players"][i].status,
                    connection: raw_game_details["players"][i].connection,
                    nickname: raw_game_details["players"][i].nickname,
                    seat: raw_game_details["players"][i].seat,
                    wins: raw_game_details["players"][i].wins
                });
            }
            // Get discard deck
            pretty_game_details.discard_deck = await card_actions.filter_cards("discard_deck", raw_game_details["cards"]);
            // Send game data
            return pretty_game_details;
        } else {
            return {};
        }
    }

    // Name : parse_event(game_details, event_obj)
    // Desc : parses an event into readable html
    // Author(s) : RAk3rman
    async function parse_event(game_details, event_obj) {
        if (event_obj.event_name === "create-player") {
            return {
                icon_path: "<path d=\"M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z\"/>",
                icon_color: "text-purple-500",
                desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> joined the lobby",
                created: moment(event_obj.created).format()
            };
        } else if (event_obj.event_name === "start-game") {
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-green-500",
                desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> started the game",
                created: moment(event_obj.created).format()
            };
        } else if (event_obj.event_name === "reset-game") {
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-yellow-400",
                desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> reset the game",
                created: moment(event_obj.created).format()
            };
        } else if (event_obj.event_name === "play-card") {
            let desc = "";
            // Determine which card was played
            if (event_obj.card_action === "attack") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> played an attack card";
            } else if (event_obj.card_action === "chicken") {
                return {
                    icon_path: "<path fill-rule=\"evenodd\" d=\"M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z\" clip-rule=\"evenodd\"/>",
                    icon_color: "text-red-500",
                    desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> exploded",
                    created: moment(event_obj.created).format()
                };
            } else if (event_obj.card_action === "defuse") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> played a defuse card";
            } else if (event_obj.card_action === "favor" || event_obj.card_action === "randchick-1" || event_obj.card_action === "randchick-2" ||
                event_obj.card_action === "randchick-3" || event_obj.card_action === "randchick-4" || event_obj.card_action === "favorgator") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> asked for a favor from <strong class=\"text-gray-700\">" + event_obj.target_player + "</strong>";
            } else if (event_obj.card_action === "reverse") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> played a reverse card";
            } else if (event_obj.card_action === "seethefuture") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> saw the future";
            } else if (event_obj.card_action === "shuffle") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> shuffled the deck";
            } else if (event_obj.card_action === "skip") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> skipped their turn";
            } else if (event_obj.card_action === "hotpotato") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> used a hot potato";
            } else if (event_obj.card_action === "scrambledeggs") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> scrambled all hands in play";
            } else if (event_obj.card_action === "superskip") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> used a super skip";
            } else if (event_obj.card_action === "safetydraw") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> played a safety draw card";
            } else if (event_obj.card_action === "drawbottom") {
                desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> drew from the bottom";
            }
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-blue-500",
                desc: desc,
                created: moment(event_obj.created).format()
            };
        } else if (event_obj.event_name === "draw-card") {
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z\" clip-rule=\"evenodd\"/>\n" +
                    "            <path fill-rule=\"evenodd\" d=\"M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-green-500",
                desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> drew a new card",
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
                icon_path: "<path fill-rule=\"evenodd\" d=\"M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm1 8a1 1 0 100 2h6a1 1 0 100-2H7z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-red-500",
                desc: "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> removed the <strong class=\"text-gray-700\">" + event_obj.card_action + "</strong> card pack",
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
};
