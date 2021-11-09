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

// Name : card_actions.attack(game_details)
// Desc : forces the next player in turn order to take 2 consecutive turns
// Author(s) : RAk3rman
exports.attack = async function (game_details) {
    // Advance to the next seat
    game_details.seat_playing = await player_actions.next_seat(game_details);
    // Check how many turns we have left
    if (game_details.turns_remaining <= 1) { // Only one turn left, equal to two turns
        // Make sure the number of turns remaining is not 0
        game_details.turns_remaining = 2;
    } else { // Multiple turns left, turns_remaining
        game_details.turns_remaining += 2;
    }
    // Create new promise for game save
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

// Name : card_actions.kill_player(game_details, player_id)
// Desc : player exploded, removes player from game and frees cards
// Author(s) : RAk3rman
exports.kill_player = async function (game_details, player_id) {
    // Find player and update status
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        if (game_details.players[i]._id === player_id) {
            game_details.players[i].status = "dead";
            i = game_details.players.length;
        }
    }
    // Update all cards in player's hand to be "out of play"
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        if (game_details.cards[i].assignment === player_id) {
            game_details.cards[i].assignment = "out_of_play";
            game_details.cards[i].placed_by_id = "";
        }
    }
    // Create new promise for game save
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

// Name : card_actions.defuse(game_details, player_id, target, card_id)
// Desc : removes exploding chicken from hand and inserts randomly in deck
// Author(s) : RAk3rman
exports.defuse = async function (game_details, player_id, target, card_id) {
    // Verify player is exploding
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        if (game_details.players[i]._id === player_id) {
            if (game_details.players[i].status !== "exploding") {
                return {trigger: "error", data: "You cannot play this card now"};
            }
            i = game_details.players.length;
        }
    }
    // Verify target
    let ctn = 0;
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        // Increment draw deck count
        if (game_details.cards[i].assignment === "draw_deck") {
            ctn++;
        }
    }
    if (target < 0 || ctn < target || target === "") {
        return {trigger: "chicken_target", data: {
            max_pos: ctn, card_id: card_id
        }};
    }
    // Loop through each card to create array
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        // Find chicken that is assigned to target player
        if (game_details.cards[i].assignment === player_id && game_details.cards[i].action === "chicken") {
            game_details.cards[i].assignment = "draw_deck";
            game_details.cards[i].position = ctn - target;
            game_details.cards[i].placed_by_id = player_id;
        } else if (game_details.cards[i].assignment === "draw_deck" && game_details.cards[i].position >= ctn - target) { // Increment the rest of the cards
            game_details.cards[i].position++;
        }
    }
    // Update player status
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        if (game_details.players[i]._id === player_id) {
            game_details.players[i].status = "playing";
            i = game_details.players.length;
        }
    }
    // Create new promise for game save
    await new Promise((resolve, reject) => {
        // Save updated game
        game_details.save({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
    return true;
}

// Name : card_actions.verify_favor(game_details, player_id, target)
// Desc : verifies that the target player is able to give up a card
// Author(s) : RAk3rman
exports.verify_favor = async function (game_details, player_id, target) {
    // Make sure the player isn't asking itself
    if (player_id !== target) {
        // See if one card is assigned to target player
        for (let i = 0; i <= game_details.cards.length - 1; i++) {
            if (game_details.cards[i].assignment === target) {
                return true;
            }
        }
        return {trigger: "favor_target", data: ""}; // Request for valid target from client
    } else {
        return {trigger: "error", data: "You cannot ask yourself"};
    }
}

// Name : card_actions.verify_double(game_details, card_details, player_id)
// Desc : verifies that the current player has two of a kind, discards second card
// Author(s) : RAk3rman
exports.verify_double = async function (game_details, card_details, player_id, card_id) {
    // See if we have another card of the same action
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        if (game_details.cards[i].assignment === player_id && game_details.cards[i].action === card_details.action
        && game_details.cards[i]._id !== card_id) {
            return game_details.cards[i]._id;
        }
    }
    return false;
}

// Name : card_actions.ask_favor(game_details, player_id, target, used_gator, stats_storage)
// Desc : takes a random card from target player's hand and places in current player's hand
// Author(s) : RAk3rman
exports.ask_favor = async function (game_details, player_id, target, used_gator, stats_storage) {
    // Get cards in target and current player's hand
    let target_hand = await card_actions.filter_cards(target, game_details.cards);
    let current_hand = await card_actions.filter_cards(player_id, game_details.cards);
    // Check if target has favor gator
    for (let i = 0; i <= target_hand.length - 1; i++) {
        if (target_hand[i].action === "favorgator" && !used_gator) {
            await game_actions.discard_card(game_details, target_hand[i]._id);
            await game_actions.log_event(game_details, "play-card", target_hand[i].action, target_hand[i]._id, (await player_actions.get_player(game_details, player_id)).nickname, (await player_actions.get_player(game_details, target)).nickname);
            stats_storage.set('favor_gators', stats_storage.get('favor_gators') + 1);
            return await card_actions.ask_favor(game_details, target, player_id, true);
        }
    }
    // Determine random card
    let rand_pos = Math.floor(Math.random() * (target_hand.length - 1));
    // Update card details
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        if (game_details.cards[i]._id === target_hand[rand_pos]._id) {
            game_details.cards[i].assignment = player_id;
            game_details.cards[i].position = current_hand.length;
            break;
        }
    }
    await player_actions.sort_hand(game_details, target);
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
    return {
        card: target_hand[rand_pos],
        used_gator: used_gator
    };
}

// Name : card_actions.shuffle_draw_deck(game_details)
// Desc : shuffles the positions of all cards in the draw deck
// Author(s) : RAk3rman
exports.shuffle_draw_deck = async function (game_details) {
    // Loop through each card to create array
    let bucket = [];
    let cards_in_deck = 0;
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        //Check to see if card in draw deck
        if (game_details.cards[i].assignment === "draw_deck") {
            bucket.push(cards_in_deck);
            cards_in_deck++;
        }
    }
    // Loop though each card and reassign position
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        //Check to see if card in draw deck and not chicken
        if (game_details.cards[i].assignment === "draw_deck") {
            game_details.cards[i].position = rand_bucket(bucket);
            game_details.cards[i].placed_by_id = "";
        }
    }
    // Create new promise for game save
    return await new Promise((resolve, reject) => {
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

// Name : card_actions.reverse(game_details)
// Desc : reverse the current player order
// Author(s) : RAk3rman
exports.reverse = async function (game_details) {
    // Switch to forwards or backwards
    if (game_details.turn_direction === "forward") {
        game_details.turn_direction = "backward";
    } else if (game_details.turn_direction === "backward") {
        game_details.turn_direction = "forward";
    }
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

// Name : card_actions.defuse(game_details, player_id)
// Desc : removes exploding chicken from hand and inserts into next players hand
// Author(s) : RAk3rman
exports.hot_potato = async function (game_details, player_id) {
    // Verify player is exploding, update status
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        if (game_details.players[i]._id === player_id) {
            if (game_details.players[i].status !== "exploding") {
                return {trigger: "error", data: "You cannot play this card now"};
            } else {
                game_details.players[i].status = "playing";
            }
            break;
        }
    }
    // Advance to the next seat
    game_details.seat_playing = await player_actions.next_seat(game_details);
    // Make sure the number of turns remaining is 1
    game_details.turns_remaining = 1;
    // Find next player and update status
    let next_player_id = "";
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        if (game_details.players[i].seat === game_details.seat_playing) {
            game_details.players[i].status = "exploding";
            next_player_id = game_details.players[i]._id;
            break;
        }
    }
    // Assign chicken to next player
    let chicken_id = "";
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        if (game_details.cards[i].assignment === player_id && game_details.cards[i].action === "chicken") {
            game_details.cards[i].assignment = next_player_id;
            chicken_id = game_details.cards[i]._id;
            break;
        }
    }
    // Create new promise for game save
    await new Promise((resolve, reject) => {
        // Save updated game
        game_details.save({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
    return {
        trigger: "success",
        data: {
            next_player_id: next_player_id,
            chicken_id: chicken_id
        }
    };
}

// Name : card_actions.scrambled_eggs(game_details)
// Desc : put everyone's cards into a pool and re-deal deck
// Author(s) : RAk3rman
exports.scrambled_eggs = async function (game_details) {
    // Loop through each card to create array
    let bucket = [];
    let cards_in_deck = 0;
    let possible_assign = ["draw_deck", "out_of_play", "discard_deck"];
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        // Get all cards assigned to players
        if (!possible_assign.includes(game_details.cards[i].assignment)) {
            bucket.push(game_details.cards[i]._id);
            cards_in_deck++;
        }
    }
    // Loop though each player and get # of cards
    let player_card_ctn = [];
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        let cards = await card_actions.filter_cards(game_details.players[i]._id, game_details.cards);
        player_card_ctn[i] = cards.length;
    }
    // Loop though each player again and re-assign cards
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        for (let j = 0; j <= player_card_ctn[i] - 1; j++) {
            let selected_card_id = rand_bucket(bucket);
            // Find card and update assignment
            for (let k = 0; k <= game_details.cards.length - 1; k++) {
                if (game_details.cards[k]._id === selected_card_id) {
                    game_details.cards[k].assignment = game_details.players[i]._id;
                    game_details.cards[k].position = j;
                    break;
                }
            }
        }
    }
    // Create new promise for game save
    return await new Promise((resolve, reject) => {
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

// Name : card_actions.safety_draw(game_details)
// Desc : place the first card that is not an ec into a players hand, if all EC's, skip
// Author(s) : RAk3rman
exports.safety_draw = async function (game_details, player_id) {
    // Filter draw deck
    let draw_deck = await card_actions.filter_cards("draw_deck", game_details.cards);
    // Filter player hand
    let player_hand = await card_actions.filter_cards(player_id, game_details.cards);
    // Loop through draw_deck and find first non chicken
    let pos = draw_deck.length-1;
    for (let i = draw_deck.length-1; i >= 0; i--) {
        if (draw_deck[i].action !== "chicken") {
            pos = i;
            // Find card and update
            for (let j = 0; j <= game_details.cards.length - 1; j++) {
                if (game_details.cards[j]._id === draw_deck[i]._id) {
                    game_details.cards[j].assignment = player_id;
                    game_details.cards[j].position = player_hand.length;
                    break;
                }
            }
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
