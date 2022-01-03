/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/card-actions.js
Desc     : all actions and helper functions
           related to card interaction
Author(s): RAk3rman, vmdo3, SengdowJones
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');

// Name : card_actions.attack(lobby_details, game_pos, card_id, callback)
// Desc : forces the next player in turn order to take 2 consecutive turns
// Author(s) : RAk3rman
exports.attack = function (lobby_details, game_pos, card_id, callback) {
    // Advance to the next seat
    lobby_details.games[game_pos].turn_seat_pos = player_actions.next_seat(lobby_details, game_pos, "seat_pos");
    // Check how many turns we have left
    if (lobby_details.games[game_pos].turns_remain <= 1) { // Only one turn left, equal to two turns
        // Make sure the number of turns remaining is not 0
        lobby_details.games[game_pos].turns_remain = 2;
    } else { // Multiple turns left, increase turns remaining by 2
        lobby_details.games[game_pos].turns_remain += 2;
    }
    // Discard card
    game_actions.discard_card(lobby_details, game_pos, card_id);
}

// Name : card_actions.defuse(lobby_details, game_pos, card_id, plyr_id, target, callback)
// Desc : removes exploding chicken from hand and inserts randomly in deck
// Author(s) : RAk3rman
exports.defuse = function (lobby_details, game_pos, card_id, plyr_id, target, callback) {
    console.log(target);
    // Verify target is valid
    let draw_deck = card_actions.filter_cards("draw_deck", lobby_details.games[game_pos].cards);
    if (target.deck_pos < 0 || draw_deck.length < target.deck_pos || target.deck_pos === undefined || target.deck_pos === '') {
        callback.incomplete = true;
        callback.data = { max_pos: draw_deck.length };
        return;
    }
    // Update each card and insert EC back into card array
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        // Find chicken that is assigned to req player
        if (lobby_details.games[game_pos].cards[i].assign === plyr_id && lobby_details.games[game_pos].cards[i].action === "chicken") {
            lobby_details.games[game_pos].cards[i].assign = "draw_deck";
            lobby_details.games[game_pos].cards[i].pos = target.deck_pos;
            lobby_details.games[game_pos].cards[i].placed_by_plyr_id = plyr_id;
        } else if (lobby_details.games[game_pos].cards[i].assign === "draw_deck" && lobby_details.games[game_pos].cards[i].pos >= target.deck_pos) { // Increment the rest of the cards
            lobby_details.games[game_pos].cards[i].pos++;
        }
    }
    // Discard card and advance turn
    game_actions.discard_card(lobby_details, game_pos, card_id);
    game_actions.advance_turn(lobby_details, game_pos);
}

// Name : card_actions.chicken(lobby_details, game_pos, plyr_id, callback)
// Desc : since chicken was played, player is killed and turn advances
// Author(s) : RAk3rman
exports.chicken = function (lobby_details, game_pos, plyr_id, callback) {
    // Kill player and advance turn
    card_actions.kill_player(lobby_details, game_pos, plyr_id);
    lobby_details.games[game_pos].turns_remain = 1;
    game_actions.advance_turn(lobby_details, game_pos);
}

// Name : card_actions.favor_targeted(lobby_details, game_pos, card_id, plyr_id, target, callback)
// Desc : allows a player to choose which card to give up after being targeted
// Author(s) : RAk3rman
exports.favor_targeted = function (lobby_details, game_pos, card_id, plyr_id, target, callback) {
    // First verify that the favor target is valid
    if (!card_actions.verify_favor_target_plyr(lobby_details, game_pos, plyr_id, target.plyr_id)) {
        callback.incomplete = true;
        return;
    }
    // Then verify that the target player has selected a card to give up
    if (!card_actions.verify_favor_target_card(lobby_details, game_pos, plyr_id, target.plyr_id, target.card_id)) {
        callback.incomplete = true;
        return;
    }
    // Get cards in current players hand
    let current_hand = card_actions.filter_cards(plyr_id, lobby_details.games[game_pos].cards);
    // Update card details
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i]._id === target.card_id) {
            // Update card
            lobby_details.games[game_pos].cards[i].assign = plyr_id;
            lobby_details.games[game_pos].cards[i].pos = current_hand.length;
            // Update callback
            callback.data = lobby_details.games[game_pos].cards[i];
            break;
        }
    }
    // Resort target players hand
    card_actions.sort_card_assign(lobby_details, game_pos, target.plyr_id);
    // Discard card
    game_actions.discard_card(lobby_details, game_pos, card_id);
}

