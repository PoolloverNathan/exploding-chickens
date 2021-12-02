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

// Name : card_actions.attack(lobby_details[game_pos])
// Desc : forces the next player in turn order to take 2 consecutive turns
// Author(s) : RAk3rman
exports.attack = async function (lobby_details, game_pos, card_id, callback) {
    // Advance to the next seat
    lobby_details.games[game_pos].turn_seat_pos = await player_actions.next_seat(lobby_details, game_pos);
    // Check how many turns we have left
    if (lobby_details.games[game_pos].turns_remain <= 1) { // Only one turn left, equal to two turns
        // Make sure the number of turns remaining is not 0
        lobby_details.games[game_pos].turns_remain = 2;
    } else { // Multiple turns left, increase turns remaining by 2
        lobby_details.games[game_pos].turns_remain += 2;
    }
    // Discard card
    await game_actions.discard_card(lobby_details, game_pos, card_id);
}

// Name : card_actions.defuse(lobby_details, game_pos, card_id, plyr_id, target, callback)
// Desc : removes exploding chicken from hand and inserts randomly in deck
// Author(s) : RAk3rman
exports.defuse = async function (lobby_details, game_pos, card_id, plyr_id, target, callback) {
    // Verify player is currently exploding
    if (!await player_actions.is_exploding(await card_actions.filter_cards(await player_actions.get_player_details(lobby_details, plyr_id)._id, lobby_details[game_pos].cards))) {
        callback.err = "Can only be used when exploding";
        return;
    }
    // Verify target is valid
    let draw_deck = await card_actions.filter_cards("draw_deck", lobby_details[game_pos].cards);
    if (target < 0 || draw_deck.length < target || target === "") {
        callback.incomplete = true;
        callback.data = { max_pos: draw_deck.length };
        return;
    }
    // Update each card and insert EC back into card array
    for (let i = 0; i <= lobby_details[game_pos].cards.length - 1; i++) {
        // Find chicken that is assigned to req player
        if (lobby_details[game_pos].cards[i].assign === plyr_id && lobby_details[game_pos].cards[i].action === "chicken") {
            lobby_details[game_pos].cards[i].assign = "draw_deck";
            lobby_details[game_pos].cards[i].pos = draw_deck.length - target;
            lobby_details[game_pos].cards[i].placed_by_plyr_id = plyr_id;
        } else if (lobby_details[game_pos].cards[i].assign === "draw_deck" && lobby_details[game_pos].cards[i].pos >= draw_deck.length - target) { // Increment the rest of the cards
            lobby_details[game_pos].cards[i].pos++;
        }
    }
    // Discard card and advance turn
    await game_actions.discard_card(lobby_details, game_pos, card_id);
    await game_actions.advance_turn(lobby_details, game_pos);
}

// // Name : card_actions.verify_favor(lobby_details[game_pos], plyr_id, target)
// // Desc : verifies that the target player is able to give up a card
// // Author(s) : RAk3rman
// exports.verify_favor = async function (lobby_details[game_pos], plyr_id, target) {
//     // Make sure the player isn't asking itself
//     if (plyr_id !== target) {
//         // See if one card is assigned to target player
//         for (let i = 0; i <= lobby_details[game_pos].cards.length - 1; i++) {
//             if (lobby_details[game_pos].cards[i].assignment === target) {
//                 return true;
//             }
//         }
//         return {trigger: "favor_target", data: ""}; // Request for valid target from client
//     } else {
//         return {trigger: "error", data: "You cannot ask yourself"};
//     }
// }
//
// // Name : card_actions.verify_double(lobby_details[game_pos], card_details, plyr_id)
// // Desc : verifies that the current player has two of a kind, discards second card
// // Author(s) : RAk3rman
// exports.verify_double = async function (lobby_details[game_pos], card_details, plyr_id, card_id) {
//     // See if we have another card of the same action
//     for (let i = 0; i <= lobby_details[game_pos].cards.length - 1; i++) {
//         if (lobby_details[game_pos].cards[i].assignment === plyr_id && lobby_details[game_pos].cards[i].action === card_details.action
//         && lobby_details[game_pos].cards[i]._id !== card_id) {
//             return lobby_details[game_pos].cards[i]._id;
//         }
//     }
//     return false;
// }
//
// // Name : card_actions.ask_favor(lobby_details[game_pos], plyr_id, target, used_gator, stats_storage)
// // Desc : takes a random card from target player's hand and places in current player's hand
// // Author(s) : RAk3rman
// exports.ask_favor = async function (lobby_details[game_pos], plyr_id, target, used_gator, stats_storage) {
//     // Get cards in target and current player's hand
//     let target_hand = await card_actions.filter_cards(target, lobby_details[game_pos].cards);
//     let current_hand = await card_actions.filter_cards(plyr_id, lobby_details[game_pos].cards);
//     // Check if target has favor gator
//     for (let i = 0; i <= target_hand.length - 1; i++) {
//         if (target_hand[i].action === "favorgator" && !used_gator) {
//             await game_actions.discard_card(lobby_details[game_pos], target_hand[i]._id);
//             await game_actions.log_event(lobby_details[game_pos], "play-card", target_hand[i].action, target_hand[i]._id, (await player_actions.get_player_details(lobby_details[game_pos], plyr_id)).nickname, (await player_actions.get_player_details(lobby_details[game_pos], target)).nickname);
//             stats_storage.set('favor_gators', stats_storage.get('favor_gators') + 1);
//             return await card_actions.ask_favor(lobby_details[game_pos], target, plyr_id, true);
//         }
//     }
//     // Determine random card
//     let rand_pos = Math.floor(Math.random() * (target_hand.length - 1));
//     // Update card details
//     for (let i = 0; i <= lobby_details[game_pos].cards.length - 1; i++) {
//         if (lobby_details[game_pos].cards[i]._id === target_hand[rand_pos]._id) {
//             lobby_details[game_pos].cards[i].assignment = plyr_id;
//             lobby_details[game_pos].cards[i].position = current_hand.length;
//             break;
//         }
//     }
//     await player_actions.sort_hand(lobby_details[game_pos], target);
//     // Create new promise for game save
//     await new Promise((resolve, reject) => {
//         //Save updated game
//         lobby_details[game_pos].save({}, function (err) {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve();
//             }
//         });
//     });
//     return {
//         card: target_hand[rand_pos],
//         used_gator: used_gator
//     };
// }

