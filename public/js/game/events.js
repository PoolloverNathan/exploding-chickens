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
let pending_plyr_select = false;
let events_data = {};
let events_length = 0;
let session_user = {
    _id: undefined,
    is_host: false
};

/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 SOCKET.IO EVENTS
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.socket.on.lobby-update
// Desc : whenever an event occurs containing a lobby update
socket.on("lobby-update", function (payload) {
    console.log("Lobby Trigger: " + payload.trigger);
    console.log(payload);
    // Check browser session
    setup_session_check(payload);
    // Update elements based on update trigger
    if (payload.trigger === "player-online" || payload.trigger === "player-offline") { // Existing player connected or disconnected
        sbr_update_pstatus(payload);
        itr_update_pstatus(payload);
        return;
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
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Host was updated</h1>'
        });
    } else if (payload.trigger === "kick-player") {
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Player was kicked</h1>'
        });
    } else if (payload.trigger === "completed-game") {
        return;
    }
    // Update entire ui
    socket.emit('retrieve-game', {
        lobby_slug: window.location.pathname.split('/')[2],
        game_slug: window.location.pathname.split('/')[4],
        plyr_id: session_user._id
    })
});

// Name : frontend-game.socket.on.game-update
// Desc : whenever an event occurs containing a game update
socket.on("game-update", function (payload) {
    if (window.location.pathname.split('/')[4] === payload.game_slug) {
        console.log("Game Trigger: " + payload.trigger);
        console.log(payload);
        // Check browser session
        setup_session_check(payload);
        // Update events log
        events_data = payload.events;
        events_length = payload.events_length;
        sbr_update_log();
        // Update if we are pending player selection
        if (pending_plyr_select) itr_update_players(payload); pending_plyr_select = false;
        // Update elements based on update trigger
        if (payload.trigger === "play-card") { // A card was played by a player
            sbr_update_game_widgets(payload);
            itr_update_players(payload);
            itr_update_pcards(payload);
            if (payload.req_plyr_id === session_user._id && !payload.callback.incomplete) { // Trigger animation if this player played a card
                // Display see the future element
                if (payload.callback.card.action === "seethefuture") {
                    sbr_update_game_widgets(payload);
                    itr_update_pcards(payload);
                    itr_update_discard(payload);
                    itr_update_hand(payload);
                    itr_trigger_stf(payload.callback.data);
                    return;
                } else {
                    anm_play_card(payload);
                }
            } else if (payload.req_plyr_id === session_user._id && payload.callback.incomplete) {
                if (payload.callback.card.action === "defuse") {
                    itr_trigger_chicken_target(payload.callback.data.max_pos, payload.callback.card._id);
                } else if (payload.callback.card.action === "favor" || payload.callback.card.action === "randchick-1" || payload.callback.card.action === "randchick-2" || payload.callback.card.action === "randchick-3" || payload.callback.card.action === "randchick-4") {
                    toast_turn.fire({
                        icon: 'info',
                        html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Select a player to target</h1>'
                    });
                    itr_update_players(payload, payload.callback.card._id, payload.req_plyr_id);
                    pending_plyr_select = true;
                } else {
                    toast_turn.close();
                    toast_alert.fire({
                        icon: 'error',
                        html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Invalid card callback</h1>'
                    });
                }
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
            toast_turn.close();
            toast_alert.fire({
                icon: 'info',
                html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Game has been reset</h1>'
            });
        } else if (payload.trigger === "completed-game") {
            itr_display_winner(payload.callback.data.winner_name);
            return;
        }
        // Update entire ui
        sbr_update_game_widgets(payload);
        sbr_update_players(payload);
        sbr_update_packs(payload);
        itr_update_players(payload);
        itr_update_discard(payload);
        itr_update_hand(payload);
    }
});

// Name : frontend-game.socket.on.{slug}-game-error
// Desc : whenever an event occurs related to an error
socket.on(window.location.pathname.split('/')[4] + "-game-error", function (payload) {
    console.log(payload);
    if (payload.msg === "GAME-DNE") {
        window.location.href = "/";
    } else {
        toast_alert.fire({
            icon: 'error',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">' + payload.msg + '</h1>'
        });
    }
});

// Name : frontend-game.socket.on.play-timeout
// Desc : whenever an event occurs related to an error
let play_timout_active = false;
socket.on("play-timeout", function (payload) {
    console.log(payload);
    if (payload.plyr_id === session_user._id) {
        if (play_timout_active) {
            document.getElementById("play_timeout_ctndwn").innerHTML = '<strong>' + payload.secs_remain + ' secs</strong> until force draw'
        } else {
            play_timout_active = true;
            Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: payload.secs_remain * 1000,
                padding: '0.4rem',
                timerProgressBar: true,
                background: "hsla(var(--b1) / var(--tw-bg-opacity))",
                didClose: (toast) => {
                    play_timout_active = false;
                }
            }).fire({
                icon: 'error',
                html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1" id="play_timeout_ctndwn"><strong>' + payload.secs_remain + ' secs</strong> until force draw</h1>'
            });
        }
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

// Name : frontend-game.kick_player(target_plyr_id)
// Desc : emits the kick-player event to kick a target player
function kick_player(target_plyr_id) {
    socket.emit('kick-player', {
        lobby_slug: window.location.pathname.split('/')[2],
        plyr_id: session_user._id,
        kick_plyr_id: target_plyr_id
    })
}

// Name : frontend-game.make_host(target_plyr_id)
// Desc : emits the make-host event to update the host
function make_host(target_plyr_id) {
    socket.emit('make-host', {
        lobby_slug: window.location.pathname.split('/')[2],
        plyr_id: session_user._id,
        suc_plyr_id: target_plyr_id
    })
}

// Name : frontend-game.play_card(card_id, t_plyr_id, t_card_id, t_deck_pos)
// Desc : emits the play-card event when a card in the players hand is clicked
function play_card(card_id, t_plyr_id, t_card_id, t_deck_pos) {
    socket.emit('play-card', {
        lobby_slug: window.location.pathname.split('/')[2],
        game_slug: window.location.pathname.split('/')[4],
        plyr_id: session_user._id,
        card_id: card_id,
        target: {
            plyr_id: t_plyr_id,
            card_id: t_card_id,
            deck_pos: t_deck_pos
        }
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