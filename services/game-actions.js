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

//Services
let card_actions = require('../services/card-actions.js');
let game_actions = require('../services/game-actions.js');
let player_actions = require('./player-actions.js');

// Name : game_actions.create_game()
// Desc : creates a new game in mongodb, returns game details
// Author(s) : RAk3rman
exports.create_game = async function () {
    // Create new promise and return created_game after saved
    return await new Promise((resolve, reject) => {
        game.create({
            slug: uniqueNamesGenerator({dictionaries: [adjectives, animals], separator: '-', length: 2})
        }, function (err, created_game) {
            if (err) {
                reject(err);
            } else {
                resolve(created_game);
            }
        });
    });
}

// Name : game_actions.game_details_slug(slug)
// Desc : returns the details for a game slug
// Author(s) : RAk3rman
exports.game_details_slug = async function (slug) {
    // Create new promise and return found_game after saved
    return await new Promise((resolve, reject) => {
        game.findOne({ slug: slug }, function (err, found_game) {
            if (err) {
                reject(err);
            } else {
                resolve(found_game);
            }
        });
    });
}

// Name : game_actions.game_details_id(_id)
// Desc : returns the details for a game id
// Author(s) : RAk3rman
exports.game_details_id = async function (_id) {
    // Create new promise and return found_game after saved
    return await new Promise((resolve, reject) => {
        game.findOne({ _id: _id }, function (err, found_game) {
            if (err) {
                reject(err);
            } else {
                resolve(found_game);
            }
        });
    });
}

// Name : game_actions.import_cards(game_details, pack_name)
// Desc : bulk import cards via json file
// Author(s) : RAk3rman
exports.import_cards = async function (game_details, pack_name) {
    // Get json array of cards
    let pack_array = require('../packs/' + pack_name + '.json');
    let card_length = game_details.cards.length;
    // Loop through each json value and add card
    for (let i = 1; i <= pack_array.length - 1; i++) {
        game_details.cards.push({
            _id: pack_array[i]._id,
            image_loc: "public/cards/" + pack_array[0].pack_name + "/" + pack_array[i].file_name,
            action: pack_array[i].action,
            position: i + card_length,
            pack: pack_array[0].pack_name
        });
    }
    // Add pack to array of imported_packs
    game_details.imported_packs.push(pack_array[0].pack_name);
    // Create new promise
    return await new Promise((resolve, reject) => {
        // Save existing game
        game_details.save(function (err) {
            if (err) {
                reject(err);
            } else {
                // Resolve promise when the last card has been pushed
                resolve(pack_array.length - 1);
            }
        });
    });
}

// Name : game_actions.export_cards(game_details, pack_name)
// Desc : bulk export cards
// Author(s) : RAk3rman
exports.export_cards = async function (game_details, pack_name) {
    // Loop through all cards and remove if apart of pack
    for (let i = 0; i < game_details.cards.length; i++) {
        if (game_details.cards[i].pack === pack_name) {
            // Remove card
            game_details.cards.splice(i, 1);
            i--;
        }
    }
    //
    // Remove pack from array of imported_packs
    let index = game_details.imported_packs.indexOf(pack_name);
    if (index > -1) {
        game_details.imported_packs.splice(index, 1);
    }
    // Create new promise
    return await new Promise((resolve, reject) => {
        // Save existing game
        game_details.save(function (err) {
            if (err) {
                reject(err);
            } else {
                // Resolve promise when the last card has been pushed
                resolve(game_details.cards.length);
            }
        });
    });
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
                print_players += "**'" + ele.nickname + "'** ";
                win_count += ele.wins;
            });
            game_details.imported_packs.forEach(ele => {
                print_packs += "**'" + ele + "'** ";
            })
            // Get draw deck length
            let draw_deck = await card_actions.filter_cards("draw_deck", game_details.cards);
            let embed = bot.createEmbed(config_storage.get('discord_bot_channel'));
            embed.title("**:chicken: Exploding Chickens: Game Completed**");
            embed.url("https://chickens.rakerman.com/game/" + game_details.slug);
            embed.color("3447003");
            embed.field("Slug :bug:", game_details.slug + "", true);
            embed.field("Duration :timer:", moment().diff(moment(game_details.start_time), 'minutes') + " minutes", true);
            embed.field("EC chance :fire:", "1 EC / " + draw_deck.length + " card(s) -> " + Math.floor((1 / (draw_deck.length === 0 ? 1 : draw_deck.length))*100) + "%", true);
            embed.field("Lobby games :receipt:", win_count + " played", true);
            embed.field("Connections :link:", stats_storage.get("sockets_active") + " socket(s) active", true);
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

