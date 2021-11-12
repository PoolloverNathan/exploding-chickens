/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/game/setup.js
Desc     : handles setup for player settings in browser
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.setup_session_check(lobby_details)
// Desc : check local user configuration on browser
function setup_session_check(game_details) {
    lscache.flushExpired();
    // Get browser session details
    if (!lscache.get('ec_session_' + window.location.pathname.split('/')[2])) {
        // Reset local storage and session player since game data doesn't exist
        lscache.set('ec_session_' + window.location.pathname.split('/')[2], JSON.stringify({
            lobby_slug: window.location.pathname.split('/')[2],
            player_id: undefined
        }), 12);
        session_user = {
            _id: undefined,
            is_host: false
        };
    } else if (JSON.parse(lscache.get('ec_session_' + window.location.pathname.split('/')[2])).lobby_slug !== window.location.pathname.split('/')[2]) {
        // Reset local storage and session player since slugs don't match
        lscache.set('ec_session_' + window.location.pathname.split('/')[2], JSON.stringify({
            lobby_slug: window.location.pathname.split('/')[2],
            player_id: undefined
        }), 12);
        session_user = {
            _id: undefined,
            is_host: false
        };
    } else {
        // Check to make sure that the player is valid
        for (let i = 0; i < game_details.players.length; i++) {
            // Check if individual player exists
            if (game_details.players[i]._id === JSON.parse(lscache.get('ec_session_' + window.location.pathname.split('/')[2])).player_id) {
                if (session_user._id === undefined) {
                    // Tell server that a valid player connected
                    socket.emit('player-online', {
                        lobby_slug: window.location.pathname.split('/')[2],
                        player_id: game_details.players[i]._id
                    })
                }
                // Update session_user _id and is_host
                session_user = {
                    _id: game_details.players[i]._id,
                    is_host: game_details.players[i].is_host
                };
                break;
            }
        }
    }
}