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
    timerProgressBar: true
});
// Global variables
let allow_connect_msg = false;
let cooldown = false;
let events_data = {};
let session_user = {
    _id: undefined,
    is_host: false,
    can_draw: false
};

/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 SOCKET.IO EVENTS
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.socket.on.{slug}-update
// Desc : whenever an event occurs containing a game update
socket.on(window.location.pathname.substr(6) + "-update", function (data) {
    console.log(data.trigger);
    // Check browser session and update log
    setup_session_check(data);
    events_data = data.events;
    sbr_update_log();
    // Update elements based on update trigger
    if (data.trigger === "player-online") { // Existing player connected
        sbr_update_pstatus(data);
        itr_update_pstatus(data);
        // if (data.req_player_id === session_user._id) {
        //     itr_update_hand(data);
        // }
    } else if (data.trigger === "create-player") { // New player was created
        if (user_prompt_open) {
            setup_update_options(data);
        }
        sbr_update_widgets(data);
        sbr_update_players(data);
        sbr_update_packs(data);
        itr_update_players(data);
    } else if (data.trigger === "start-game") { // Game started
        sbr_update_widgets(data);
        sbr_update_pstatus(data);
        itr_update_players(data);
        itr_update_pcards(data);
        itr_update_discard(data);
        itr_deal_hand(data, "", 0);
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Game has started</h1>'
        });
    } else if (data.trigger === "reset-game") { // Game was reset or there is a winner
        sbr_update_widgets(data);
        sbr_update_pstatus(data);
        itr_update_pstatus(data);
        itr_update_pcards(data);
        itr_update_discard(data);
        itr_update_hand(data);
        // Check if we have a winner
        let winner = false;
        for (let i = 0; i < data.players.length; i++) {
            if (data.players[i].status === "winner") {
                itr_display_winner(data, data.players[i].nickname, 0);
                winner = true;
                break;
            }
        }
        if (winner === false) {
            toast_alert.fire({
                icon: 'info',
                html: '<h1 class="text-lg font-bold pl-2 pr-1">Game has been reset</h1>'
            });
        }
    } else if (data.trigger === "play-card") { // A card was played by a player
        if (data.req_player_id !== session_user._id) {
            itr_update_discard(data);
            itr_update_hand(data);
        }
        sbr_update_widgets(data);
        itr_update_players(data);
        itr_update_pcards(data);
    } else if (data.trigger === "draw-card") { // A card was drawn by a player
        sbr_update_widgets(data);
        itr_update_pcards(data);
        itr_update_hand(data);
    } else if (data.trigger === "make-host") {
        // Update host designation in session_user
        for (let i = 0; i < data.players.length; i++) {
            // Check if individual player exists
            if (data.players[i]._id === JSON.parse(localStorage.getItem('ec_session')).player_id) {
                // Update session_user _id and is_host
                session_user = {
                    _id: data.players[i]._id,
                    is_host: data.players[i].type === "host",
                    can_draw: session_user.can_draw
                };
                break;
            }
        }
        sbr_update_widgets(data);
        sbr_update_players(data);
        sbr_update_packs(data);
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Host was updated</h1>'
        });
    } else if (data.trigger === "kick-player") {
        sbr_update_widgets(data);
        sbr_update_players(data);
        itr_update_players(data);
        itr_update_discard(data);
        itr_update_hand(data);
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Player was kicked</h1>'
        });
    } else if (data.trigger === "import-pack") {
        sbr_update_widgets(data);
        sbr_update_packs(data);
        toast_turn.close();
        toast_alert.fire({
            icon: 'success',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Pack was imported</h1>'
        });
    } else if (data.trigger === "export-pack") {
        sbr_update_widgets(data);
        sbr_update_packs(data);
        toast_turn.close();
        toast_alert.fire({
            icon: 'success',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Pack was removed</h1>'
        });
    } else if (data.trigger === "player-offline") { // Existing player disconnected
        sbr_update_pstatus(data);
        itr_update_pstatus(data);
    } else { // Update entire ui
        sbr_update_widgets(data);
        sbr_update_players(data);
        sbr_update_packs(data);
        itr_update_players(data);
        itr_update_discard(data);
        itr_update_hand(data);
    }
});

// Name : frontend-game.socket.on.{slug}-callback
// Desc : whenever an event occurs related to an error
socket.on(window.location.pathname.substr(6) + "-callback", function (data) {
    cooldown = false;
    // See the future callback
    if (data.trigger === "seethefuture") {
        itr_trigger_stf(data.payload);
    } else if (data.trigger === "favor_target") {
        itr_trigger_pselect(data.payload.game_details, data.payload.card_id);
    } else if (data.trigger === "chicken_target") {
        itr_trigger_chicken_target(parseInt(data.payload.max_pos), data.payload.card_id);
    } else if (data.trigger === "favor_taken") {
        sbr_update_widgets(data.payload.game_details);
        itr_update_players(data.payload.game_details);
        itr_update_pcards(data.payload.game_details);
        itr_update_discard(data.payload.game_details);
        itr_update_hand(data.payload.game_details);
        events_data = data.payload.game_details.events;
        sbr_update_log();
        if (session_user._id === data.payload.target_player_id) {
            itr_trigger_taken(data.payload.favor_player_name, data.payload.card_image_loc, data.payload.used_gator);
        }
    }
});

// Name : frontend-game.socket.on.player-created
// Desc : whenever an event occurs stating that a player was created
socket.on("player-created", function (data) {
    // Update player_id
    session_user._id = data;
    localStorage.setItem('ec_session', JSON.stringify({
        slug: window.location.pathname.substr(6),
        player_id: data
    }));
});

