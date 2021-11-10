/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/game-actions.js
Desc     : all actions and helper functions
           related to game play
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let game = require('../models/game.js');
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
let event_actions = require('./event-actions.js');
const {nanoid} = require("nanoid");

// Name : game_actions.create_game(lobby_details)
// Desc : creates a new game
// Author(s) : RAk3rman
exports.create_game = async function (lobby_details) {
    // Push new game into existing lobby
    lobby_details.games.push({
        slug: uniqueNamesGenerator({dictionaries: [adjectives, animals], separator: '-', length: 2})
    });
    return lobby_details.games.length - 1;
}

// Name : game_actions.import_cards(lobby_details, game_pos, pack_name)
// Desc : bulk import cards via json file
// Author(s) : RAk3rman
exports.import_cards = async function (lobby_details, game_pos, pack_name) {
    // Get json array of cards
    let pack_array = require('../packs/' + pack_name + '.json');
    let card_length = lobby_details.games[game_pos].cards.length;
    // Loop through each json value and add card
    for (let i = 1; i <= pack_array.length - 1; i++) {
        lobby_details.games[game_pos].cards.push({
            _id: pack_array[i]._id,
            action: pack_array[i].action,
            pos: i + card_length,
            pack: pack_array[0].pack_name
        });
    }
    // Add pack to array of packs
    lobby_details.packs.push(pack_array[0].pack_name);
}

// Name : game_actions.export_cards(lobby_details, game_pos, pack_name)
// Desc : bulk export cards
// Author(s) : RAk3rman
exports.export_cards = async function (lobby_details, game_pos, pack_name) {
    // Loop through all cards and remove if apart of pack
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i].pack === pack_name) {
            // Remove card
            lobby_details.games[game_pos].cards.splice(i, 1);
            i--;
        }
    }
    //
    // Remove pack from array of packs (if it is there)
    let index = lobby_details.packs.indexOf(pack_name);
    if (index > -1) {
        lobby_details.packs.splice(index, 1);
    }
}

// Name : game_actions.draw_card(game_details, player_id)
// Desc : draw a card from the draw deck and place at the end of a players hand
// Author(s) : Vincent Do, RAk3rman
exports.draw_card = async function (game_details, player_id, location) {
    // Filter draw deck
    let draw_deck = await card_actions.filter_cards("draw_deck", game_details.cards);
    // Filter player hand
    let player_hand = await card_actions.filter_cards(player_id, game_details.cards);
    // Determine if top or bottom
    let pos = draw_deck.length-1;
    if (location === "bottom") {
        pos = 0;
    }
    // Check if new card is a chicken
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        if (game_details.players[i]._id === player_id) {
            if (game_details.players[i].status === "exploding") {
                return { "action": "chicken" };
            } else if (draw_deck[pos].action === "chicken") {
                game_details.players[i].status = "exploding";
            }
            break;
        }
    }
    // Update card
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        if (game_details.cards[i]._id === draw_deck[pos]._id) {
            game_details.cards[i].assignment = player_id;
            game_details.cards[i].position = player_hand.length;
            break;
        }
    }
    // Create new promise to save game
    return await new Promise((resolve, reject) => {
        // Save updated game
        game_details.save({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(draw_deck[pos]);
            }
        });
    });
}

