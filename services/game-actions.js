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
const { nanoid } = require("nanoid");

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

// Name : game_actions.get_game_details(lobby_details, game_id)
// Desc : return the details for a target game
// Author(s) : RAk3rman
exports.get_game_details = async function (lobby_details, game_id) {
    // Find game and return details
    for (let i = 0; i < lobby_details.games.length; i++) {
        if (lobby_details.games[i]._id.equals(game_id)) {
            return lobby_details.games[i];
        }
    }
    return null;
}

// Name : game_actions.get_game_pos(lobby_details, game_id)
// Desc : return the details for a target game
// Author(s) : RAk3rman
exports.get_game_pos = async function (lobby_details, game_id) {
    // Find game and return details
    for (let i = 0; i < lobby_details.games.length; i++) {
        if (lobby_details.games[i]._id.equals(game_id)) {
            return i;
        }
    }
    return null;
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
    if (lobby_details.packs.indexOf(pack_array[0].pack_name) === -1) {
        lobby_details.packs.push(pack_array[0].pack_name);
    }
}

// Name : game_actions.export_cards(lobby_details, game_pos, pack_name)
// Desc : bulk export cards
// Author(s) : RAk3rman
exports.export_cards = async function (lobby_details, game_pos, pack_name) {
    // Loop through all cards and remove if a part of pack
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i].pack === pack_name) {
            // Remove card
            lobby_details.games[game_pos].cards.splice(i, 1);
            i--;
        }
    }
    // Remove pack from array of packs
    let index = lobby_details.packs.indexOf(pack_name);
    if (index > -1) {
        lobby_details.packs.splice(index, 1);
    }
}

// Name : game_actions.draw_card(lobby_details, game_pos, plyr_id)
// Desc : draw a card from the draw deck and place at the end of a players hand
// Author(s) : Vincent Do, RAk3rman
exports.draw_card = async function (lobby_details, game_pos, plyr_id) {
    // Filter draw deck
    let draw_deck = await card_actions.filter_cards("draw_deck", lobby_details.games[game_pos].cards);
    // Filter player hand
    let player_hand = await card_actions.filter_cards(plyr_id, lobby_details.games[game_pos].cards);
    // Determine position of drawn card
    let pos = draw_deck.length - 1;
    // Update card
    for (let i = 0; i <= lobby_details.games[game_pos].cards.length - 1; i++) {
        if (lobby_details.games[game_pos].cards[i]._id === draw_deck[pos]._id) {
            lobby_details.games[game_pos].cards[i].assign = plyr_id;
            lobby_details.games[game_pos].cards[i].pos = player_hand.length;
            break;
        }
    }
    // Advance turn if card drawn is not a chicken, then return card_details
    let halt_cards = ["chicken"];
    if (!halt_cards.includes(draw_deck[pos].action)) {
        await game_actions.advance_turn(lobby_details, game_pos);
    }
    // Update event log and return card details
    await event_actions.log_event(lobby_details.games[game_pos], "draw-card", plyr_id, undefined, draw_deck[pos], undefined);
    return draw_deck[pos];
}