// Name : card_actions.favor_random(lobby_details, game_pos, card_id, plyr_id, target, callback)
// Desc : asks a favor from a player randomly, takes random card from target hand and places in requesting player
// Author(s) : RAk3rman
exports.favor_random = function (lobby_details, game_pos, card_id, plyr_id, target, callback) {
    // If the player is playing a randchick, make sure they have two
    let double_result = card_actions.verify_double(lobby_details, game_pos, plyr_id, card_id, callback.card.action);
    if (!double_result && callback.card.action.includes("randchick")) {
        callback.err = "You must have 2 identical cards";
        return;
    }
    // Then verify that the favor target is valid
    if (!card_actions.verify_favor_target_plyr(lobby_details, game_pos, plyr_id, target.plyr_id)) {
        callback.incomplete = true;
        return;
    }
    // Get cards in current players hand
    let current_hand = card_actions.filter_cards(plyr_id, lobby_details.games[game_pos].cards);
    let target_hand = card_actions.filter_cards(target.plyr_id, lobby_details.games[game_pos].cards);
    // Determine random card
    let rand_pos = Math.floor(Math.random() * (target_hand.length - 1));
    // Update card details
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i]._id === target_hand[rand_pos]._id) {
            // Update card
            lobby_details.games[game_pos].cards[i].assign = plyr_id;
            lobby_details.games[game_pos].cards[i].pos = current_hand.length;
            // Update callback
            callback.data = lobby_details.games[game_pos].cards[i];
            break;
        }
    }
    // Resort target players hand
    card_actions.sort_card_assign(lobby_details, game_pos, target.plyr_id);
    // Discard card
    game_actions.discard_card(lobby_details, game_pos, card_id);
    if (double_result) game_actions.discard_card(lobby_details, game_pos, double_result);
}

// Name : card_actions.favor_gator(lobby_details, game_pos, card_id, plyr_id, target, callback)
// Desc : removes all favor/randchick cards from a players hand
// Author(s) : RAk3rman
exports.favor_gator = function (lobby_details, game_pos, card_id, plyr_id, target, callback) {
    // First verify that the favor target is valid
    if (!card_actions.verify_favor_target_plyr(lobby_details, game_pos, plyr_id, target.plyr_id)) {
        callback.incomplete = true;
        return;
    }
    // Update card details
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if ((lobby_details.games[game_pos].cards[i].action.includes("favor") || lobby_details.games[game_pos].cards[i].action.includes("randchick"))
            && lobby_details.games[game_pos].cards[i].assign === target.plyr_id) {
            lobby_details.games[game_pos].cards[i].assign = "out_of_play";
            lobby_details.games[game_pos].cards[i].placed_by_id = undefined;
        }
    }
    // Discard card
    game_actions.discard_card(lobby_details, game_pos, card_id);
}

// Name : card_actions.verify_favor_target_plyr(lobby_details, game_pos, plyr_id, target_plyr_id)
// Desc : verifies that the target player is able to give up a card
// Author(s) : RAk3rman
exports.verify_favor_target_plyr = function (lobby_details, game_pos, plyr_id, target_plyr_id) {
    // Base case
    if (target_plyr_id === undefined) return false;
    // Make sure the player isn't asking itself
    if (plyr_id !== target_plyr_id) {
        // See if one card is assigned to target player
        for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
            if (lobby_details.games[game_pos].cards[i].assign === target_plyr_id) {
                return true;
            }
        }
    }
    return false;
}

// Name : card_actions.verify_favor_target_card(lobby_details, game_pos, plyr_id, target_plyr_id, target_card_id)
// Desc : verifies that the target player has a specified card
// Author(s) : RAk3rman
exports.verify_favor_target_card = function (lobby_details, game_pos, plyr_id, target_plyr_id, target_card_id) {
    // Base case
    if (target_card_id === undefined) return false;
    // Make sure the card is in the target players hand
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i]._id === target_card_id) {
            return lobby_details.games[game_pos].cards[i].assign === target_plyr_id;
        }
    }
    return false;
}

