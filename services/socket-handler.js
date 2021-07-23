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
                    await update_game_ui(req_data.slug, "", action, socket_id, "unknown");
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
                    await update_game_ui(req_data.slug, "", action, socket_id, req_data.player_id);
                    callback(false, `Game has been reset successfully`, req_data.slug, action, socket_id);
                }
            ], wf_final_callback);
        })

        // Name : socket.on.play-card
        // Desc : runs when a card is played on the client
        // Author(s) : RAk3rman
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
                            fastify.io.to(socket.id).emit(data.slug + "-play-card", {
                                card: await card_actions.find_card(data.card_id, game_details["cards"]),
                                game_details: await get_game_export(data.slug, "play-card       ", data.player_id)
                            });
                            await update_game_ui(data.slug, "", "play-card       ", socket.id, data.player_id);
                        } else if (action_res.trigger === "seethefuture") {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(action_res.trigger)} Card action completed successfully, seethefuture callback`));
                            // Update clients
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
        let cooldown = true;
        socket.on('draw-card', async function (data) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('draw-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to draw a card for player_id: ` + data.player_id));
            // Verify game exists
            if (await game.exists({ slug: data.slug, "players._id": data.player_id })) {
                // Get game details
                let game_details = await game_actions.game_details_slug(data.slug);
                if (validate_turn(data.player_id, game_details) && !validate_explode(data.player_id, game_details) && cooldown) {
                    cooldown = false;
                    setTimeout( function () {cooldown = true}, 300);
                    if (game_details.status === "in_game") {
                        // Draw card from draw deck and place in hand
                        let card_drawn = await game_actions.draw_card(game_details, data.player_id, "top");
                        // Check if card drawn in an ec
                        if (card_drawn.action !== "chicken") {
                            await game_actions.advance_turn(game_details);
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('draw-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(card_drawn._id)} Drew card and advanced turn`));
                        } else {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('draw-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} ${chalk.dim.magenta(card_drawn._id)} Drew an Exploding Chicken`));
                        }
                        // Update clients
                        await update_game_ui(data.slug, "", "draw-card       ", socket.id, data.player_id);
                        fastify.io.to(socket.id).emit(data.slug + "-draw-card", card_drawn);
                    } else {
                        console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Player attempted to draw a card while game is in lobby`));
                        fastify.io.to(socket.id).emit(data.slug + "-error", "Game has not started");
                    }
                } else {
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('draw-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Player attempted to draw a card when it is not their turn`));
                    fastify.io.to(socket.id).emit(data.slug + "-error", "Please wait your turn");
                }
            } else {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('draw-card       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Target game does not exist`));
                fastify.io.to(socket.id).emit(data.slug + "-error", "Game does not exist");
            }
        })

        // Name : socket.on.kick-player
        // Desc : kicks a target player from a game
        // Author(s) : RAk3rman
        socket.on('kick-player', async function (data) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('kick-player     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to kick player_id: ` + data.kick_player_id));
            // Verify game exists
            if (await game.exists({ slug: data.slug, "players._id": data.player_id })) {
                // Get game details
                let game_details = await game_actions.game_details_slug(data.slug);
                // Verify host
                if (validate_host(data.player_id, game_details)) {
                    // Kick player
                    await player_actions.kick_player(game_details, data.player_id, data.kick_player_id);
                    // Emit reset game event
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('kick-player     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Kicked player_id: ` + data.kick_player_id));
                    await update_game_ui(data.slug, "", "kick-player     ", socket.id, data.player_id);
                } else {
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('kick-player     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Player attempted to complete host action`));
                    fastify.io.to(socket.id).emit(data.slug + "-error", "You are not the host");
                }
            } else {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('kick-player     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Target game does not exist`));
                fastify.io.to(socket.id).emit(data.slug + "-error", "Game does not exist");
            }
        })

        // Name : socket.on.make-host
        // Desc : makes a new player the host
        // Author(s) : RAk3rman
        socket.on('make-host', async function (data) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('make-host       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to transfer host role ` + data.player_id + ` -> ` + data.suc_player_id));
            // Verify game exists
            if (await game.exists({ slug: data.slug, "players._id": data.player_id })) {
                // Get game details
                let game_details = await game_actions.game_details_slug(data.slug);
                // Verify host
                if (validate_host(data.player_id, game_details)) {
                    // Kick player
                    await player_actions.make_host(game_details, data.player_id, data.suc_player_id);
                    // Emit reset game event
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('make-host       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Transferred host role ` + data.player_id + ` -> ` + data.suc_player_id));
                    await update_game_ui(data.slug, "", "make-host       ", socket.id, data.player_id);
                } else {
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('make-host       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Player attempted to complete host action`));
                    fastify.io.to(socket.id).emit(data.slug + "-error", "You are not the host");
                }
            } else {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('make-host       ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Target game does not exist`));
                fastify.io.to(socket.id).emit(data.slug + "-error", "Game does not exist");
            }
        })

        // Name : socket.on.import-pack
        // Desc : imports a new pack into a game
        // Author(s) : RAk3rman
        socket.on('import-pack', async function (data) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('import-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to import card pack: ` + data.pack_name));
            // Verify game exists
            if (await game.exists({ slug: data.slug, "players._id": data.player_id })) {
                // Get game details
                let game_details = await game_actions.game_details_slug(data.slug);
                // Verify host
                if (validate_host(data.player_id, game_details)) {
                    // Verify game is in lobby
                    if (game_details.status === "in_lobby") {
                        // Verify pack isn't installed already
                        if (!game_details.imported_packs.includes(data.pack_name)) {
                            if (data.pack_name === "yolking_around") {
                                game_details.player_cap += 2;
                            } else {
                                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('import-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Pack does not exist`));
                                fastify.io.to(socket.id).emit(data.slug + "-error", "Pack does not exist");
                                return;
                            }
                            // Import pack
                            await game_actions.import_cards(game_details,  data.pack_name);
                            // Emit reset game event
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('import-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Imported card pack: ` + data.pack_name));
                            await update_game_ui(data.slug, "", "import-pack     ", socket.id, data.player_id);
                        } else {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('import-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Pack has already been imported`));
                            fastify.io.to(socket.id).emit(data.slug + "-error", "Pack has already been imported");
                        }
                    } else {
                        console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('import-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Game has already started, packs can only be imported while in lobby`));
                        fastify.io.to(socket.id).emit(data.slug + "-error", "Packs cannot be added now");
                    }
                } else {
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('import-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Player attempted to complete host action`));
                    fastify.io.to(socket.id).emit(data.slug + "-error", "You are not the host");
                }
            } else {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('import-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Target game does not exist`));
                fastify.io.to(socket.id).emit(data.slug + "-error", "Game does not exist");
            }
        })

        // Name : socket.on.export-pack
        // Desc : exports a new pack from a game
        // Author(s) : RAk3rman
        socket.on('export-pack', async function (data) {
            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('export-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Received request to export card pack: ` + data.pack_name));
            // Verify game exists
            if (await game.exists({ slug: data.slug, "players._id": data.player_id })) {
                // Get game details
                let game_details = await game_actions.game_details_slug(data.slug);
                // Verify host
                if (validate_host(data.player_id, game_details)) {
                    // Verify game is in lobby
                    if (game_details.status === "in_lobby") {
                        // Verify pack is installed already
                        if (game_details.imported_packs.includes(data.pack_name)) {
                            if (data.pack_name === "yolking_around") {
                                game_details.player_cap -= 2;
                            } else {
                                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('export-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Pack does not exist`));
                                fastify.io.to(socket.id).emit(data.slug + "-error", "Pack does not exist");
                                return;
                            }
                            // Import pack
                            await game_actions.export_cards(game_details, data.pack_name);
                            // Emit reset game event
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('export-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Exported card pack: ` + data.pack_name));
                            await update_game_ui(data.slug, "", "export-pack     ", socket.id, data.player_id);
                        } else {
                            console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('export-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Pack has not been imported`));
                            fastify.io.to(socket.id).emit(data.slug + "-error", "Pack was never imported");
                        }
                    } else {
                        console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('export-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Game has already started, packs can only be exported while in lobby`));
                        fastify.io.to(socket.id).emit(data.slug + "-error", "Packs cannot be removed now");
                    }
                } else {
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('export-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Player attempted to complete host action`));
                    fastify.io.to(socket.id).emit(data.slug + "-error", "You are not the host");
                }
            } else {
                console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('export-pack     ')} ` + socket.id + ` ${chalk.dim.yellow(data.slug)} Target game does not exist`));
                fastify.io.to(socket.id).emit(data.slug + "-error", "Game does not exist");
            }
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
            //Check to see if game exists
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

    // Name : validate_host(player_id, game_details)
    // Desc : returns a bool stating if the player_id is a host
    // Author(s) : RAk3rman
    function validate_host(player_id, game_details) {
        // Find player
        for (let i = 0; i < game_details.players.length; i++) {
            if (game_details.players[i]._id === player_id) {
                return game_details.players[i].type === "host";
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

    // Name : validate_explode(player_id, game_details)
    // Desc : returns a bool stating if the player is exploding
    // Author(s) : RAk3rman
    function validate_explode(player_id, game_details) {
        // Find player
        for (let i = 0; i < game_details.players.length; i++) {
            if (game_details.players[i]._id === player_id) {
                return game_details.players[i].status === "exploding";
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
                player_cap: raw_game_details["player_cap"]
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
};
