/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/player-actions.js
Desc     : handles all player actions
           and modifies players in game db
Author(s): RAk3rman, SengdowJones
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let Lobby = require('../models/lobby.js');
let game = require('../models/game.js');
const { nanoid } = require('nanoid');

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');
const moment = require("moment");

// Name : player_actions.create_player(lobby_details, nickname, avatar)
// Desc : creates a new player
// Author(s) : RAk3rman
exports.create_player = async function (lobby_details, nickname, avatar) {
    // Push new player into existing lobby, await game assignment
    let player_id = nanoid(10);
    lobby_details.players.push({
        _id: player_id,
        nickname: nickname,
        avatar: avatar,
        is_host: lobby_details.players.length === 0
    });
    return player_id;
};

// Name : player_actions.get_player_details(lobby_details, player_id)
// Desc : return the details for a target player
// Author(s) : RAk3rman
exports.get_player_details = async function (lobby_details, player_id) {
    // Find player and return details
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.players[i]._id === player_id) {
            return lobby_details.players[i];
        }
    }
    return null;
}

// Name : player_actions.get_player_pos(lobby_details, player_id)
// Desc : return the details for a target player
// Author(s) : RAk3rman
exports.get_player_pos = async function (lobby_details, player_id) {
    // Find player and return details
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.players[i]._id === player_id) {
            return i;
        }
    }
    return null;
}

// Name : player_actions.get_turn_player_id(lobby_details, game_pos)
// Desc : return the player_id of the player who is currently playing
// Author(s) : RAk3rman
exports.get_turn_player_id = async function (lobby_details, game_pos) {
    // Find player and return details
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign) && lobby_details.games[game_pos].turn_seat_pos === lobby_details.players[i].seat_pos) {
            return lobby_details.players[i]._id;
        }
    }
    return null;
}

// Name : player_actions.update_sockets_open(lobby_details, player_id, method)
// Desc : updates the connection for a target player
// Author(s) : RAk3rman
exports.update_sockets_open = async function (lobby_details, player_id, method) {
    // Find player and return new socket total
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.players[i]._id === player_id) {
            // Inc or dec
            if (method === "inc" && lobby_details.players[i].sockets_open >= 0) {
                lobby_details.players[i].sockets_open += 1;
            } else if (method === "dec" && lobby_details.players[i].sockets_open > 0) {
                lobby_details.players[i].sockets_open -= 1;
            }
            return lobby_details.players[i].sockets_open;
        }
    }
    return null;
};

// Name : player_actions.create_hand(lobby_details, game_pos)
// Desc : gives each player a defuse card and 4 random cards from the draw_deck, rations ec
// Author(s) : RAk3rman
exports.create_hand = async function (lobby_details, game_pos) {
    // Create array containing the position of each defuse card and regular card
    let defuse_bucket = [];
    let exploding_bucket = [];
    let card_bucket = [];
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i].action === "defuse") {
            defuse_bucket.push(i);
        } else if (lobby_details.games[game_pos].cards[i].action === "chicken") {
            exploding_bucket.push(i);
            lobby_details.games[game_pos].cards[i].assign = "out_of_play";
        } else {
            card_bucket.push(i);
        }
    }
    // Assign defuse card to player id in first position
    let plyr_count = 0;
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign)) {
            let rand_defuse_pos = rand_bucket(defuse_bucket);
            lobby_details.games[game_pos].cards[rand_defuse_pos].assign = lobby_details.players[i]._id;
            lobby_details.games[game_pos].cards[rand_defuse_pos].pos = 0;
            plyr_count++;
        }
    }
    // Add remaining defuse cards to card bucket
    for (let i = 0; i <= defuse_bucket.length - 1; i++) {
        card_bucket.push(defuse_bucket[i]);
    }
    // Assign remaining 4 cards to each player
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign)) {
            // Over 4 cards on the same player
            for (let j = 1; j <= 4; j++) {
                let rand_card_pos = rand_bucket(card_bucket);
                lobby_details.games[game_pos].cards[rand_card_pos].assign = lobby_details.players[i]._id;
                lobby_details.games[game_pos].cards[rand_card_pos].pos = j;
            }
        }
    }
    // Assign exploding chickens to deck
    let exp_assigned = 0;
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign)) {
            // Randomly pick ec
            let rand_card_pos = rand_bucket(exploding_bucket);
            lobby_details.games[game_pos].cards[rand_card_pos].assign = "draw_deck";
            // Increment amount of chickens assigned
            exp_assigned++;
            // Break if assignment is over one less than the number of players
            if (exp_assigned >= plyr_count - 1) break;
        }
    }
    // Shuffle draw deck once we are done
    await card_actions.shuffle_draw_deck(lobby_details, game_pos);
}