// Name : card_actions.verify_double(lobby_details, game_pos, plyr_id, card_id, card_action)
// Desc : verifies that the current player has two of a kind, discards second card
// Author(s) : RAk3rman
exports.verify_double = function (lobby_details, game_pos, plyr_id, card_id, card_action) {
    // See if we have another card of the same action
    for (let i = 0; i <= lobby_details.games[game_pos].cards.length - 1; i++) {
        if (lobby_details.games[game_pos].cards[i].assign === plyr_id
            && lobby_details.games[game_pos].cards[i].action === card_action
            && lobby_details.games[game_pos].cards[i]._id !== card_id) {
            return lobby_details.games[game_pos].cards[i]._id;
        }
    }
    return false;
}

// Name : card_actions.reverse(lobby_details, game_pos, card_id, callback)
// Desc : reverse the current player order
// Author(s) : RAk3rman
exports.reverse = function (lobby_details, game_pos, card_id, callback) {
    // Switch to forwards or backwards
    if (lobby_details.games[game_pos].turn_dir === "forward") {
        lobby_details.games[game_pos].turn_dir = "backward";
    } else if (lobby_details.games[game_pos].turn_dir === "backward") {
        lobby_details.games[game_pos].turn_dir = "forward";
    }
    // Discard card and advance turn
    game_actions.discard_card(lobby_details, game_pos, card_id);
    game_actions.advance_turn(lobby_details, game_pos);
}

// Name : card_actions.seethefuture(lobby_details, game_pos, card_id, callback)
// Desc : return the next 3 cards in the draw deck through the callback
// Author(s) : RAk3rman
exports.seethefuture = function (lobby_details, game_pos, card_id, callback) {
    // Get the top three cards and add to callback.data
    let draw_deck = card_actions.filter_cards("draw_deck", lobby_details.games[game_pos].cards);
    // Sort deck by position
    draw_deck.sort(function(a, b) {
        return b.pos - a.pos;
    });
    callback.data = draw_deck.slice(Math.max(draw_deck.length - 3, 0));
    // Discard card
    game_actions.discard_card(lobby_details, game_pos, card_id);
}

// Name : card_actions.shuffle(lobby_details, game_pos, card_id, callback)
// Desc : call shuffle function and discard card
// Author(s) : RAk3rman
exports.shuffle = function (lobby_details, game_pos, card_id, callback) {
    // Call helper function
    card_actions.shuffle_draw_deck(lobby_details, game_pos);
    // Discard card
    game_actions.discard_card(lobby_details, game_pos, card_id);
}

// Name : card_actions.shuffle_draw_deck(lobby_details, game_pos)
// Desc : shuffles the positions of all cards in the draw deck
// Author(s) : RAk3rman
exports.shuffle_draw_deck = function (lobby_details, game_pos) {
    // Loop through each card to create array
    let bucket = [];
    let cards_in_deck = 0;
    for (let i = 0; i <= lobby_details.games[game_pos].cards.length - 1; i++) {
        //Check to see if card in draw deck
        if (lobby_details.games[game_pos].cards[i].assign === "draw_deck") {
            bucket.push(cards_in_deck);
            cards_in_deck++;
        }
    }
    // Loop though each card and reassign position
    for (let i = 0; i <= lobby_details.games[game_pos].cards.length - 1; i++) {
        //Check to see if card in draw deck and not chicken
        if (lobby_details.games[game_pos].cards[i].assign === "draw_deck") {
            lobby_details.games[game_pos].cards[i].pos = rand_bucket(bucket);
            lobby_details.games[game_pos].cards[i].placed_by_plyr_id = "";
        }
    }
}

// Name : card_actions.skip(lobby_details, game_pos, card_id, callback)
// Desc : advance turn by one and discard card
// Author(s) : RAk3rman
exports.skip = function (lobby_details, game_pos, card_id, callback) {
    // Discard card and advance turn
    game_actions.discard_card(lobby_details, game_pos, card_id);
    game_actions.advance_turn(lobby_details, game_pos);
}

