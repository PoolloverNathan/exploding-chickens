/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/player-actions.js
Desc     : handles all player actions
           and modifies players in game db
Author(s): RAk3rman, SengdowJones
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let Lobby = require('../models/lobby.js');
const { nanoid } = require('nanoid');
const moment = require("moment");

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');

// Name : player_actions.create_player(lobby_details, nickname, avatar)
// Desc : creates a new player
// Author(s) : RAk3rman
exports.create_player = async function (lobby_details, nickname, avatar) {
    // Push new player into existing lobby, await game assignment
    let plyr_id = nanoid(10);
    lobby_details.players.push({
        _id: plyr_id,
        nickname: nickname,
        avatar: avatar,
        is_host: lobby_details.players.length === 0
    });
    return plyr_id;
};

// Name : player_actions.get_player_details(lobby_details, plyr_id)
// Desc : return the details for a target player
// Author(s) : RAk3rman
exports.get_player_details = async function (lobby_details, plyr_id) {
    // Find player and return details
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.players[i]._id === plyr_id) {
            return lobby_details.players[i];
        }
    }
    return null;
}

// Name : player_actions.get_player_pos(lobby_details, plyr_id)
// Desc : return the details for a target player
// Author(s) : RAk3rman
exports.get_player_pos = async function (lobby_details, plyr_id) {
    // Find player and return details
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.players[i]._id === plyr_id) {
            return i;
        }
    }
    return null;
}

// Name : player_actions.get_turn_plyr_id(lobby_details, game_pos)
// Desc : return the plyr_id of the player who is currently playing
// Author(s) : RAk3rman
exports.get_turn_plyr_id = async function (lobby_details, game_pos) {
    // Find player and return details
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.games[game_pos]._id.equals(lobby_details.players[i].game_assign) && lobby_details.games[game_pos].turn_seat_pos === lobby_details.players[i].seat_pos) {
            return lobby_details.players[i]._id;
        }
    }
    return null;
}

