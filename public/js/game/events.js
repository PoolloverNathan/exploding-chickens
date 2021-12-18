/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/game/events.js
Desc     : handles setup for player settings in browser
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Declare socket.io
let socket = io();
// Swal toast settings
const toast_alert = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    padding: '0.4rem',
    timerProgressBar: true,
    background: "hsla(var(--b1) / var(--tw-bg-opacity))"
});
// Set localStorage timeout
lscache.setExpiryMilliseconds(3600000);
// Global variables
let allow_connect_msg = false;
let events_data = {};
let events_length = 0;
let session_user = {
    _id: undefined,
    is_host: false
};

/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 SOCKET.IO EVENTS
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.socket.on.{slug}-lobby-update
// Desc : whenever an event occurs containing a lobby update
socket.on(window.location.pathname.split('/')[2] + "-lobby-update", function (payload) {
    console.log("Lobby Trigger: " + payload.trigger);
    console.log(payload);
    // Check browser session
    setup_session_check(payload);
    // Update events log
    events_data = payload.events;
    events_length = payload.events_length;
    sbr_update_log();
    // Update elements based on update trigger
    if (payload.trigger === "player-online") { // Existing player connected
        sbr_update_pstatus(payload);
        itr_update_pstatus(payload);
    } else if (payload.trigger === "make-host") {
        // Update host designation in session_user
        for (let i = 0; i < payload.players.length; i++) {
            // Check if individual player exists
            if (payload.players[i]._id === JSON.parse(lscache.get('ec_session_' + window.location.pathname.split('/')[2])).plyr_id) {
                // Update session_user _id and is_host
                session_user = {
                    _id: payload.players[i]._id,
                    is_host: payload.players[i].type === "host"
                };
                break;
            }
        }
        sbr_update_lobby_widgets(payload);
        sbr_update_options(payload);
        sbr_update_players(payload);
        sbr_update_packs(payload);
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Host was updated</h1>'
        });
    } else if (payload.trigger === "kick-player") {
        sbr_update_lobby_widgets(payload);
        sbr_update_players(payload);
        itr_update_games(payload);
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Player was kicked</h1>'
        });
    } else if (payload.trigger === "player-offline") { // Existing player disconnected
        sbr_update_pstatus(payload);
        itr_update_pstatus(payload);
    } else { // Update entire ui
        sbr_update_lobby_widgets(payload);
        sbr_update_options(payload);
        sbr_update_players(payload);
        sbr_update_packs(payload);
        itr_update_games(payload);
    }
});

// Name : frontend-game.socket.on.{slug}-game-update
// Desc : whenever an event occurs containing a game update
socket.on(window.location.pathname.split('/')[4] + "-game-update", function (payload) {
    console.log("Game Trigger: " + payload.trigger);
    console.log(payload);
    // Check browser session
    setup_session_check(payload);
    // Update events log
    events_data = payload.events;
    events_length = payload.events_length;
    sbr_update_log();
    // Update elements based on update trigger
    if (payload.trigger === "play-card") { // A card was played by a player
        sbr_update_game_widgets(payload);
        itr_update_players(payload);
        itr_update_pcards(payload);
        if (payload.req_plyr_id === session_user._id && !payload.callback.incomplete) { // Trigger animation if this player played a card
            anm_play_card(payload);
        } else if (payload.callback.incomplete) {
            console.log("INCOMPLETE CALLBACK TO HANDLE");
            // TODO Handle incomplete callbacks
        } else {
            itr_update_discard(payload);
            itr_update_hand(payload);
        }
        return;
    } else if (payload.trigger === "draw-card") { // A card was drawn by a player
        sbr_update_game_widgets(payload);
        itr_update_pcards(payload);
        itr_update_hand(payload);
        if (payload.req_plyr_id === session_user._id) { // Trigger animation if this player drew a card
            anm_draw_card(payload);
        }
        return;
    } else if (payload.trigger === "explode-tick") { // A player is currently exploding
        itr_trigger_exp(payload.callback.data.count, payload.callback.card, payload.callback.data.placed_by_name);
        return;
    } else if (payload.trigger === "reset-game") {
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Game has been reset</h1>'
        });
    } else if (payload.trigger === "game-complete") {
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Game has been won</h1>'
        });
    }
    // Update entire UI
    sbr_update_game_widgets(payload);
    sbr_update_players(payload);
    sbr_update_packs(payload);
    itr_update_players(payload);
    itr_update_discard(payload);
    itr_update_hand(payload);
});