// Name : card_actions.defuse(lobby_details, game_pos, card_id, plyr_id, callback)
// Desc : removes exploding chicken from hand and inserts into next players hand
// Author(s) : RAk3rman
exports.hot_potato = function (lobby_details, game_pos, card_id, plyr_id, callback) {
    // Complete super skip action (put curr number of turns on next player and discard card)
    card_actions.super_skip(lobby_details, game_pos, card_id, callback);
    // Assign chicken to next player
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i].assign === plyr_id && lobby_details.games[game_pos].cards[i].action === "chicken") {
            lobby_details.games[game_pos].cards[i].assign = player_actions.get_turn_plyr_id(lobby_details, game_pos);
            break;
        }
    }
}

// Name : card_actions.scrambled_eggs(lobby_details, game_pos, card_id, callback)
// Desc : put everyone's cards into a pool and re-deal deck
// Author(s) : RAk3rman
exports.scrambled_eggs = function (lobby_details, game_pos, card_id, callback) {
    // Loop through each card to create array
    let bucket = [];
    let cards_in_deck = 0;
    let possible_assign = ["draw_deck", "out_of_play", "discard_deck"];
    for (let i = 0; i <= lobby_details.games[game_pos].cards.length - 1; i++) {
        // Get all cards assigned to players
        if (!possible_assign.includes(lobby_details.games[game_pos].cards[i].assign)) {
            bucket.push(lobby_details.games[game_pos].cards[i]._id);
            cards_in_deck++;
        }
    }
    // Get array of players
    let plyr_array = game_actions.get_players(lobby_details, game_pos);
    // Loop though each player and get # of cards
    let player_card_ctn = [];
    for (let i = 0; i < plyr_array.length; i++) {
        player_card_ctn[i] = (card_actions.filter_cards(plyr_array[i]._id, lobby_details.games[game_pos].cards)).length;
    }
    // Loop though each player again and re-assign cards
    for (let i = 0; i < plyr_array.length; i++) {
        for (let j = 0; j < player_card_ctn[i]; j++) {
            let selected_card_id = rand_bucket(bucket);
            // Find card and update assignment
            for (let k = 0; k < lobby_details.games[game_pos].cards.length; k++) {
                if (lobby_details.games[game_pos].cards[k]._id === selected_card_id) {
                    lobby_details.games[game_pos].cards[k].assign = plyr_array[i]._id;
                    lobby_details.games[game_pos].cards[k].pos = j;
                    break;
                }
            }
        }
    }
    // Discard card
    game_actions.discard_card(lobby_details, game_pos, card_id);
}

// Name : card_actions.super_skip(lobby_details, game_pos, card_id, callback)
// Desc : offload number of turns onto next player in turn order
// Author(s) : RAk3rman
exports.super_skip = function (lobby_details, game_pos, card_id, callback) {
    // Store current number of turns and temp update to 1 remaining
    let temp_remain = lobby_details.games[game_pos].turns_remain;
    lobby_details.games[game_pos].turns_remain = 1;
    // Discard card and advance turn
    game_actions.discard_card(lobby_details, game_pos, card_id);
    game_actions.advance_turn(lobby_details, game_pos);
    // Restore actual number of turns remaining
    lobby_details.games[game_pos].turns_remain = temp_remain;
}

// Name : card_actions.safety_draw(lobby_details, game_pos, card_id, plyr_id, callback)
// Desc : place the first card that is not an ec into a players hand, if all EC's, skip
// Author(s) : RAk3rman
exports.safety_draw = function (lobby_details, game_pos, card_id, plyr_id, callback) {
    // Filter draw deck
    let draw_deck = card_actions.filter_cards("draw_deck", lobby_details.games[game_pos].cards);
    // Filter player hand
    let player_hand = card_actions.filter_cards(plyr_id, lobby_details.games[game_pos].cards);
    // Loop through draw_deck and find first card that is not a chicken
    for (let i = draw_deck.length - 1; i >= 0; i--) {
        if (draw_deck[i].action !== "chicken") {
            // Find card and update
            for (let j = 0; j <= lobby_details.games[game_pos].cards.length - 1; j++) {
                if (lobby_details.games[game_pos].cards[j]._id === draw_deck[i]._id) {
                    lobby_details.games[game_pos].cards[j].assign = plyr_id;
                    lobby_details.games[game_pos].cards[j].pos = player_hand.length;
                    break;
                }
            }
            break;
        }
    }
    // Discard card and advance turn
    game_actions.discard_card(lobby_details, game_pos, card_id);
    game_actions.advance_turn(lobby_details, game_pos);
}