// Name : player_actions.update_sockets_open(lobby_details, plyr_id, method)
// Desc : updates the connection for a target player
// Author(s) : RAk3rman
exports.update_sockets_open = async function (lobby_details, plyr_id, method) {
    // Find player and return new socket total
    for (let i = 0; i < lobby_details.players.length; i++) {
        if (lobby_details.players[i]._id === plyr_id) {
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
    // Get array of players
    let plyr_array = await game_actions.get_players(lobby_details, game_pos);
    // Add extra defuse cards to card bucket
    for (let i = 0; i < defuse_bucket.length - plyr_array.length; i++) {
        card_bucket.push(defuse_bucket[i]);
    }
    // Assign 5 cards to each player
    for (let i = 0; i < plyr_array.length; i++) {
        // Give 1 defuse card to each player
        let rand_defuse_pos = rand_bucket(defuse_bucket);
        lobby_details.games[game_pos].cards[rand_defuse_pos].assign = plyr_array[i]._id;
        lobby_details.games[game_pos].cards[rand_defuse_pos].pos = 0;
        // Choose remaining 4 cards at random
        for (let j = 1; j <= 4; j++) {
            let rand_card_pos = rand_bucket(card_bucket);
            lobby_details.games[game_pos].cards[rand_card_pos].assign = plyr_array[i]._id;
            lobby_details.games[game_pos].cards[rand_card_pos].pos = j;
        }
    }
    // Assign exploding chickens to draw deck
    for (let i = 0; i < plyr_array.length - 1; i++) {
        // Randomly pick ec
        let rand_card_pos = rand_bucket(exploding_bucket);
        lobby_details.games[game_pos].cards[rand_card_pos].assign = "draw_deck";
    }
    // Shuffle draw deck once we are done
    await card_actions.shuffle_draw_deck(lobby_details, game_pos);
}


// Name : player_actions.randomize_seats(lobby_details, game_pos)
// Desc : given a game_slug, gives each player a random seat position (without replacement)
// Author(s) : SengdowJones, RAk3rman
exports.randomize_seats = async function (lobby_details, game_pos) {
    // Get array of players
    let plyr_array = await game_actions.get_players(lobby_details, game_pos);
    // Create array containing each available seat
    let bucket = [];
    for (let i = 0; i < plyr_array.length; i++) {
        bucket.push(i);
    }
    // Update seat number for each player
    for (let i = 0; i < plyr_array.length; i++) {
        plyr_array.seat_pos = rand_bucket(bucket);
    }
}

// Name : player_actions.next_seat(lobby_details, game_pos, return_type)
// Desc : determine next seat position
// Author(s) : RAk3rman
exports.next_seat = async function (lobby_details, game_pos, return_type) {
    let pos = lobby_details.games[game_pos].turn_seat_pos;
    // Get array of players
    let plyr_array = await game_actions.get_players(lobby_details, game_pos);
    // Traverse until we find next open seat
    while (true) {
        // Increment or decrement pos based on direction
        if (lobby_details.games[game_pos].turn_dir === "forward") {
            pos++
            if (pos > plyr_array.length - 1) {
                pos = 0;
            }
        } else if (lobby_details.games[game_pos].turn_dir === "backward") {
            pos--;
            if (pos < 0) {
                pos = plyr_array.length - 1;
            }
        }
        // Find current seat and check to see if current seat is playing
        for (let i = 0; i < plyr_array.length; i++) {
            if (plyr_array[i].seat_pos === pos) {
                if (!plyr_array[i].is_dead) {
                    if (return_type === "seat_pos") {
                        return plyr_array[i].seat_pos
                    } else {
                        return plyr_array[i]._id
                    }
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

// Name : player_actions.kick_player(lobby_details, host_plyr_id, kick_plyr_id)
// Desc : remove a player from the game
// Author(s) : RAk3rman
exports.kick_player = async function (lobby_details, host_plyr_id, kick_plyr_id) {
    // Make sure they aren't kicking themselves
    if (host_plyr_id === kick_plyr_id) {
        return;
    }
    // Get kick position
    let kick_player_pos = await player_actions.get_player_pos(lobby_details, kick_plyr_id);
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
            await card_actions.kill_player(lobby_details, game_pos, kick_plyr_id);
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

// Name : player_actions.make_host(lobby_details, curr_plyr_id, suc_plyr_id)
// Desc : make a new player the host
// Author(s) : RAk3rman
exports.make_host = async function (lobby_details, curr_plyr_id, suc_plyr_id) {
    // Make sure they aren't making themselves a host
    if (curr_plyr_id === suc_plyr_id) {
        return;
    }
    // Find both players and modify type
    for (let i = 0; i < lobby_details.players.length; i++) {
        // Check if the player id's match, update changes
        if (lobby_details.players[i]._id === curr_plyr_id) {
            lobby_details.players[i].is_host = false;
        } else if (lobby_details.players[i]._id === suc_plyr_id) {
            lobby_details.players[i].is_host = true;
        }
    }
}

// Name : player_actions.sort_hand(lobby_details, game_pos, plyr_id)
// Desc : sort players hand, typically after a card is removed
// Author(s) : RAk3rman
exports.sort_hand = async function (lobby_details, game_pos, plyr_id) {
    // Get cards in player's hand
    let player_hand = [];
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        // If the card is assigned to this player, add to hand
        if (lobby_details.games[game_pos].cards[i].assign === plyr_id) {
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

// Name : player_actions.is_exploding(plyr_card_array)
// Desc : returns if a player is exploding
// Author(s) : RAk3rman
exports.is_exploding = async function (plyr_card_array) {
    let is_exploding = false;
    // Check if the player is exploding
    plyr_card_array.every(card => {
        if (card.action === "chicken") {
            is_exploding = true;
            return false;
        }
        return true;
    });
    return is_exploding;
}

// Name : player_actions.player_export(lobby_details, player_pos)
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
        is_exploding = await player_actions.is_exploding(card_array);
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