// // Name : frontend-game.socket.on.{slug}-callback
// // Desc : whenever an event occurs related to an error
// socket.on(window.location.pathname.split('/')[4] + "-callback", function (data) {
//     // See the future callback
//     if (data.trigger === "seethefuture") {
//         itr_trigger_stf(data.payload);
//     } else if (data.trigger === "favor_target") {
//         itr_trigger_pselect(data.payload.game_details, data.payload.card_id);
//     } else if (data.trigger === "chicken_target") {
//         itr_trigger_chicken_target(parseInt(data.payload.max_pos), data.payload.card_id);
//     } else if (data.trigger === "favor_taken") {
//         sbr_update_game_widgets(data.payload.game_details);
//         itr_update_players(data.payload.game_details);
//         itr_update_pcards(data.payload.game_details);
//         itr_update_discard(data.payload.game_details);
//         itr_update_hand(data.payload.game_details);
//         events_data = data.payload.game_details.events;
//         events_length = data.payload.game_details.events_length;
//         sbr_update_log();
//         if (session_user._id === data.payload.target_plyr_id) {
//             itr_trigger_taken(data.payload.favor_player_name, data.payload.card_image_loc, data.payload.used_gator);
//         }
//     }
// });

// Name : frontend-game.socket.on.{slug}-game-error
// Desc : whenever an event occurs related to an error
socket.on(window.location.pathname.split('/')[4] + "-game-error", function (payload) {
    console.log(payload);
    if (payload.msg === "GAME-DNE") {
        window.location.href = "/";
    } else if (payload.msg === "PLYR-NAME") {
        setup_user_prompt(payload.game_details, "<i class=\"fas fa-exclamation-triangle\"></i> Please enter a valid nickname (letters only)", "");
    } else if (payload.msg === "PLYR-AVTR") {
        setup_user_prompt(payload.game_details, "<i class=\"fas fa-exclamation-triangle\"></i> Please select an avatar", "");
    } else {
        toast_alert.fire({
            icon: 'error',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">' + payload.msg + '</h1>'
        });
    }
});

// Name : frontend-game.socket.on.connect
// Desc : whenever we connect to the backend
socket.on("connect", function (payload) {
    // Update _id to mark as online
    session_user._id = undefined;
    // Request game update
    socket.emit('retrieve-game', {
        lobby_slug: window.location.pathname.split('/')[2],
        game_slug: window.location.pathname.split('/')[4],
        plyr_id: "spectator"
    })
    // Update status dot
    document.getElementById("status_ping").innerHTML = "<span class=\"animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75\"></span>\n" +
        "<span class=\"relative inline-flex rounded-full h-2 w-2 bg-green-500\"></span>"
    // Send alert
    if (allow_connect_msg) {
        toast_alert.fire({
            icon: 'success',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Connected</h1>'
        });
    } else {
        allow_connect_msg = true;
    }
});

// Name : frontend-game.socket.on.disconnect
// Desc : whenever we disconnect from the backend
socket.on("disconnect", function (payload) {
    // Update status dot
    document.getElementById("status_ping").innerHTML = "<span class=\"animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75\"></span>\n" +
        "<span class=\"relative inline-flex rounded-full h-2 w-2 bg-error\"></span>"
    // Send alert
    toast_alert.fire({
        icon: 'error',
        html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Disconnected</h1>'
    });
});

/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 PLAYER ACTION FUNCTIONS
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.reset_game()
// Desc : emits the reset-game event when the host clicks the reset game button
function reset_game() {
    socket.emit('reset-game', {
        lobby_slug: window.location.pathname.split('/')[2],
        game_slug: window.location.pathname.split('/')[4],
        plyr_id: session_user._id
    })
}