// Name : card_actions.draw_bottom(lobby_details, game_pos, plyr_id)
// Desc : draw a card from the bottom of the draw deck and place it at the beginning of a players hand
// Author(s) : RAk3rman
exports.draw_bottom = function (lobby_details, game_pos, card_id, plyr_id, callback) {
    // Filter draw deck
    let draw_deck = card_actions.filter_cards("draw_deck", lobby_details.games[game_pos].cards);
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
    // Discard card
    game_actions.discard_card(lobby_details, game_pos, card_id);
    // Advance turn if card drawn is not a chicken
    let halt_cards = ["chicken"];
    if (!halt_cards.includes(draw_deck[pos].action)) {
        game_actions.advance_turn(lobby_details, game_pos);
    }
    // Append card details into data callback
    callback.data = draw_deck[pos];
}

// Name : card_actions.kill_player(lobby_details.games[game_pos], plyr_id)
// Desc : player exploded, removes player from game and frees cards
// Author(s) : RAk3rman
exports.kill_player = function (lobby_details, game_pos, plyr_id) {
    // Update all cards in player's hand to be "out of play"
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i].assign === plyr_id) {
            lobby_details.games[game_pos].cards[i].assign = "out_of_play";
            lobby_details.games[game_pos].cards[i].placed_by_id = "";
        }
    }
    // Find player and update is_dead
    lobby_details.players[player_actions.get_player_pos(lobby_details, plyr_id)].is_dead = true;
}

// Name : card_actions.filter_cards(assign, card_array)
// Desc : filters and sorts cards based on assign and position
// Author(s) : RAk3rman
exports.filter_cards = function (assign, card_array) {
    // Get cards based on assign
    let temp_deck = [];
    for (let i = 0; i < card_array.length; i++) {
        //If the card is assigned to this player, add to hand
        if (card_array[i].assign === assign) {
            temp_deck.push(card_array[i]);
        }
    }
    // Sort card hand by position
    temp_deck.sort(function(a, b) {
        return a.position - b.position;
    });
    return temp_deck;
}

// Name : card_actions.find_card(card_id, card_array)
// Desc : filters and returns the data for a card id
// Author(s) : RAk3rman
exports.find_card = function (card_id, card_array) {
    let temp_card = undefined;
    // Loop through card array until we find the card
    for (let i = 0; i < card_array.length; i++) {
        //If the card is assigned to this player, add to hand
        if (card_array[i]._id === card_id) {
            temp_card = card_array[i];
            i = card_array.length;
        }
    }
    return temp_card;
}

// Name : card_actions.sort_card_assign(lobby_details, game_pos, assign)
// Desc : sort cards related to a card assignment
// Author(s) : RAk3rman
exports.sort_card_assign = function (lobby_details, game_pos, assign) {
    // Get cards in player's hand
    let cards = [];
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        // If the card is assigned to this player, add to hand
        if (lobby_details.games[game_pos].cards[i].assign === assign) {
            cards.push({
                loc_pos: lobby_details.games[game_pos].cards[i].pos,
                gbl_pos: i
            });
        }
    }
    // Sort card hand by local position
    cards.sort(function(a, b) {
        return a.loc_pos - b.loc_pos;
    });
    // Overlay positions properly
    for (let i = 0; i <= cards.length - 1; i++) {
        lobby_details.games[game_pos].cards[cards[i].gbl_pos].pos = i;
    }
}

//PRIVATE FUNCTIONS

// Name : rand_bucket(bucket)
// Desc : returns a random array position from a given bucket
// Author(s) : RAk3rman
function rand_bucket(bucket) {
    let randomIndex = Math.floor(Math.random()*bucket.length);
    return bucket.splice(randomIndex, 1)[0];
}