// Name : game_actions.base_router(game_details, player_id, card_id, target, stats_storage, config_storage, bot, socket_id, fastify)
// Desc : base deck - calls the appropriate card function based on card action
// Author(s) : RAk3rman
exports.base_router = async function (game_details, player_id, card_id, target, stats_storage, config_storage, bot, socket_id, fastify) {
    // Find card details from id
    let card_details = await card_actions.find_card(card_id, game_details.cards);
    // Determine which function to run
    if (card_details.action === "attack") {
        await card_actions.attack(game_details);
        await game_actions.discard_card(game_details, card_id);
        stats_storage.set('attacks', stats_storage.get('attacks') + 1);
        return {trigger: "attack", data: "true"};
    } else if (card_details.action === "defuse") {
        let defuse_stat = await card_actions.defuse(game_details, player_id, target, card_id);
        if (defuse_stat === true) {
            await game_actions.discard_card(game_details, card_id);
            await game_actions.advance_turn(game_details);
            stats_storage.set('defuses', stats_storage.get('defuses') + 1);
            return {trigger: "defuse", data: "true"};
        } else {
            return defuse_stat;
        }
    } else if (card_details.action === "favor") { // Favor, expecting target player_id
        let v_favor = await card_actions.verify_favor(game_details, player_id, target);
        if (v_favor === true) {
            await game_actions.discard_card(game_details, card_id);
            let favor_data = await card_actions.ask_favor(game_details, player_id, target, false, stats_storage);
            stats_storage.set('favors', stats_storage.get('favors') + 1);
            return {trigger: "favor_taken", data: {
                target_player_id: favor_data.used_gator ? player_id : target, favor_player_name: favor_data.used_gator ? (await player_actions.get_player(game_details, target)).nickname : (await player_actions.get_player(game_details, player_id)).nickname, card_image_loc: favor_data.card.image_loc, used_gator: favor_data.used_gator
            }};
        } else {
            return v_favor;
        }
    } else if (card_details.action === "randchick-1" || card_details.action === "randchick-2" ||
        card_details.action === "randchick-3" || card_details.action === "randchick-4") { // Favor, expecting target player_id
        let v_double = await card_actions.verify_double(game_details, card_details, player_id, card_id);
        if (v_double !== false) {
            let v_favor = await card_actions.verify_favor(game_details, player_id, target);
            if (v_favor === true) {
                await game_actions.discard_card(game_details, v_double);
                await game_actions.discard_card(game_details, card_id);
                let favor_data = await card_actions.ask_favor(game_details, player_id, target, false, stats_storage);
                stats_storage.set('favors', stats_storage.get('favors') + 1);
                return {trigger: "favor_taken", data: {
                    target_player_id: favor_data.used_gator ? player_id : target, favor_player_name: favor_data.used_gator ? (await player_actions.get_player(game_details, target)).nickname : (await player_actions.get_player(game_details, player_id)).nickname, card_image_loc: favor_data.card.image_loc, used_gator: favor_data.used_gator
                }};
            } else {
                return v_favor;
            }
        } else {
            return {trigger: "error", data: "You must have a card of the same type"};
        }
    } else if (card_details.action === "reverse") {
        await card_actions.reverse(game_details);
        await game_actions.discard_card(game_details, card_id);
        await game_actions.advance_turn(game_details);
        stats_storage.set('reverses', stats_storage.get('reverses') + 1);
        return {trigger: "reverse", data: "true"};
    } else if (card_details.action === "seethefuture") {
        await game_actions.discard_card(game_details, card_id);
        stats_storage.set('see_the_futures', stats_storage.get('see_the_futures') + 1);
        return {trigger: "seethefuture", data: {}};
    } else if (card_details.action === "shuffle") {
        await card_actions.shuffle_draw_deck(game_details);
        await game_actions.discard_card(game_details, card_id);
        stats_storage.set('shuffles', stats_storage.get('shuffles') + 1);
        return {trigger: "shuffle", data: "true"};
    } else if (card_details.action === "skip") {
        await game_actions.discard_card(game_details, card_id);
        await game_actions.advance_turn(game_details);
        stats_storage.set('skips', stats_storage.get('skips') + 1);
        return {trigger: "skip", data: "true"};
    } else if (card_details.action === "hotpotato") {
        let hotpotato_stat = await card_actions.hot_potato(game_details, player_id);
        if (hotpotato_stat.trigger === "success") {
            await game_actions.discard_card(game_details, card_id);
            stats_storage.set('hot_potatoes', stats_storage.get('hot_potatoes') + 1);
            await game_actions.explode_tick(game_details.slug, 15, hotpotato_stat.data.next_player_id, hotpotato_stat.data.chicken_id, "public/cards/yolking_around/hotpotato-1.png", socket_id, fastify, config_storage, stats_storage, bot);
            return {trigger: "hotpotato", data: {}};
        } else {
            return hotpotato_stat;
        }
    } else if (card_details.action === "favorgator") {
        let v_favor = await card_actions.verify_favor(game_details, player_id, target);
        if (v_favor === true) {
            let favor_data = await card_actions.ask_favor(game_details, player_id, target, false, stats_storage);
            await game_actions.discard_card(game_details, card_id);
            stats_storage.set('favors', stats_storage.get('favors') + 1);
            return {trigger: "favor_taken", data: {
                    target_player_id: favor_data.used_gator ? player_id : target, favor_player_name: favor_data.used_gator ? (await player_actions.get_player(game_details, target)).nickname : (await player_actions.get_player(game_details, player_id)).nickname, card_image_loc: favor_data.card.image_loc, used_gator: favor_data.used_gator
                }};
        } else {
            return v_favor;
        }
    } else if (card_details.action === "scrambledeggs") {
        await card_actions.scrambled_eggs(game_details);
        await game_actions.discard_card(game_details, card_id);
        stats_storage.set('scrambled_eggs', stats_storage.get('scrambled_eggs') + 1);
        return {trigger: "scrambledeggs", data: "true"};
    } else if (card_details.action === "superskip") {
        let temp_remain = game_details.turns_remaining;
        game_details.turns_remaining = 1;
        await game_actions.advance_turn(game_details);
        game_details.turns_remaining = temp_remain;
        await game_actions.discard_card(game_details, card_id);
        stats_storage.set('super_skips', stats_storage.get('super_skips') + 1);
        return {trigger: "superskip", data: "true"};
    } else if (card_details.action === "safetydraw") {
        await card_actions.safety_draw(game_details, player_id);
        await game_actions.discard_card(game_details, card_id);
        await game_actions.advance_turn(game_details);
        stats_storage.set('safety_draws', stats_storage.get('safety_draws') + 1);
        return {trigger: "superskip", data: "true"};
    } else if (card_details.action === "drawbottom") {
        // Discard and draw card from draw deck and place in hand
        await game_actions.discard_card(game_details, card_id);
        let card_drawn = await game_actions.draw_card(game_details, player_id, "bottom");
        // Check if card drawn in an ec
        if (card_drawn.action !== "chicken") await game_actions.advance_turn(game_details);
        if (card_drawn.action === "chicken") await game_actions.explode_tick(game_details.slug, 15, player_id, card_drawn._id, "public/cards/base/chicken.png", socket_id, fastify, config_storage, stats_storage, bot);
        stats_storage.set('draw_bottoms', stats_storage.get('draw_bottoms') + 1);
        return {trigger: "drawbottom", data: card_drawn};
    } else {
        // Houston, we have a problem
        return {trigger: "error", data: "Invalid card"};
    }
}