// Name : player_actions.randomize_seats(lobby_details, game_pos)
// Desc : given a game_slug, gives each player a random seat position (without replacement)
// Author(s) : SengdowJones, RAk3rman
exports.randomize_seats = async function (lobby_details, game_pos) {
    // Create array containing each available seat
    let bucket = [];
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign)) {
            bucket.push(i);
        }
    }
    // Update seat number for each player
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign)) {
            lobby_details.players[i].seat = rand_bucket(bucket);
        }
    }
}

// Name : player_actions.next_seat(lobby_details, game_pos)
// Desc : determine next seat position
// Author(s) : RAk3rman
exports.next_seat = async function (lobby_details, game_pos) {
    let pos = lobby_details.games[game_pos].turn_seat_pos;
    // Create array of players in game with only required player data
    let players = [];
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.players[i].game_assign?.equals(lobby_details.games[game_pos]._id)) {
            players.push({
                seat_pos: lobby_details.players[i].seat_pos,
                is_dead: lobby_details.players[i].is_dead
            });
        }
    }
    // Traverse until we find next open seat
    while (true) {
        // Increment or decrement pos based on direction
        if (lobby_details.games[game_pos].turn_dir === "forward") {
            pos++
            if (pos > players.length - 1) {
                pos = 0;
            }
        } else if (lobby_details.games[game_pos].turn_dir === "backward") {
            pos--;
            if (pos < 0) {
                pos = players.length - 1;
            }
        }
        // Find current seat and check to see if current seat is playing
        for (let i = 0; i < players.length; i++) {
            if (players[i].seat_pos === pos) {
                if (!players[i].is_dead) {
                    return pos;
                } else {
                    break;
                }
            }
        }
    }
}

// Name : player_actions.disable_player(lobby_details, player_pos)
// Desc : mark a player as disabled and clear details
// Author(s) : RAk3rman
exports.disable_player = async function (lobby_details, player_pos) {
    lobby_details.players[player_pos].game_assign = undefined;
    lobby_details.players[player_pos].seat_pos = -1;
    lobby_details.players[player_pos].is_host = false;
    lobby_details.players[player_pos].is_dead = false;
    lobby_details.players[player_pos].is_disabled = true;
}

// Name : player_actions.kick_player(lobby_details, host_player_id, kick_player_id)
// Desc : remove a player from the game
// Author(s) : RAk3rman
exports.kick_player = async function (lobby_details, host_player_id, kick_player_id) {
    // Make sure they aren't kicking themselves
    if (host_player_id === kick_player_id) {
        return;
    }
    // Get kick position
    let kick_player_pos = await player_actions.get_player_pos(lobby_details, kick_player_id);
    // Check if lobby is in progress (we can do this the easy way or the hard way)
    if (!lobby_details.in_progress) {
        // Disable and partition players
        await player_actions.disable_player(lobby_details, kick_player_pos);
        await lobby_actions.partition_players(lobby_details);
    } else {
        // We have to do this the hard way, find the game
        let game_pos = await game_actions.get_game_pos(lobby_details, lobby_details.players[kick_player_pos].game_assign);
        // Disable player
        await player_actions.disable_player(lobby_details, kick_player_pos);
        console.log(game_pos);
        // Check the status of the game they are in
        if (!lobby_details.games[game_pos].is_completed) {
            // Kill player and release cards
            await card_actions.kill_player(lobby_details, game_pos, kick_player_id);
            // Advance turn if it was their turn
            if (lobby_details.players[kick_player_pos].seat_pos === lobby_details.games[game_pos].turn_seat_pos) {
                await game_actions.advance_turn(lobby_details, game_pos);
            }
            // Determine number of active players in game
            let active_ctn = 0;
            for (let i = 0; i < lobby_details.players.length; i++) {
                if (lobby_details.players[i].game_assign?.equals(lobby_details.games[game_pos]._id) && !lobby_details.players[i].is_dead) {
                    active_ctn++;
                }
            }
            // Complete game or reallocate EC depending on players remaining
            if (active_ctn < 2) {
                await game_actions.reset_game(lobby_details, game_pos);
                lobby_details.games[game_pos].is_completed = true;
            } else {
                // Loop through players and see how many EC are active, remove if over active count
                let ec_ctn = 0;
                for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
                    if (lobby_details.games[game_pos].cards[i].action === "chicken" && lobby_details.games[game_pos].cards[i].assign !== "out_of_play") {
                        ec_ctn++;
                        if (ec_ctn >= active_ctn) {
                            lobby_details.games[game_pos].cards[i].assign = "out_of_play";
                        }
                    }
                }
                // Reset seat positions
                await player_actions.randomize_seats(lobby_details, game_pos);
            }
        }
    }
}

