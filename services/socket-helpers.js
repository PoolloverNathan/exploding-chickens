/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/socket-helpers.js
Desc     : helper functions for client side operations
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let lobby = require('../models/lobby.js');
const chalk = require('chalk');
const wipe = chalk.white;
const moment = require('moment');

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');

// // Name : socket_helpers.explode_tick(slug, count, plyr_id, card_id, card_url, socket_id, fastify, config_store, stats_store, bot)
// // Desc : recursively count down when a player has an EC in their hand
// // Author(s) : RAk3rman
// exports.explode_tick = async function (slug, count, plyr_id, card_id, card_url, socket_id, fastify, config_store, stats_store, bot) {
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
//                 stats_store.set('explosions', stats_store.get('explosions') + 1);
//                 if (await game_actions.is_winner(game_details, stats_store, bot) === true) {
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
//             setTimeout(function(){ game_actions.explode_tick(slug, count, plyr_id, card_id, card_url, socket_id, fastify, config_store, stats_store, bot) }, 1000);
//             return;
//         }
//     }
// }

// // Name : socket_helpers.bot_summary(lobby_details, game_pos)
// // Desc : send a game summary message to a specified Discord channel
// // Author(s) : RAk3rman
// exports.bot_summary = async function (lobby_details, game_pos) {
//     // Send message if bot is configured
//     if (config_store.has('discord_bot_token') && config_store.get('discord_bot_token') !== '' &&
//         config_store.has('discord_bot_channel') && config_store.get('discord_bot_channel') !== '') {
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
//         let embed = bot.createEmbed(config_store.get('discord_bot_channel'));
//         embed.title("**:chicken: Exploding Chickens: Game Completed**");
//         embed.url("https://chickens.rakerman.com/game/" + game_details.slug);
//         embed.color("3447003");
//         embed.field("Slug :bug:", game_details.slug + "", true);
//         embed.field("Duration :timer:", moment().diff(moment(game_details.start_time), 'minutes') + " minutes", true);
//         embed.field("EC chance :fire:", "1 EC / " + draw_deck.length + " cards -> " + Math.floor((1 / (draw_deck.length === 0 ? 1 : draw_deck.length))*100) + "%", true);
//         embed.field("Lobby games :receipt:", (win_count + 1) + " played", true);
//         embed.field("Connections :link:", stats_store.get("sockets_active") + " sockets active", true);
//         embed.field("Packs :card_box:", print_packs, true);
//         embed.field("Players :busts_in_silhouette:", print_players, false);
//         embed.footer("Release v" + pkg.version);
//         let event = new Date();
//         embed.timestamp(event.toISOString());
//         embed.send();
//         console.log(wipe(`${chalk.bold.blueBright('Discord')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.greenBright('game-won        ')} Sent game summary message`));
//     }
// }
