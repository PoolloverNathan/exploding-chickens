/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/socket-helpers.js
Desc     : helper functions for client side operations
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
const Lobby = require("../models/lobby.js");
const chalk = require('chalk');
const wipe = chalk.white;
const moment = require('moment');
const pkg = require('../package.json');

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');
let socket_helpers = require('./socket-helpers.js');

// Name : socket_helpers.update_l_ui(lobby_details, req_plyr_id, req_sock, tar_sock, source, fastify, config_store)
// Desc : sends an event containing lobby data
// Author(s) : RAk3rman
exports.update_l_ui = async function (lobby_details, req_plyr_id, req_sock, tar_sock, source, fastify, config_store) {
    // Get raw pretty lobby details
    let pretty_lobby_details = lobby_actions.lobby_export(lobby_details, source, req_plyr_id);
    if (pretty_lobby_details !== {}) {
        // Send lobby data
        if (tar_sock === undefined) {
            fastify.io.to(lobby_details.slug).emit("lobby-update", pretty_lobby_details);
        } else {
            fastify.io.to(tar_sock).emit("lobby-update", pretty_lobby_details);
        }
        if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(source)} ${chalk.dim.yellow(pretty_lobby_details.slug)} ${chalk.dim.blue(req_sock)} ${chalk.dim.magenta(req_plyr_id)} Emitted lobby update event`));
    }
}

// Name : socket_helpers.update_g_ui(lobby_details, game_pos, req_plyr_id, req_sock, tar_sock, cb_data, source, fastify, config_store)
// Desc : sends an event containing game data
// Author(s) : RAk3rman
exports.update_g_ui = async function (lobby_details, game_pos, req_plyr_id, req_sock, tar_sock, cb_data, source, fastify, config_store) {
    // Get raw pretty game details
    let pretty_game_details = game_actions.game_export(lobby_details, game_pos, cb_data, source, req_plyr_id);
    if (pretty_game_details !== {}) {
        // Send game data
        if (tar_sock === undefined) {
            fastify.io.to(lobby_details.slug).emit("game-update", pretty_game_details);
        } else {
            fastify.io.to(tar_sock).emit("game-update", pretty_game_details);
        }
        if (config_store.get('verbose_debug')) console.log(wipe(`${chalk.bold.blue('Socket')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan(source)} ${chalk.dim.yellow(pretty_game_details.game_slug)} ${chalk.dim.blue(req_sock)} ${chalk.dim.magenta(req_plyr_id)} Emitted game update event`));
    }
}

// Name : socket_helpers.explode_tick(lobby_id, game_pos, req_plyr_id, req_sock, tar_sock, ctn, fastify, bot, config_store, stats_store)
// Desc : recursively count down when a player has an EC in their hand
// Author(s) : RAk3rman
exports.explode_tick = async function (lobby_id, game_pos, req_plyr_id, req_sock, tar_sock, ctn, fastify, bot, config_store, stats_store) {
    // Get lobby_details
    let lobby_details = await Lobby.findOne({_id: lobby_id});
    // Get player hand
    let plyr_hand = card_actions.filter_cards(req_plyr_id, lobby_details.games[game_pos].cards);
    // Get details of exploding chicken in player's hand
    let chicken_card = undefined;
    plyr_hand.every(card => {
        if (card.action === "chicken") {
            chicken_card = card;
            return false;
        }
        return true;
    });
    // Make sure target player is still exploding
    if (!chicken_card) return;
    // Generate callback from data struct
    let cb_data = game_actions.generate_cb(undefined, chicken_card, { count: ctn, placed_by_name: (player_actions.get_player_details(lobby_details, chicken_card.placed_by_plyr_id))?.nickname }, { plyr_id: undefined, card_id: undefined, deck_pos: undefined }, false);
    await socket_helpers.update_g_ui(lobby_details, game_pos, req_plyr_id, req_sock, tar_sock, cb_data, "explode-tick", fastify, config_store);
    // Decrement count or force play chicken
    if (ctn > -1) {
        ctn--;
        setTimeout(function(){ socket_helpers.explode_tick(lobby_id, game_pos, req_plyr_id, req_sock, tar_sock, ctn, fastify, bot, config_store, stats_store) }, 1000);
    } else {
        game_actions.play_card(lobby_details, game_pos, chicken_card._id, req_plyr_id, cb_data.target, stats_store);
        if (game_actions.is_winner(lobby_details, game_pos)) {
            // Mark game as completed
            let winner_plyr_id = game_actions.complete_game(lobby_details, game_pos);
            event_actions.log_event(lobby_details, "game-won", winner_plyr_id, undefined, undefined, undefined);
            event_actions.log_event(lobby_details.games[game_pos], "game-won", winner_plyr_id, undefined, undefined, undefined);
            // Update statistics
            stats_store.set("games_played", stats_store.get("games_played") + 1);
            stats_store.set("mins_played", stats_store.get("mins_played") + moment().diff(moment(lobby_details.games[game_pos].created), 'minutes'));
            // Send bot summary and update game ui
            await socket_helpers.bot_summary(lobby_details, game_pos, bot, config_store, stats_store);
            await socket_helpers.update_l_ui(lobby_details, req_plyr_id, req_sock, tar_sock, "completed-game", fastify, config_store);
            await socket_helpers.update_g_ui(lobby_details, game_pos, req_plyr_id, req_sock, tar_sock, cb_data, "completed-game", fastify, config_store);
        } else {
            await socket_helpers.update_g_ui(lobby_details, game_pos, req_plyr_id, req_sock, tar_sock, cb_data, "play-chicken", fastify, config_store);
        }
        await lobby_details.save();
    }
}

// Name : socket_helpers.bot_summary(lobby_details, game_pos, bot, config_store, stats_store)
// Desc : send a game summary message to a specified Discord channel
// Author(s) : RAk3rman
exports.bot_summary = async function (lobby_details, game_pos, bot, config_store, stats_store) {
    // Send message if bot is configured
    if (config_store.has('discord_bot_token') && config_store.get('discord_bot_token') !== '' &&
        config_store.has('discord_bot_channel') && config_store.get('discord_bot_channel') !== '') {
        // Game completed, update game stats
        let print_players = "";
        let print_packs = "";
        let win_count = 0;
        lobby_details.players.forEach(ele => {
            if (ele.game_assign.equals(lobby_details.games[game_pos].slug)) print_players += "'" + ele.nickname + "' ";
            win_count += ele.wins;
        });
        lobby_details.packs.forEach(ele => {
            print_packs += "'" + ele + "' ";
        })
        // Get draw deck length
        let draw_deck = card_actions.filter_cards("draw_deck", lobby_details.games[game_pos].cards);
        let embed = bot.createEmbed(config_store.get('discord_bot_channel'));
        embed.title("**:chicken: Exploding Chickens: Game Completed**");
        embed.url("https://chickens.rakerman.com/lobby/" + lobby_details.slug + "/game/" + lobby_details.games[game_pos].slug);
        embed.color("3447003");
        embed.field("Lobby/Game Slug :bug:", lobby_details.slug + " -> " + lobby_details.games[game_pos].slug + "", false);
        embed.field("Duration :timer:", moment().diff(moment(lobby_details.games[game_pos].created), 'minutes') + " minutes", true);
        embed.field("EC chance :fire:", "1 EC / " + draw_deck.length + " cards -> " + Math.floor((1 / (draw_deck.length === 0 ? 1 : draw_deck.length))*100) + "%", true);
        embed.field("Lobby games :receipt:", (win_count + 1) + " played", true);
        embed.field("Connections :link:", stats_store.get("sockets_active") + " sockets active", true);
        embed.field("Packs :card_box:", print_packs, true);
        embed.field("Players :busts_in_silhouette:", print_players, false);
        embed.footer("Release v" + pkg.version);
        let event = new Date();
        embed.timestamp(event.toISOString());
        embed.send();
        console.log(wipe(`${chalk.bold.blueBright('Discord')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.greenBright('game-won        ')} Sent game summary message`));
    }
}
