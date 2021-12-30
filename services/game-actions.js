/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/game-actions.js
Desc     : all actions and helper functions
           related to game play
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
const moment = require('moment');
const { uniqueNamesGenerator, adjectives, animals } = require('unique-names-generator');

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');

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
exports.get_game_details = function (lobby_details, game_id) {
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

// Name : game_actions.generate_cb(err, card, data, target, incomplete)
// Desc : generates a callback data struct that is sent to the client
// Author(s) : RAk3rman
exports.generate_cb = function (err, card, data, target, incomplete) {
    // Callback payload data structure
    return {
        err:         err,        // If an error is thrown, a string containing the error msg will be contained in this value
        card:        card,       // Card details being referenced
        data:        data,       // Optional data sent after a card action is complete (see the future cards, defuse positions, etc...)
        target:      target,     // Array that describes the possible targets of this card = { plyr_id, card_id, deck_pos }
        incomplete:  incomplete  // Boolean if we received an incomplete request (still need favor target, waiting for defuse position, etc...)
    };
}

// Name : game_actions.draw_card(lobby_details, game_pos, plyr_id)
// Desc : draw a card from the draw deck and place at the end of a players hand
// Author(s) : Vincent Do, RAk3rman
exports.draw_card = async function (lobby_details, game_pos, plyr_id) {
    // Filter draw deck
    let draw_deck = card_actions.filter_cards("draw_deck", lobby_details.games[game_pos].cards);
    // If there are no cards in draw deck, return undefined
    if (draw_deck.length < 1) return undefined;
    // Filter player hand
    let player_hand = card_actions.filter_cards(plyr_id, lobby_details.games[game_pos].cards);
    // Determine position of drawn card
    let pos = draw_deck.length - 1;
    // Update card
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
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
    event_actions.log_event(lobby_details.games[game_pos], "draw-card", plyr_id, undefined, draw_deck[pos], undefined);
    return draw_deck[pos];
}

// Name : game_actions.play_card(lobby_details, game_pos, card_id, req_plyr_id, target)
// Desc : calls the appropriate card function based on card action, returns structured callback to be sent to client
// Target data structure : { plyr_id, card_id, deck_pos }
// Author(s) : RAk3rman
exports.play_card = async function (lobby_details, game_pos, card_id, req_plyr_id, target, stats_store) {
    // Find card details based on card_id
    let card_details = await card_actions.find_card(card_id, lobby_details.games[game_pos].cards);
    // Generate callback from data struct
    let callback = game_actions.generate_cb(undefined, card_details, undefined, target, false);
    // Ensure that the card is allowed to be played now
    let exp_only = ['defuse', 'hotpotato', 'chicken'];
    if (await player_actions.is_exploding(card_actions.filter_cards(req_plyr_id, lobby_details.games[game_pos].cards)) && !exp_only.includes(callback.card.action)) {
        callback.err = "Cannot be used while exploding"; return callback; // Player is exploding and player attempted to use a card that cannot stop a chicken
    } else if (!await player_actions.is_exploding(card_actions.filter_cards(req_plyr_id, lobby_details.games[game_pos].cards)) && exp_only.includes(callback.card.action)) {
        callback.err = "Can only be used when exploding"; return callback; // Player is not exploding but player tried to use a card that can stop a chicken
    }
    // BASE DECK
    if (card_details.action === "attack")               { await card_actions.attack(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action === "defuse")          { await card_actions.defuse(lobby_details, game_pos, card_id, req_plyr_id, target, callback); }
    else if (card_details.action === "chicken")         { await card_actions.chicken(lobby_details, game_pos, req_plyr_id, callback); }
    else if (card_details.action === "favor")           { await card_actions.favor_targeted(lobby_details, game_pos, card_id, req_plyr_id, target, callback) }
    else if (card_details.action.includes("randchick")) { await card_actions.favor_random(lobby_details, game_pos, card_id, req_plyr_id, target, callback); }
    else if (card_details.action === "reverse")         { await card_actions.reverse(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action === "seethefuture")    { await card_actions.seethefuture(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action === "shuffle")         { await card_actions.shuffle(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action === "skip")            { await card_actions.skip(lobby_details, game_pos, card_id, callback); }
    // YOLKING AROUND EXPANSION PACK
    else if (card_details.action === "hotpotato")       { await card_actions.hot_potato(lobby_details, game_pos, card_id, req_plyr_id, callback); }
    else if (card_details.action === "favorgator")      { await card_actions.favor_gator(lobby_details, game_pos, card_id, req_plyr_id, target, callback); }
    else if (card_details.action === "scrambledeggs")   { await card_actions.scrambled_eggs(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action === "superskip")       { await card_actions.super_skip(lobby_details, game_pos, card_id, callback); }
    else if (card_details.action === "safetydraw")      { await card_actions.safety_draw(lobby_details, game_pos, card_id, req_plyr_id, callback) }
    else if (card_details.action === "drawbottom")      { await card_actions.draw_bottom(lobby_details, game_pos, card_id, req_plyr_id, callback) }
    else { callback.err = "Invalid card action"; }
    // Check if callback was successful (complete request and no errors)
    if (!callback.incomplete && !callback.err) {
        // Reached end of successful card execution, update events and statistics
        event_actions.log_event(lobby_details.games[game_pos], "play-card", req_plyr_id, target.plyr_id, callback.card._id, undefined);
        let stats_desc = card_details.action.includes("randchick") ? "randchick" : card_details.action;
        stats_store.set(stats_desc, stats_store.get(stats_desc) + 1);
    }
    return callback;
}

// Name : game_actions.discard_card(lobby_details, game_pos, card_id)
// Desc : put a card in discard deck
// Author(s) : RAk3rman
exports.discard_card = async function (lobby_details, game_pos, card_id) {
    // Find the greatest position in discard deck
    let discard_deck = card_actions.filter_cards("discard_deck", lobby_details.games[game_pos].cards);
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
        lobby_details.games[game_pos].turn_seat_pos = await player_actions.next_seat(lobby_details, game_pos, "seat_pos");
        // Make sure the number of turns remaining is not 0
        lobby_details.games[game_pos].turns_remain = 1;
    } else { // Multiple turns left, player seat remains the same and turns_remaining decreases by one
        lobby_details.games[game_pos].turns_remain--;
    }
}

// Name : game_actions.is_winner(lobby_details, game_pos)
// Desc : return if there is a winner
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
}

// Name : game_actions.complete_game(lobby_details, game_pos)
// Desc : assuming the game has completed, update player details and clean game data
// Author(s) : RAk3rman
exports.complete_game = async function (lobby_details, game_pos) {
    // Dump cards and reset variables
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        lobby_details.games[game_pos].cards[i].assign = "out_of_play";
        lobby_details.games[game_pos].cards[i].pos = i;
        lobby_details.games[game_pos].cards[i].placed_by_plyr_id = "";
    }
    lobby_details.games[game_pos].in_progress = false;
    lobby_details.games[game_pos].is_completed = true;
    lobby_details.games[game_pos].turns_seat_pos = 0;
    lobby_details.games[game_pos].turn_dir = "forward";
    lobby_details.games[game_pos].turn_remain = 1;
}

// Name : game_actions.reset_game(lobby_details, game_pos)
// Desc : resets the game to default
// Author(s) : RAk3rman
exports.reset_game = async function (lobby_details, game_pos) {
    // Reset cards
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        lobby_details.games[game_pos].cards[i].assign = "draw_deck";
        lobby_details.games[game_pos].cards[i].pos = i;
        lobby_details.games[game_pos].cards[i].placed_by_plyr_id = "";
    }
    // Reset players
    let players = game_actions.get_players(lobby_details, game_pos);
    for (let i = 0; i < players.length; i++) {
        players[i].is_dead = false;
    }
    // Reset game variables
    lobby_details.games[game_pos].in_progress = false;
    lobby_details.games[game_pos].is_completed = false;
    lobby_details.games[game_pos].turns_seat_pos = 0;
    lobby_details.games[game_pos].turn_dir = "forward";
    lobby_details.games[game_pos].turn_remain = 1;
    lobby_details.games[game_pos].created = Date.now();
}

// Name : player_actions.get_players(lobby_details, game_pos)
// Desc : returns an array of players within the specified game
// Author(s) : RAk3rman
exports.get_players = function (lobby_details, game_pos) {
    let players = [];
    // Loop through each player and see if it matches game assignment
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign)) {
            players.push(lobby_details.players[i]);
        }
    }
    return players;
}

// Name : game_actions.game_export(lobby_details, game_pos, cb_data, source, req_plyr_id)
// Desc : prepares game data for export to client
// Author(s) : RAk3rman
exports.game_export = async function (lobby_details, game_pos, cb_data, source, req_plyr_id) {
    if (!lobby_details) return;
    // Reference to game details
    let game_details = lobby_details.games[game_pos];
    // Prepare events payload
    let events_payload = [];
    for (let i = game_details.events.length - 1; i >= 0 && i >= (game_details.events.length - 20); i--) {
        events_payload.push(event_actions.parse_event(lobby_details, game_details.events[i]));
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
    let draw_deck = card_actions.filter_cards("draw_deck", game_details.cards);
    // Prepare discard deck
    let discard_deck = card_actions.filter_cards("discard_deck", game_details.cards);
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
        discard_deck: discard_deck,
        packs: lobby_details.packs,
        play_timeout: lobby_details.play_timeout,
        callback: cb_data,
        auth_token: req_plyr_id !== "spectator" ? lobby_details.auth_token : "undefined",
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