// Name : card_actions.shuffle_draw_deck(lobby_details, game_pos)
// Desc : shuffles the positions of all cards in the draw deck
// Author(s) : RAk3rman
exports.shuffle_draw_deck = async function (lobby_details, game_pos) {
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

// // Name : card_actions.reverse(lobby_details[game_pos])
// // Desc : reverse the current player order
// // Author(s) : RAk3rman
// exports.reverse = async function (lobby_details[game_pos]) {
//     // Switch to forwards or backwards
//     if (lobby_details[game_pos].turn_direction === "forward") {
//         lobby_details[game_pos].turn_direction = "backward";
//     } else if (lobby_details[game_pos].turn_direction === "backward") {
//         lobby_details[game_pos].turn_direction = "forward";
//     }
//     // Create new promise for game save
//     await new Promise((resolve, reject) => {
//         //Save updated game
//         lobby_details[game_pos].save({}, function (err) {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve();
//             }
//         });
//     });
// }
//
// // Name : card_actions.defuse(lobby_details[game_pos], plyr_id)
// // Desc : removes exploding chicken from hand and inserts into next players hand
// // Author(s) : RAk3rman
// exports.hot_potato = async function (lobby_details[game_pos], plyr_id) {
//     // Verify player is exploding, update status
//     for (let i = 0; i <= lobby_details[game_pos].players.length - 1; i++) {
//         if (lobby_details[game_pos].players[i]._id === plyr_id) {
//             if (lobby_details[game_pos].players[i].status !== "exploding") {
//                 return {trigger: "error", data: "You cannot play this card now"};
//             } else {
//                 lobby_details[game_pos].players[i].status = "playing";
//             }
//             break;
//         }
//     }
//     // Advance to the next seat
//     lobby_details[game_pos].seat_playing = await player_actions.next_seat(lobby_details[game_pos]);
//     // Make sure the number of turns remaining is 1
//     lobby_details[game_pos].turns_remaining = 1;
//     // Find next player and update status
//     let next_plyr_id = "";
//     for (let i = 0; i <= lobby_details[game_pos].players.length - 1; i++) {
//         if (lobby_details[game_pos].players[i].seat === lobby_details[game_pos].seat_playing) {
//             lobby_details[game_pos].players[i].status = "exploding";
//             next_plyr_id = lobby_details[game_pos].players[i]._id;
//             break;
//         }
//     }
//     // Assign chicken to next player
//     let chicken_id = "";
//     for (let i = 0; i <= lobby_details[game_pos].cards.length - 1; i++) {
//         if (lobby_details[game_pos].cards[i].assignment === plyr_id && lobby_details[game_pos].cards[i].action === "chicken") {
//             lobby_details[game_pos].cards[i].assignment = next_plyr_id;
//             chicken_id = lobby_details[game_pos].cards[i]._id;
//             break;
//         }
//     }
//     // Create new promise for game save
//     await new Promise((resolve, reject) => {
//         // Save updated game
//         lobby_details[game_pos].save({}, function (err) {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve();
//             }
//         });
//     });
//     return {
//         trigger: "success",
//         data: {
//             next_plyr_id: next_plyr_id,
//             chicken_id: chicken_id
//         }
//     };
// }
//
// // Name : card_actions.scrambled_eggs(lobby_details[game_pos])
// // Desc : put everyone's cards into a pool and re-deal deck
// // Author(s) : RAk3rman
// exports.scrambled_eggs = async function (lobby_details[game_pos]) {
//     // Loop through each card to create array
//     let bucket = [];
//     let cards_in_deck = 0;
//     let possible_assign = ["draw_deck", "out_of_play", "discard_deck"];
//     for (let i = 0; i <= lobby_details[game_pos].cards.length - 1; i++) {
//         // Get all cards assigned to players
//         if (!possible_assign.includes(lobby_details[game_pos].cards[i].assignment)) {
//             bucket.push(lobby_details[game_pos].cards[i]._id);
//             cards_in_deck++;
//         }
//     }
//     // Loop though each player and get # of cards
//     let player_card_ctn = [];
//     for (let i = 0; i <= lobby_details[game_pos].players.length - 1; i++) {
//         let cards = await card_actions.filter_cards(lobby_details[game_pos].players[i]._id, lobby_details[game_pos].cards);
//         player_card_ctn[i] = cards.length;
//     }
//     // Loop though each player again and re-assign cards
//     for (let i = 0; i <= lobby_details[game_pos].players.length - 1; i++) {
//         for (let j = 0; j <= player_card_ctn[i] - 1; j++) {
//             let selected_card_id = rand_bucket(bucket);
//             // Find card and update assignment
//             for (let k = 0; k <= lobby_details[game_pos].cards.length - 1; k++) {
//                 if (lobby_details[game_pos].cards[k]._id === selected_card_id) {
//                     lobby_details[game_pos].cards[k].assignment = lobby_details[game_pos].players[i]._id;
//                     lobby_details[game_pos].cards[k].position = j;
//                     break;
//                 }
//             }
//         }
//     }
//     // Create new promise for game save
//     return await new Promise((resolve, reject) => {
//         //Save updated game
//         lobby_details[game_pos].save({}, function (err) {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve();
//             }
//         });
//     });
// }
//
// // Name : card_actions.safety_draw(lobby_details[game_pos])
// // Desc : place the first card that is not an ec into a players hand, if all EC's, skip
// // Author(s) : RAk3rman
// exports.safety_draw = async function (lobby_details[game_pos], plyr_id) {
//     // Filter draw deck
//     let draw_deck = await card_actions.filter_cards("draw_deck", lobby_details[game_pos].cards);
//     // Filter player hand
//     let player_hand = await card_actions.filter_cards(plyr_id, lobby_details[game_pos].cards);
//     // Loop through draw_deck and find first non chicken
//     let pos = draw_deck.length-1;
//     for (let i = draw_deck.length-1; i >= 0; i--) {
//         if (draw_deck[i].action !== "chicken") {
//             pos = i;
//             // Find card and update
//             for (let j = 0; j <= lobby_details[game_pos].cards.length - 1; j++) {
//                 if (lobby_details[game_pos].cards[j]._id === draw_deck[i]._id) {
//                     lobby_details[game_pos].cards[j].assignment = plyr_id;
//                     lobby_details[game_pos].cards[j].position = player_hand.length;
//                     break;
//                 }
//             }
//             break;
//         }
//     }
//     // Create new promise to save game
//     return await new Promise((resolve, reject) => {
//         // Save updated game
//         lobby_details[game_pos].save({}, function (err) {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve(draw_deck[pos]);
//             }
//         });
//     });
// }

// Name : card_actions.kill_player(lobby_details[game_pos], plyr_id)
// Desc : player exploded, removes player from game and frees cards
// Author(s) : RAk3rman
exports.kill_player = async function (lobby_details, game_pos, plyr_id) {
    // Find player and update is_dead
    lobby_details.players[await player_actions.get_player_pos(lobby_details, plyr_id)].is_dead = true;
    // Update all cards in player's hand to be "out of play"
    for (let i = 0; i <= lobby_details.games[game_pos].cards.length - 1; i++) {
        if (lobby_details.games[game_pos].cards[i].assign === plyr_id) {
            lobby_details.games[game_pos].cards[i].assign = "out_of_play";
            lobby_details.games[game_pos].cards[i].placed_by_id = undefined;
        }
    }
}

// Name : card_actions.filter_cards(assign, card_array)
// Desc : filters and sorts cards based on assign and position
// Author(s) : RAk3rman
exports.filter_cards = async function (assign, card_array) {
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
exports.find_card = async function (card_id, card_array) {
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

//PRIVATE FUNCTIONS

// Name : rand_bucket(bucket)
// Desc : returns a random array position from a given bucket
// Author(s) : RAk3rman
function rand_bucket(bucket) {
    let randomIndex = Math.floor(Math.random()*bucket.length);
    return bucket.splice(randomIndex, 1)[0];
}
