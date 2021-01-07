/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/player-actions.js
Desc     : handles all player actions
           and modifies players in game db
Author(s): RAk3rman, SengdowJones
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

//Packages
let game = require('../models/game.js');
const { v4: uuidv4 } = require('uuid');
const dataStore = require('data-store');
const config_storage = new dataStore({path: './config/config.json'});
let verbose_debug_mode = config_storage.get('verbose_debug_mode');

//Services
let card_actions = require('../services/card-actions.js');
let game_actions = require('../services/game-actions.js');
let player_actions = require('./player-actions.js');

// Name : player_actions.modify_player()
// Desc : modifies an existing player, if it doesn't exist, make new player
// Author(s) : RAk3rman
exports.modify_player = async function (game_slug, player_id, p_nickname, p_seat, p_avatar, p_type, p_status, p_connection) {
    //Check if player exists
    if (await game.exists({ slug: game_slug, "players._id": player_id })) { //Modify existing player
        //Create new promise and return player id after saved
        return await new Promise((resolve, reject) => {
            //Update existing player and return player_id
            game.findOneAndUpdate({ slug: game_slug, "players._id": player_id }, {"$set": { "players.$.nickname": p_nickname, "players.$.seat": p_seat, "players.$.avatar": p_avatar, "players.$.status": p_status, "players.$.type": p_type, "players.$.connection": p_connection }}, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(player_id);
                }
            });
        })
    } else { //Create new player
        //Get game details
        let game_details = await game_actions.game_details_slug(game_slug);
        //Create new promise and return player id after saved
        return await new Promise((resolve, reject) => {
            //Create new player id
            if (!player_id) {
                player_id = uuidv4();
            }
            //Push new player into existing game
            game_details.players.push({ _id: player_id, nickname: p_nickname, seat: p_seat, avatar: p_avatar, type: p_type, status: p_status, connection: p_connection });
            //Save existing game and return player_id
            game_details.save(function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(player_id);
                }
            });
        })
    }
};

// Name : player_actions.update_connection(game_slug, player_id, p_connection))
// Desc : updates the connection for a target player
// Author(s) : RAk3rman
exports.update_connection = async function (game_slug, player_id, p_connection) {
    //Create new promise and return player id after saved
    return await new Promise((resolve, reject) => {
        //Update existing player and return player_id
        game.findOneAndUpdate({ slug: game_slug, "players._id": player_id }, {"$set": { "players.$.connection": p_connection }}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(player_id);
            }
        });
    })
};

// Name : player_actions.create_hand(game_slug)
// Desc : given a game_slug, gives each player a defuse card and 4 random cards from the draw_deck
// Author(s) : RAk3rman
exports.create_hand = async function (game_slug) {
    //Get game details
    let game_details = await game_actions.game_details_slug(game_slug);
    //Create array containing the position of each defuse card and regular card
    let defuseBucket = [];
    let cardBucket = [];
    for (let i = 0; i <= game_details.cards.length - 1; i++) {
        if (game_details.cards[i].action === "defuse") {
            defuseBucket.push(i);
        } else if (game_details.cards[i].action !== "exploding") {
            cardBucket.push(i);
        }
    }
    //Assign defuse card to player id in first position
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        let rand_defuse_pos = rand_bucket(defuseBucket);
        game_details.cards[rand_defuse_pos].assignment = game_details.players[i]._id;
        game_details.cards[rand_defuse_pos].position = 0;
    }
    //Add remaining defuse cards to card bucket
    for (let i = 0; i <= defuseBucket.length - 1; i++) {
        cardBucket.push(defuseBucket[i]);
    }
    //Assign remaining 4 cards to each player
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        //Over 4 cards on the same player
        for (let j = 1; j <= 4; j++) {
            let rand_card_pos = rand_bucket(cardBucket);
            game_details.cards[rand_card_pos].assignment = game_details.players[i]._id;
            game_details.cards[rand_card_pos].position = j;
        }
    }
    //Create new promise
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
    //Shuffle draw deck once we are done
    await card_actions.shuffle_draw_deck(game_slug);
}


// Name : player_actions.randomize_seats(game_slug)
// Desc : given a game_slug, gives each player a random seat position (without replacement)
// Author(s) : SengdowJones, RAk3rman
exports.randomize_seats = async function (game_slug) {
    //Get game details
    let game_details = await game_actions.game_details_slug(game_slug);
    //Create array containing each available seat
    let bucket = [];
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        bucket.push(i)
    }
    //Update seat number for each player
    for (let i = 0; i <= game_details.players.length - 1; i++) {
        game_details.players[i].seat = rand_bucket(bucket);
    }
    //Create new promise
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

//PRIVATE FUNCTIONS

// Name : rand_bucket(bucket)
// Desc : returns a random array position from a given bucket
// Author(s) : RAk3rman
function rand_bucket(bucket) {
    let randomIndex = Math.floor(Math.random()*bucket.length);
    return bucket.splice(randomIndex, 1)[0];
}