// Name : frontend-game.play_card(card_id, target)
// Desc : emits the play-card event when a card in the players hand is clicked
function play_card(card_id, target) {
    socket.emit('play-card', {
        lobby_slug: window.location.pathname.split('/')[2],
        game_slug: window.location.pathname.split('/')[4],
        plyr_id: session_user._id,
        card_id: card_id,
        target: target
    })
}

// Name : frontend-game.draw_card()
// Desc : emits the draw-card event when the draw deck is clicked
function draw_card() {
    socket.emit('draw-card', {
        lobby_slug: window.location.pathname.split('/')[2],
        game_slug: window.location.pathname.split('/')[4],
        plyr_id: session_user._id
    })
}

/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 CARD IMAGE PRELOAD
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

let images = [];
// Name : frontend-game.preload()
// Desc : preloads the images passed into it
function preload () {
    for (let i = 0; i < arguments.length; i++) {
        images[i] = new Image();
        images[i].src = preload.arguments[i];
    }
}

// Preload base card images
preload (
    "/public/cards/base/attack-1.png",
    "/public/cards/base/attack-2.png",
    "/public/cards/base/attack-3.png",
    "/public/cards/base/attack-4.png",
    "/public/cards/base/chicken.png",
    "/public/cards/base/defuse-1.png",
    "/public/cards/base/defuse-2.png",
    "/public/cards/base/defuse-3.png",
    "/public/cards/base/defuse-4.png",
    "/public/cards/base/defuse-5.png",
    "/public/cards/base/defuse-6.png",
    "/public/cards/base/favor-1.png",
    "/public/cards/base/favor-2.png",
    "/public/cards/base/favor-3.png",
    "/public/cards/base/favor-4.png",
    "/public/cards/base/randchick-1.png",
    "/public/cards/base/randchick-2.png",
    "/public/cards/base/randchick-3.png",
    "/public/cards/base/randchick-4.png",
    "/public/cards/base/reverse-1.png",
    "/public/cards/base/reverse-2.png",
    "/public/cards/base/reverse-3.png",
    "/public/cards/base/reverse-4.png",
    "/public/cards/base/seethefuture-1.png",
    "/public/cards/base/seethefuture-2.png",
    "/public/cards/base/seethefuture-3.png",
    "/public/cards/base/seethefuture-4.png",
    "/public/cards/base/seethefuture-5.png",
    "/public/cards/base/shuffle-1.png",
    "/public/cards/base/shuffle-2.png",
    "/public/cards/base/shuffle-3.png",
    "/public/cards/base/shuffle-4.png",
    "/public/cards/base/skip-1.png",
    "/public/cards/base/skip-2.png",
    "/public/cards/base/skip-3.png",
    "/public/cards/base/skip-4.png",
    "/public/cards/yolking_around/defuse-7.png",
    "/public/cards/yolking_around/defuse-8.png",
    "/public/cards/yolking_around/drawbottom-1.png",
    "/public/cards/yolking_around/drawbottom-2.png",
    "/public/cards/yolking_around/drawbottom-3.png",
    "/public/cards/yolking_around/drawbottom-4.png",
    "/public/cards/yolking_around/favorgator-1.png",
    "/public/cards/yolking_around/favorgator-2.png",
    "/public/cards/yolking_around/hotpotato-1.png",
    "/public/cards/yolking_around/safetydraw-1.png",
    "/public/cards/yolking_around/safetydraw-2.png",
    "/public/cards/yolking_around/safetydraw-3.png",
    "/public/cards/yolking_around/safetydraw-4.png",
    "/public/cards/yolking_around/scrambledeggs-1.png",
    "/public/cards/yolking_around/scrambledeggs-2.png",
    "/public/cards/yolking_around/superskip-1.png",
    "/public/cards/yolking_around/superskip-2.png",
    "/public/cards/yolking_around/superskip-3.png"
)