// Name : game_actions.draw_card(lobby_details, game_pos, card_id, req_plyr_id, target_player_id)
// Desc : calls the appropriate card function based on card action, returns structured callback to be sent to client
// Author(s) : RAk3rman
exports.play_card = async function (lobby_details, game_pos, card_id, req_plyr_id, target) {
    // Find card details based on card_id
    let card_details = await card_actions.find_card(card_id, lobby_details.games[game_pos].cards);
    // Callback payload data structure
    let callback = {
        err:         undefined,            // If an error is thrown, a string containing the error msg will be contained in this value
        card_id:     card_details._id,    // ID of the card being referenced
        card_action: card_details.action, // Action of the card being referenced
        data:        undefined,            // Optional data sent after a card action is complete (see the future cards, defuse positions, etc...)
        incomplete:  false                // Boolean if we received an incomplete request (still need favor target, waiting for defuse position, etc...)
    };
    // Loop through card actions and call corresponding function, callback modified within card_actions by reference
    // BASE DECK
    if (card_details.action.includes("attack"))             { await card_actions.attack(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action.includes("defuse"))        { await card_actions.defuse(lobby_details, game_pos, card_id, req_plyr_id, target, callback) }
    // else if (card_details.action.includes("favor"))         {  }
    // else if (card_details.action.includes("randchick"))     {  }
    else if (card_details.action.includes("reverse"))       { await card_actions.reverse(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action.includes("seethefuture"))  { await card_actions.seethefuture(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action.includes("shuffle"))        { await card_actions.shuffle(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action.includes("skip"))          { await card_actions.skip(lobby_details, game_pos, card_id, callback); }
    // YOLKING AROUND EXPANSION PACK
    // else if (card_details.action.includes("hotpotato"))     {  }
    // else if (card_details.action.includes("favorgator"))    {  }
    // else if (card_details.action.includes("scrambledeggs")) { await card_actions.scrambled_eggs(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action.includes("superskip"))     { await card_actions.super_skip(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action.includes("safetydraw"))    { await card_actions.safety_draw(lobby_details, game_pos, card_id, req_plyr_id, callback) }
    else if (card_details.action.includes("drawbottom"))    { await card_actions.draw_bottom(lobby_details, game_pos, card_id, req_plyr_id, callback) }
    else { callback.err = "Invalid card action"; }
    // Check if callback was successful (complete request and no errors)
    if (!callback.incomplete && !callback.err) {
        // Reached end of successful card execution, update events
        await event_actions.log_event(lobby_details.games[game_pos], "play-card", req_plyr_id, target, card_details._id, undefined);
    }
    return callback;
}

// Name : game_actions.base_router(game_details, plyr_id, card_id, target, stats_storage, config_storage, bot, socket_id, fastify)
// Desc : base deck - calls the appropriate card function based on card action
// Author(s) : RAk3rman
// exports.base_router = async function (game_details, plyr_id, card_id, target, stats_storage, config_storage, bot, socket_id, fastify) {
//     // Find card details from id
//     let card_details = await card_actions.find_card(card_id, game_details.cards);
//     // Determine which function to run
//     if (card_details.action === "attack") {
//         await card_actions.attack(game_details);
//         await game_actions.discard_card(game_details, card_id);
//         stats_storage.set('attacks', stats_storage.get('attacks') + 1);
//         return {trigger: "attack", data: "true"};
//     } else if (card_details.action === "defuse") {
//         let defuse_stat = await card_actions.defuse(game_details, plyr_id, target, card_id);
//         if (defuse_stat === true) {
//             await game_actions.discard_card(game_details, card_id);
//             await game_actions.advance_turn(game_details);
//             stats_storage.set('defuses', stats_storage.get('defuses') + 1);
//             return {trigger: "defuse", data: "true"};
//         } else {
//             return defuse_stat;
//         }
//     } else if (card_details.action === "favor") { // Favor, expecting target plyr_id
//         let v_favor = await card_actions.verify_favor(game_details, plyr_id, target);
//         if (v_favor === true) {
//             await game_actions.discard_card(game_details, card_id);
//             let favor_data = await card_actions.ask_favor(game_details, plyr_id, target, false, stats_storage);
//             stats_storage.set('favors', stats_storage.get('favors') + 1);
//             return {trigger: "favor_taken", data: {
//                 target_plyr_id: favor_data.used_gator ? plyr_id : target, favor_player_name: favor_data.used_gator ? (await player_actions.get_player_details(game_details, target)).nickname : (await player_actions.get_player_details(game_details, plyr_id)).nickname, card_image_loc: favor_data.card.image_loc, used_gator: favor_data.used_gator
//             }};
//         } else {
//             return v_favor;
//         }
//     } else if (card_details.action === "randchick-1" || card_details.action === "randchick-2" ||
//         card_details.action === "randchick-3" || card_details.action === "randchick-4") { // Favor, expecting target plyr_id
//         let v_double = await card_actions.verify_double(game_details, card_details, plyr_id, card_id);
//         if (v_double !== false) {
//             let v_favor = await card_actions.verify_favor(game_details, plyr_id, target);
//             if (v_favor === true) {
//                 await game_actions.discard_card(game_details, v_double);
//                 await game_actions.discard_card(game_details, card_id);
//                 let favor_data = await card_actions.ask_favor(game_details, plyr_id, target, false, stats_storage);
//                 stats_storage.set('favors', stats_storage.get('favors') + 1);
//                 return {trigger: "favor_taken", data: {
//                     target_plyr_id: favor_data.used_gator ? plyr_id : target, favor_player_name: favor_data.used_gator ? (await player_actions.get_player_details(game_details, target)).nickname : (await player_actions.get_player_details(game_details, plyr_id)).nickname, card_image_loc: favor_data.card.image_loc, used_gator: favor_data.used_gator
//                 }};
//             } else {
//                 return v_favor;
//             }
//         } else {
//             return {trigger: "error", data: "You must have a card of the same type"};
//         }
//     } else if (card_details.action === "reverse") {
//         await card_actions.reverse(game_details);
//         await game_actions.discard_card(game_details, card_id);
//         await game_actions.advance_turn(game_details);
//         stats_storage.set('reverses', stats_storage.get('reverses') + 1);
//         return {trigger: "reverse", data: "true"};
//     } else if (card_details.action === "seethefuture") {
//         await game_actions.discard_card(game_details, card_id);
//         stats_storage.set('see_the_futures', stats_storage.get('see_the_futures') + 1);
//         return {trigger: "seethefuture", data: {}};
//     } else if (card_details.action === "shuffle") {
//         await card_actions.shuffle_draw_deck(game_details);
//         await game_actions.discard_card(game_details, card_id);
//         stats_storage.set('shuffles', stats_storage.get('shuffles') + 1);
//         return {trigger: "shuffle", data: "true"};
//     } else if (card_details.action === "skip") {
//         await game_actions.discard_card(game_details, card_id);
//         await game_actions.advance_turn(game_details);
//         stats_storage.set('skips', stats_storage.get('skips') + 1);
//         return {trigger: "skip", data: "true"};
//     } else if (card_details.action === "hotpotato") {
//         let hotpotato_stat = await card_actions.hot_potato(game_details, plyr_id);
//         if (hotpotato_stat.trigger === "success") {
//             await game_actions.discard_card(game_details, card_id);
//             stats_storage.set('hot_potatoes', stats_storage.get('hot_potatoes') + 1);
//             await game_actions.explode_tick(game_details.slug, 15, hotpotato_stat.data.next_plyr_id, hotpotato_stat.data.chicken_id, "public/cards/yolking_around/hotpotato-1.png", socket_id, fastify, config_storage, stats_storage, bot);
//             return {trigger: "hotpotato", data: {}};
//         } else {
//             return hotpotato_stat;
//         }
//     } else if (card_details.action === "favorgator") {
//         let v_favor = await card_actions.verify_favor(game_details, plyr_id, target);
//         if (v_favor === true) {
//             let favor_data = await card_actions.ask_favor(game_details, plyr_id, target, false, stats_storage);
//             await game_actions.discard_card(game_details, card_id);
//             stats_storage.set('favors', stats_storage.get('favors') + 1);
//             return {trigger: "favor_taken", data: {
//                     target_plyr_id: favor_data.used_gator ? plyr_id : target, favor_player_name: favor_data.used_gator ? (await player_actions.get_player_details(game_details, target)).nickname : (await player_actions.get_player_details(game_details, plyr_id)).nickname, card_image_loc: favor_data.card.image_loc, used_gator: favor_data.used_gator
//                 }};
//         } else {
//             return v_favor;
//         }
//     } else if (card_details.action === "scrambledeggs") {
//         await card_actions.scrambled_eggs(game_details);
//         await game_actions.discard_card(game_details, card_id);
//         stats_storage.set('scrambled_eggs', stats_storage.get('scrambled_eggs') + 1);
//         return {trigger: "scrambledeggs", data: "true"};
//     } else if (card_details.action === "superskip") {
//         let temp_remain = game_details.turns_remaining;
//         game_details.turns_remaining = 1;
//         await game_actions.advance_turn(game_details);
//         game_details.turns_remaining = temp_remain;
//         await game_actions.discard_card(game_details, card_id);
//         stats_storage.set('super_skips', stats_storage.get('super_skips') + 1);
//         return {trigger: "superskip", data: "true"};
//     } else if (card_details.action === "safetydraw") {
//         await card_actions.safety_draw(game_details, plyr_id);
//         await game_actions.discard_card(game_details, card_id);
//         await game_actions.advance_turn(game_details);
//         stats_storage.set('safety_draws', stats_storage.get('safety_draws') + 1);
//         return {trigger: "superskip", data: "true"};
//     } else if (card_details.action === "drawbottom") {
//         // Discard and draw card from draw deck and place in hand
//         await game_actions.discard_card(game_details, card_id);
//         let card_drawn = await game_actions.draw_card(game_details, plyr_id, "bottom");
//         // Check if card drawn in an ec
//         if (card_drawn.action !== "chicken") await game_actions.advance_turn(game_details);
//         if (card_drawn.action === "chicken") await game_actions.explode_tick(game_details.slug, 15, plyr_id, card_drawn._id, "public/cards/base/chicken.png", socket_id, fastify, config_storage, stats_storage, bot);
//         stats_storage.set('draw_bottoms', stats_storage.get('draw_bottoms') + 1);
//         return {trigger: "drawbottom", data: card_drawn};
//     } else {
//         // Houston, we have a problem
//         return {trigger: "error", data: "Invalid card"};
//     }
// }

// Name : game_actions.discard_card(lobby_details, game_pos, card_id)
// Desc : put a card in discard deck
// Author(s) : RAk3rman
exports.discard_card = async function (lobby_details, game_pos, card_id) {
    // Find the greatest position in discard deck
    let discard_deck = await card_actions.filter_cards("discard_deck", lobby_details.games[game_pos].cards);
    // Update card details
    let plyr_id;
    for (let i = 0; i <= lobby_details.games[game_pos].cards.length - 1; i++) {
        if (lobby_details.games[game_pos].cards[i]._id === card_id) {
            plyr_id = lobby_details.games[game_pos].cards[i].assign;
            lobby_details.games[game_pos].cards[i].assign = "discard_deck";
            lobby_details.games[game_pos].cards[i].pos = discard_deck.length;
            break;
        }
    }
    // Resort player hand
    await player_actions.sort_hand(lobby_details, game_pos, plyr_id);
}

// Name : game_actions.advance_turn(lobby_details, game_pos)
// Desc : advance to the next turn
// Author(s) : RAk3rman
exports.advance_turn = async function (lobby_details, game_pos) {
    // Check how many turns we have left
    if (lobby_details.games[game_pos].turns_remain <= 1) { // Only one turn left, player seat advances
        // Advance to the next seat
        lobby_details.games[game_pos].turn_seat_pos = await player_actions.next_seat(lobby_details, game_pos);
        // Make sure the number of turns remaining is not 0
        lobby_details.games[game_pos].turns_remain = 1;
    } else { // Multiple turns left, player seat remains the same and turns_remaining decreases by one
        lobby_details.games[game_pos].turns_remain--;
    }
}

// // Name : game_actions.explode_tick(slug, count, plyr_id, card_id, card_url, socket_id, fastify, config_storage, stats_storage, bot)
// // Desc : recursively count down when a player has an EC in their hand
// // Author(s) : RAk3rman
// exports.explode_tick = async function (slug, count, plyr_id, card_id, card_url, socket_id, fastify, config_storage, stats_storage, bot) {
//     // Get game details
//     let game_details = await game_actions.game_details_slug(slug);
//     // Check if placed_by is active
//     let placed_by_name = "";
//     for (let i = 0; i < game_details.cards.length; i++) {
//         if (game_details.cards[i].placed_by_id !== "" && game_details.cards[i].assignment !== "out_of_play") {
//             // Go through players and find nickname
//             for (let j = 0; j < game_details.players.length; j++) {
//                 if (game_details.cards[i].placed_by_id === game_details.players[j]._id) {
//                     placed_by_name = game_details.players[j].nickname;
//                     break;
//                 }
//             }
//             break;
//         }
//     }
//     // Make sure at least one player is exploding
//     for (let i = 0; i < game_details.players.length; i++) {
//         if (game_details.players[i]._id === plyr_id && game_details.players[i].status === "exploding") {
//             // Found player and is still exploding
//             fastify.io.emit(slug + "-explode-tick", {
//                 count: count,
//                 placed_by_name: placed_by_name,
//                 card_url: card_url
//             });
//             // Decrement count or force chicken to play
//             if (count > -1) {
//                 count--;
//             } else {
//                 await card_actions.kill_player(game_details, plyr_id);
//                 await game_actions.discard_card(game_details, card_id);
//                 game_details.turns_remaining = 0;
//                 stats_storage.set('explosions', stats_storage.get('explosions') + 1);
//                 if (await game_actions.is_winner(game_details, stats_storage, bot) === true) {
//                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(plyr_id)} Game has ended, a player has won`));
//                     fastify.io.emit(slug + "-update", await game_actions.get_game_export(slug, "reset-game", "winner_callback"));
//                 } else {
//                     console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('play-card       ')} ${chalk.dim.yellow(slug)} ${chalk.dim.blue(socket_id)} ${chalk.dim.magenta(plyr_id)} ${chalk.dim.greenBright(card_id)} Hasta la vista baby, a player has exploded`));
//                     await game_actions.advance_turn(game_details);
//                     await game_actions.log_event(game_details, "play-card", "chicken", card_id, (await player_actions.get_player_details(game_details, plyr_id)).nickname, "");
//                     fastify.io.emit(slug + "-update", await game_actions.get_game_export(slug, "play-card", "explosion-callback"));
//                 }
//                 return;
//             }
//             // Call function again
//             setTimeout(function(){ game_actions.explode_tick(slug, count, plyr_id, card_id, card_url, socket_id, fastify, config_storage, stats_storage, bot) }, 1000);
//             return;
//         }
//     }
// }

// Name : game_actions.is_winner(game_details, stats_storage, bot)
// Desc : check to see if there is a winner
// Author(s) : RAk3rman
exports.is_winner = async function (lobby_details, game_pos) {
    // Count the number of active players
    let ctn = 0;
    for (let i = 0; i <= lobby_details.players.length - 1; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign) && !lobby_details.players[i].is_dead) {
            ctn++;
        }
    }
    // Evaluate if we have a winner
    return ctn < 2;
    // // Determine if there is a winner, end game if so
    // if (ctn === 1) {
    //     // Update stats
    //     stats_storage.set('games_played', stats_storage.get('games_played') + 1);
    //     stats_storage.set('mins_played', stats_storage.get('mins_played') + moment().diff(moment(game_details.start_time), 'minutes'));
    //     // Send message if bot is configured
    //     if (config_storage.has('discord_bot_token') && config_storage.get('discord_bot_token') !== '' &&
    //         config_storage.has('discord_bot_channel') && config_storage.get('discord_bot_channel') !== '') {
    //         // Game completed, update game stats
    //         let print_players = "";
    //         let print_packs = "";
    //         let win_count = 0;
    //         game_details.players.forEach(ele => {
    //             print_players += "'" + ele.nickname + "' ";
    //             win_count += ele.wins;
    //         });
    //         game_details.imported_packs.forEach(ele => {
    //             print_packs += "'" + ele + "' ";
    //         })
    //         // Get draw deck length
    //         let draw_deck = await card_actions.filter_cards("draw_deck", game_details.cards);
    //         let embed = bot.createEmbed(config_storage.get('discord_bot_channel'));
    //         embed.title("**:chicken: Exploding Chickens: Game Completed**");
    //         embed.url("https://chickens.rakerman.com/game/" + game_details.slug);
    //         embed.color("3447003");
    //         embed.field("Slug :bug:", game_details.slug + "", true);
    //         embed.field("Duration :timer:", moment().diff(moment(game_details.start_time), 'minutes') + " minutes", true);
    //         embed.field("EC chance :fire:", "1 EC / " + draw_deck.length + " cards -> " + Math.floor((1 / (draw_deck.length === 0 ? 1 : draw_deck.length))*100) + "%", true);
    //         embed.field("Lobby games :receipt:", (win_count + 1) + " played", true);
    //         embed.field("Connections :link:", stats_storage.get("sockets_active") + " sockets active", true);
    //         embed.field("Packs :card_box:", print_packs, true);
    //         embed.field("Players :busts_in_silhouette:", print_players, false);
    //         embed.footer("Release v" + pkg.version);
    //         let event = new Date();
    //         embed.timestamp(event.toISOString());
    //         embed.send();
    //         console.log(wipe(`${chalk.bold.blueBright('Discord')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.greenBright('game-won        ')} Sent game summary message`));
    //     }
    //     // Log event
    //     await game_actions.log_event(game_details, "game-won", "", "", (await player_actions.get_player_details(game_details, plyr_id)).nickname, "");
    //     // Reset game
    //     await game_actions.reset_game(game_details, "idle", "in_lobby");
    //     // Create new promise to save game
    //     await new Promise((resolve, reject) => {
    //         game.findOneAndUpdate(
    //             { slug: game_details.slug, "players._id": plyr_id },
    //             {"$set": { "players.$.status": "winner" }, "$inc": { "players.$.wins": 1 }},
    //             function (err) {
    //                 if (err) {
    //                     reject(err);
    //                 } else {
    //                     resolve();
    //                 }
    //             });
    //     })
    //     return true;
    // } else {
    //     return false;
    // }
}

// Name : game_actions.reset_game(lobby_details, game_pos)
// Desc : resets the game to default
// Author(s) : RAk3rman
exports.reset_game = async function (lobby_details, game_pos) {
    // Reset cards
    for (let i = 0; i <= lobby_details.games[game_pos].cards.length - 1; i++) {
        lobby_details.games[game_pos].cards[i].assign = "draw_deck";
        lobby_details.games[game_pos].cards[i].pos = i;
        lobby_details.games[game_pos].cards[i].placed_by_plyr_id = "";
    }
    // Reset game variables
    lobby_details.games[game_pos].in_progress = false;
    lobby_details.games[game_pos].is_completed = false;
    lobby_details.games[game_pos].turns_seat_pos = 0;
    lobby_details.games[game_pos].turn_dir = "forward";
    lobby_details.games[game_pos].turn_remain = 1;
    lobby_details.games[game_pos].created = Date.now();
}

// Name : game_actions.game_export(lobby_details, game_pos, source, req_plyr_id)
// Desc : prepares game data for export to client
// Author(s) : RAk3rman
exports.game_export = async function (lobby_details, game_pos, source, req_plyr_id) {
    if (!lobby_details) return;
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
        if (lobby_details.players[i].game_assign?.equals(game_details._id)) {
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
        game_slug: game_details.slug,
        lobby_slug: lobby_details.slug,
        in_progress: game_details.in_progress,
        turn_seat_pos: game_details.turn_seat_pos,
        turn_dir: game_details.turn_dir,
        turns_remain: game_details.turns_remain,
        cards_total: game_details.cards.length,
        cards_remain: draw_deck.length,
        ec_remain: ec_remain,
        created: moment(game_details.created),
        players: players_payload,
        events: events_payload,
        events_length: game_details.events.length,
        auth_token: req_plyr_id !== "spectator" ? lobby_details.auth_token : "undefined",
        discard_deck: discard_deck,
        packs: lobby_details.packs,
        play_timeout: lobby_details.play_timeout,
        req_plyr_id: req_plyr_id,
        trigger: source.trim()
    }
}

// Name : game_actions.delete_game(game_id)
// Desc : deletes an existing game in mongodb, returns game_id
// Author(s) : RAk3rman
exports.delete_game = async function (lobby_details, game_id) {
    for (let i = 0; i < lobby_details.games.length; i++) {
        if (lobby_details.games[i]._id.equals(game_id)) {
            lobby_details.games.splice(i, 1);
            return;
        }
    }
}