// Name : frontend-game.socket.on.{slug}-error
// Desc : whenever an event occurs related to an error
socket.on(window.location.pathname.substr(6) + "-error", function (data) {
    cooldown = false;
    if (data.msg === "GAME-DNE") {
        window.location.href = "/";
    } else if (data.msg === "PLYR-NAME") {
        setup_user_prompt(data.game_details, "<i class=\"fas fa-exclamation-triangle\"></i> Please enter a valid nickname (letters only)", "");
    } else if (data.msg === "PLYR-AVTR") {
        setup_user_prompt(data.game_details, "<i class=\"fas fa-exclamation-triangle\"></i> Please select an avatar", "");
    } else {
        toast_alert.fire({
            icon: 'error',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">' + data.msg + '</h1>'
        });
    }
});

// Name : frontend-game.socket.on.{slug}-draw-card
// Desc : whenever the player draws a card, triggers animation
socket.on(window.location.pathname.substr(6) + "-draw-card", function (data) {
    anm_draw_card(data);
    cooldown = false;
});

// Name : frontend-game.socket.on.{slug}-play-card
// Desc : whenever the player plays a card, triggers animation
socket.on(window.location.pathname.substr(6) + "-play-card", function (data) {
    anm_play_card(data);
    cooldown = false;
});

// Name : frontend-game.socket.on.{slug}-explode-tick
// Desc : whenever the player plays a card, triggers animation
socket.on(window.location.pathname.substr(6) + "-explode-tick", function (data) {
    console.log("explode-tick");
    itr_trigger_exp(data.count, data.placed_by_name, data.card_url);
});

// Name : frontend-game.socket.on.connect
// Desc : whenever we connect to the backend
socket.on("connect", function (data) {
    // Update _id to mark as online
    session_user._id = undefined;
    // Request game update
    socket.emit('retrieve-game', {
        slug: window.location.pathname.substr(6),
        player_id: "spectator"
    })
    // Update status dot
    document.getElementById("status_ping").innerHTML = "<span class=\"animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75\"></span>\n" +
        "<span class=\"relative inline-flex rounded-full h-2 w-2 bg-green-500\"></span>"
    // Send alert
    if (allow_connect_msg) {
        toast_alert.fire({
            icon: 'success',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Connected</h1>'
        });
    } else {
        allow_connect_msg = true;
    }
});

// Name : frontend-game.socket.on.disconnect
// Desc : whenever we disconnect from the backend
socket.on("disconnect", function (data) {
    // Update status dot
    document.getElementById("status_ping").innerHTML = "<span class=\"animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75\"></span>\n" +
        "<span class=\"relative inline-flex rounded-full h-2 w-2 bg-red-500\"></span>"
    // Send alert
    toast_alert.fire({
        icon: 'error',
        html: '<h1 class="text-lg font-bold pl-2 pr-1">Disconnected</h1>'
    });
});

/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 PLAYER ACTION FUNCTIONS
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.start_game()
// Desc : emits the start-game event when the host clicks the start game button
function start_game() {
    sbr_update_widgets({status: "starting"});
    socket.emit('start-game', {
        slug: window.location.pathname.substr(6),
        player_id: session_user._id
    })
}

// Name : frontend-game.reset_game()
// Desc : emits the reset-game event when the host clicks the reset game button
function reset_game() {
    socket.emit('reset-game', {
        slug: window.location.pathname.substr(6),
        player_id: session_user._id
    })
}

// Name : frontend-game.play_card(card_id, target)
// Desc : emits the play-card event when a card in the players hand is clicked
function play_card(card_id, target) {
    if (!cooldown) {
        cooldown = true;
        setTimeout(function () {cooldown = false;}, 1000);
        socket.emit('play-card', {
            slug: window.location.pathname.substr(6),
            player_id: session_user._id,
            card_id: card_id,
            target: target
        })
    } else {
        toast_alert.fire({
            icon: 'error',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">You cannot play a card now</h1>'
        });
    }
}

// Name : frontend-game.draw_card()
// Desc : emits the draw-card event when the draw deck is clicked
function draw_card() {
    if (session_user.can_draw && !cooldown) {
        cooldown = true;
        setTimeout(function () {cooldown = false;}, 1000);
        socket.emit('draw-card', {
            slug: window.location.pathname.substr(6),
            player_id: session_user._id
        })
    } else {
        toast_alert.fire({
            icon: 'error',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">You cannot draw a card now</h1>'
        });
    }
}

// Name : frontend-game.kick_player(target_player_id)
// Desc : emits the kick-player event to kick a target player
function kick_player(target_player_id) {
    socket.emit('kick-player', {
        slug: window.location.pathname.substr(6),
        player_id: session_user._id,
        kick_player_id: target_player_id
    })
}

// Name : frontend-game.make_host(target_player_id)
// Desc : emits the make-host event to update the host
function make_host(target_player_id) {
    socket.emit('make-host', {
        slug: window.location.pathname.substr(6),
        player_id: session_user._id,
        suc_player_id: target_player_id
    })
}

// Name : frontend-game.import_pack(pack_name)
// Desc : emits the import-pack event to import a pack
function import_pack(pack_name) {
    socket.emit('import-pack', {
        slug: window.location.pathname.substr(6),
        player_id: session_user._id,
        pack_name: pack_name
    })
}

// Name : frontend-game.export_pack(pack_name)
// Desc : emits the export-pack event to export a pack
function export_pack(pack_name) {
    socket.emit('export-pack', {
        slug: window.location.pathname.substr(6),
        player_id: session_user._id,
        pack_name: pack_name
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