// Name : game_actions.discard_card(game_details, card_id)
// Desc : put a card in discard deck
// Author(s) : RAk3rman
exports.discard_card = async function (game_details, card_id) {
    // Find greatest position in discard deck
    let discard_deck = await card_actions.filter_cards("discard_deck", game_details.cards);
    // Update card details
    let player_id;
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        if (game_details.cards[i]._id === card_id) {
            player_id = game_details.cards[i].assignment;
            game_details.cards[i].assignment = "discard_deck";
            game_details.cards[i].position = discard_deck.length;
            break;
        }
    }
    await player_actions.sort_hand(game_details, player_id);
    // Create new promise for game save
    await new Promise((resolve, reject) => {
        //Save updated game
        game_details.save({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Name : game_actions.advance_turn(game_details)
// Desc : advance to the next turn
// Author(s) : RAk3rman
exports.advance_turn = async function (game_details) {
    // Check how many turns we have left
    if (game_details.turns_remaining <= 1) { // Only one turn left, player seat advances
        // Advance to the next seat
        game_details.seat_playing = await player_actions.next_seat(game_details);
        // Make sure the number of turns remaining is not 0
        game_details.turns_remaining = 1;
    } else { // Multiple turns left, player seat remains the same and turns_remaining decreases by one
        game_details.turns_remaining--;
    }
    // Create new promise to save game
    return await new Promise((resolve, reject) => {
        // Save updated game
        game_details.save({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Name : game_actions.explode_tick(slug, count, player_id, card_id, card_url, socket_id, fastify, config_storage, stats_storage, bot)
// Desc : recursively count down when a player has an EC in their hand
// Author(s) : RAk3rman
exports.explode_tick = async function (slug, count, player_id, card_id, card_url, socket_id, fastify, config_storage, stats_storage, bot) {
    // Get game details
    let game_details = await game_actions.game_details_slug(slug);
    // Check if placed_by is active
    let placed_by_name = "";
    for (let i = 0; i < game_details.cards.length; i++) {
        if (game_details.cards[i].placed_by_id !== "" && game_details.cards[i].assignment !== "out_of_play") {
            // Go through players and find nickname
            for (let j = 0; j < game_details.players.length; j++) {
                if (game_details.cards[i].placed_by_id === game_details.players[j]._id) {
                    placed_by_name = game_details.players[j].nickname;
                    break;
                }
            }
            break;
        }
    }
    // Make sure at least one player is exploding
    for (let i = 0; i < game_details.players.length; i++) {
        if (game_details.players[i]._id === player_id && game_details.players[i].status === "exploding") {
            // Found player and is still exploding
            fastify.io.emit(slug + "-explode-tick", {
                count: count,
                placed_by_name: placed_by_name,
                card_url: card_url
            });
            // Decrement count or force chicken to play
            if (count > -1) {
                count--;
            } else {
                await card_actions.kill_player(game_details, player_id);
                await game_actions.discard_card(game_details, card_id);
                game_details.turns_remaining = 0;
                stats_storage.set('explosions', stats_storage.get('explosions') + 1);
                if (await game_actions.is_winner(game_details, stats_storage, bot) === true) {
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(player_id)} Game has ended, a player has won`));
                    fastify.io.emit(slug + "-update", await game_actions.get_game_export(slug, "reset-game", "winner_callback"));
                } else {
                    console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(player_id)} ${chalk.dim.greenBright(card_id)} Hasta la vista baby, a player has exploded`));
                    await game_actions.advance_turn(game_details);
                    await game_actions.log_event(game_details, "play-card", "chicken", card_id, (await player_actions.get_player(game_details, player_id)).nickname, "");
                    fastify.io.emit(slug + "-update", await game_actions.get_game_export(slug, "play-card", "explosion-callback"));
                }
                return;
            }
            // Call function again
            setTimeout(function(){ game_actions.explode_tick(slug, count, player_id, card_id, card_url, socket_id, fastify, config_storage, stats_storage, bot) }, 1000);
            return;
        }
    }
}

// Name : game_actions.is_winner(game_details, stats_storage, bot)
// Desc : check to see if there is a winner
// Author(s) : RAk3rman
exports.is_winner = async function (game_details, stats_storage, bot) {
    // Count the number of active players
    let ctn = 0;
    let player_id = undefined;
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        if (game_details.players[i].status === "playing") {
            ctn++;
            player_id = game_details.players[i]._id;
        }
    }
    // Determine if there is a winner, end game if so
    if (ctn === 1) {
        // Update stats
        stats_storage.set('games_played', stats_storage.get('games_played') + 1);
        stats_storage.set('mins_played', stats_storage.get('mins_played') + moment().diff(moment(game_details.start_time), 'minutes'));
        // Send message if bot is configured
        if (config_storage.has('discord_bot_token') && config_storage.get('discord_bot_token') !== '' &&
            config_storage.has('discord_bot_channel') && config_storage.get('discord_bot_channel') !== '') {
            // Game completed, update game stats
            let print_players = "";
            let print_packs = "";
            let win_count = 0;
            game_details.players.forEach(ele => {
                print_players += "'" + ele.nickname + "' ";
                win_count += ele.wins;
            });
            game_details.imported_packs.forEach(ele => {
                print_packs += "'" + ele + "' ";
            })
            // Get draw deck length
            let draw_deck = await card_actions.filter_cards("draw_deck", game_details.cards);
            let embed = bot.createEmbed(config_storage.get('discord_bot_channel'));
            embed.title("**:chicken: Exploding Chickens: Game Completed**");
            embed.url("https://chickens.rakerman.com/game/" + game_details.slug);
            embed.color("3447003");
            embed.field("Slug :bug:", game_details.slug + "", true);
            embed.field("Duration :timer:", moment().diff(moment(game_details.start_time), 'minutes') + " minutes", true);
            embed.field("EC chance :fire:", "1 EC / " + draw_deck.length + " cards -> " + Math.floor((1 / (draw_deck.length === 0 ? 1 : draw_deck.length))*100) + "%", true);
            embed.field("Lobby games :receipt:", (win_count + 1) + " played", true);
            embed.field("Connections :link:", stats_storage.get("sockets_active") + " sockets active", true);
            embed.field("Packs :card_box:", print_packs, true);
            embed.field("Players :busts_in_silhouette:", print_players, false);
            embed.footer("Release v" + pkg.version);
            let event = new Date();
            embed.timestamp(event.toISOString());
            embed.send();
            console.log(wipe(`${chalk.bold.blueBright('Discord')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.greenBright('game-won        ')} Sent game summary message`));
        }
        // Log event
        await game_actions.log_event(game_details, "game-won", "", "", (await player_actions.get_player(game_details, player_id)).nickname, "");
        // Reset game
        await game_actions.reset_game(game_details, "idle", "in_lobby");
        // Create new promise to save game
        await new Promise((resolve, reject) => {
            game.findOneAndUpdate(
                { slug: game_details.slug, "players._id": player_id },
                {"$set": { "players.$.status": "winner" }, "$inc": { "players.$.wins": 1 }},
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        })
        return true;
    } else {
        return false;
    }
}

// Name : game_actions.reset_game(game_details, player_status, game_status)
// Desc : resets the game to default
// Author(s) : Vincent Do, RAk3rman
exports.reset_game = async function (game_details, player_status, game_status) {
    // Reset cards
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        game_details.cards[i].assignment = "draw_deck";
        game_details.cards[i].position = i;
        game_details.cards[i].placed_by_id = "";
    }
    // Reset players
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        game_details.players[i].status = player_status;
    }
    // Reset game variables
    game_details.turn_direction = "forward";
    game_details.seat_playing = 0;
    game_details.turns_remaining = 1;
    game_details.status = game_status;
    // Create new promise for game save
    await new Promise((resolve, reject) => {
        //Save updated game
        game_details.save({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Name : game_actions.game_export(lobby_details, game_pos, source, req_player_id)
// Desc : prepares game data for export to client
// Author(s) : RAk3rman
exports.game_export = async function (lobby_details, game_pos, source, req_player_id) {
    // Reference to game details
    let game_details = lobby_details.games[game_pos];
    // Prepare events payload
    let events_payload = [];
    for (let i = game_details.events.length - 1; i >= 0 && i >= (game_details.events.length - 20); i--) {
        events_payload.push(await event_actions.parse_event(lobby_details, game_details.events[i]));
    }
    // Prepare players payload
    let players_payload = [];
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.players[i].game_assign.equals(game_details._id)) {
            players_payload.push(await player_actions.player_export(lobby_details, i));
        }
    }
    // Sort players by seat
    players_payload.sort(function(a, b) {
        return a.seat_pos - b.seat_pos;
    });
    // Determine number of exploding chickens
    let ec_remain = 0;
    for (let i = 0; i < game_details.cards.length; i++) {
        // If the card is assigned to deck, add to count
        if (game_details.cards[i].action === "chicken" && game_details.cards[i].assign === "draw_deck") {
            ec_remain += 1;
        }
    }
    // Prepare draw deck
    let draw_deck = await card_actions.filter_cards("draw_deck", game_details.cards);
    // Prepare discard deck
    let discard_deck = await card_actions.filter_cards("discard_deck", game_details.cards);
    // Return pretty game details
    return {
        slug: game_details.slug,
        in_progress: game_details.in_progress,
        turn_plyr_id: game_details.turn_plyr_id,
        turn_dir: game_details.turn_dir,
        turns_remain: game_details.turns_remain,
        cards_total: game_details.cards.length,
        cards_remain: draw_deck.length,
        ec_remain: ec_remain,
        created: moment(game_details.created),
        players: players_payload,
        events: events_payload,
        discard_deck: discard_deck,
        packs: lobby_details.packs,
        req_player_id: req_player_id,
        trigger: source.trim()
    }
}

// Name : game_actions.delete_game(game_id)
// Desc : deletes a existing game in mongodb, returns game_id
// Author(s) : RAk3rman
exports.delete_game = async function (game_id) {
    // Create new promise and return game_id after deleted
    return await new Promise((resolve, reject) => {
        game.deleteOne({ _id: game_id }, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(game_id);
            }
        });
    });
}

// Name : game_actions.game_purge()
// Desc : deletes all games that are older than the purge age
// Author(s) : RAk3rman
exports.game_purge = async function () {
    // Filter which objects to purge
    try {
        let to_purge = await game.find({ created: { $lte: moment().subtract(config_storage.get('purge_age_hrs'), "hours").toISOString() } });
        to_purge.forEach(ele => {
            // Delete game
            game_actions.delete_game(ele._id).then(() => {
                console.log(wipe(`${chalk.bold.red('Purge')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.yellow(ele.slug)} Deleted game created on ` + moment(ele.created).format('MM/DD/YY-HH:mm:ss')));
            });
        });
    } catch (err) {
        throw new Error(err);
    }
}