// Name : game_actions.get_game_export(slug, source, player_id)
// Desc : prepares game data for export to client
// Author(s) : RAk3rman
exports.get_game_export = async function (slug, source, player_id) {
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
        // Prepare events payload
        let parsed_events = [];
        for (let i = raw_game_details["events"].length - 1; i >= 0 && i >= (raw_game_details["events"].length - 20); i--) {
            parsed_events.push(await game_actions.parse_event(raw_game_details, raw_game_details["events"][i]));
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
            imported_packs: raw_game_details["imported_packs"],
            player_cap: raw_game_details["player_cap"],
            events: parsed_events,
            events_length: raw_game_details["events"].length
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

// Name : game_actions.parse_event(game_details, event_obj)
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
            event_obj.card_action === "randchick-3" || event_obj.card_action === "randchick-4") {
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
        } else if (event_obj.card_action === "favorgator") {
            desc = "<strong class=\"text-gray-700\">" + event_obj.req_player + "</strong> used a favor gator on <strong class=\"text-gray-700\">" + event_obj.target_player + "</strong>";
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
// Desc : deletes all games that are over 7 days old
// Author(s) : RAk3rman
exports.game_purge = async function () {
    console.log(wipe(`${chalk.bold.red('Purge')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Purging all games older than ` + config_storage.get('game_purge_age_hrs') + ` hours`));
    await new Promise((resolve, reject) => {
        game.find({}, function (err, found_games) {
            if (err) {
                console.log(wipe(`${chalk.bold.red('Purge')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Could not retrieve games`));
                reject(err);
            } else {
                // Loop through each game
                for (let i = 0; i < found_games.length; i++) {
                    // Determine if the game is more than X hours old
                    if (!moment(found_games[i].created).add(config_storage.get('game_purge_age_hrs'), "hours").isSameOrAfter(moment())) {
                        // Delete game
                        game_actions.delete_game(found_games[i]._id).then(() => {
                            console.log(wipe(`${chalk.bold.red('Purge')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.yellow(found_games[i].slug)} Deleted game created on ` + moment(found_games[i].created).format('MM/DD/YY-HH:mm:ss')));
                        });
                    }
                }
                resolve();
            }
        });
    })
}

// Name : game_actions.log_event(game_details, event_name, card_action, rel_id, req_player, target_player)
// Desc : creates a new event
// Author(s) : RAk3rman
exports.log_event = async function (game_details, event_name, card_action, rel_id, req_player, target_player) {
    game_details.events.push({
        event_name: event_name,
        card_action: card_action,
        rel_id: rel_id,
        req_player: req_player,
        target_player: target_player
    });
    // Create new promise to save game
    return await new Promise((resolve, reject) => {
        // Save updated game
        game_details.save({}, function (err) {
            if (err) {
                reject(err);
            } else {
                // console.log(wipe(`${chalk.bold.green('Event')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('new-event       ')} ${chalk.dim.yellow(game_details.slug)} ${chalk.bold('event_name:')} '` + event_name + `', ${chalk.bold('rel_id:')} '` + rel_id + `', ${chalk.bold('card_action:')} '` + card_action + `', ${chalk.bold('req_player:')} '` + req_player + `', ${chalk.bold('target_player:')} '` + target_player + `'`));
                resolve();
            }
        });
    });
}