// Name : player_actions.make_host(lobby_details, curr_player_id, suc_player_id)
// Desc : make a new player the host
// Author(s) : RAk3rman
exports.make_host = async function (lobby_details, curr_player_id, suc_player_id) {
    // Make sure they aren't making themselves a host
    if (curr_player_id === suc_player_id) {
        return;
    }
    // Find both players and modify type
    for (let i = 0; i < lobby_details.players.length; i++) {
        // Check if the player id's match, update changes
        if (lobby_details.players[i]._id === curr_player_id) {
            lobby_details.players[i].is_host = false;
        } else if (lobby_details.players[i]._id === suc_player_id) {
            lobby_details.players[i].is_host = true;
        }
    }
}

// Name : player_actions.sort_hand(lobby_details, game_pos, player_id)
// Desc : sort players hand, typically after a card is removed
// Author(s) : RAk3rman
exports.sort_hand = async function (lobby_details, game_pos, player_id) {
    // Get cards in player's hand
    let player_hand = [];
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        // If the card is assigned to this player, add to hand
        if (lobby_details.games[game_pos].cards[i].assign === player_id) {
            player_hand.push({
                loc_pos: lobby_details.games[game_pos].cards[i].pos,
                gbl_pos: i
            });
        }
    }
    // Sort card hand by local position
    player_hand.sort(function(a, b) {
        return a.loc_pos - b.loc_pos;
    });
    // Overlay positions properly
    for (let i = 0; i <= player_hand.length - 1; i++) {
        lobby_details.games[game_pos].cards[player_hand[i].gbl_pos].pos = i;
    }
}

// Name : game_actions.player_export(lobby_details, player_pos)
// Desc : prepares player data for export to client
// Author(s) : RAk3rman
exports.player_export = async function (lobby_details, player_pos) {
    let game_details = [];
    let card_array = [];
    let is_exploding = false;
    // Check host removal condition
    if (!lobby_details.players[player_pos].is_host || (lobby_details.players[player_pos].is_host && lobby_details.include_host)) {
        // Get game details
        lobby_details.games.every(game => {
            if (game._id.equals(lobby_details.players[player_pos].game_assign)) {
                game_details = game;
                return false;
            }
            return true;
        });
        // Filter card hand
        card_array = await card_actions.filter_cards(lobby_details.players[player_pos]._id, game_details.cards);
        // Sort card hand in reverse order
        card_array.sort(function(a, b) {
            return b.pos - a.pos;
        });
        // Check if the player is exploding
        card_array.every(card => {
            if (card.action === "chicken") {
                is_exploding = true;
                return false;
            }
            return true;
        });
    }
    // Return pretty player details
    return {
        _id: lobby_details.players[player_pos]._id,
        game_assign: game_details.slug,
        nickname: lobby_details.players[player_pos].nickname,
        avatar: lobby_details.players[player_pos].avatar,
        seat_pos: lobby_details.players[player_pos].seat_pos,
        wins: lobby_details.players[player_pos].wins,
        sockets_open: lobby_details.players[player_pos].sockets_open,
        is_connected: lobby_details.players[player_pos].is_connected,
        is_host: lobby_details.players[player_pos].is_host,
        is_exploding: is_exploding,
        is_dead: lobby_details.players[player_pos].is_dead,
        cards: card_array,
        created: moment(lobby_details.players[player_pos].created)
    };
}

// PRIVATE FUNCTIONS

// Name : rand_bucket(bucket)
// Desc : returns a random array position from a given bucket
// Author(s) : RAk3rman
function rand_bucket(bucket) {
    let randomIndex = Math.floor(Math.random()*bucket.length);
    return bucket.splice(randomIndex, 1)[0];
}
