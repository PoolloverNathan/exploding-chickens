/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/event-actions.js
Desc     : handles all event actions
           and modifies events in game db
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');

// Name : lobby_actions.log_event(details, tag, req_plyr_id, target_plyr_id, rel_id)
// Desc : creates a new event
// Author(s) : RAk3rman
exports.log_event = async function (details, tag, req_plyr_id, target_plyr_id, rel_id) {
    details.events.push({
        tag: tag,
        req_plyr_id: req_plyr_id,
        target_plyr_id: target_plyr_id,
        rel_id: rel_id
    });
    return details;
}
