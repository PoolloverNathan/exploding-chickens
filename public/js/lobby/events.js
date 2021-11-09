/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/lobby/events.js
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
// Set localStorage timeout
lscache.setExpiryMilliseconds(3600000);
// Global variables
let allow_connect_msg = false;
let events_data = {};
let events_length = 0;
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
socket.on(window.location.pathname.substr(7) + "-lobby-update", function (data) {
    console.log(data.trigger);
    console.log(data);
    // Check browser session
    setup_session_check(data);
    // Update events log
    events_data = data.events;
    events_length = data.events.length;
    sbr_update_log();
    // Update elements based on update trigger
    if (data.trigger === "player-online") { // Existing player connected
        sbr_update_pstatus(data);
        itr_update_pstatus(data);
    } else if (data.trigger === "create-player") { // New player was created
        sbr_update_widgets(data);
        sbr_update_players(data);
        sbr_update_packs(data);
        itr_update_games(data);
    } else if (data.trigger === "start-game") { // Game started
        sbr_update_widgets(data);
        sbr_update_pstatus(data);
        itr_update_games(data);
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Game has started</h1>'
        });
    } else if (data.trigger === "make-host") {
        // Update host designation in session_user
        for (let i = 0; i < data.players.length; i++) {
            // Check if individual player exists
            if (data.players[i]._id === JSON.parse(lscache.get('ec_session_' + window.location.pathname.substr(7))).player_id) {
                // Update session_user _id and is_host
                session_user = {
                    _id: data.players[i]._id,
                    is_host: data.players[i].type === "host"
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
        itr_update_games(data);
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Player was kicked</h1>'
        });
    } else if (data.trigger === "import-pack") {
        sbr_update_widgets(data);
        sbr_update_packs(data);
        itr_update_games(data);
        toast_turn.close();
        toast_alert.fire({
            icon: 'success',
            html: '<h1 class="text-lg font-bold pl-2 pr-1">Pack was imported</h1>'
        });
    } else if (data.trigger === "export-pack") {
        sbr_update_widgets(data);
        sbr_update_packs(data);
        itr_update_games(data);
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
        itr_update_games(data);
    }
});

// Name : frontend-game.socket.on.player-created
// Desc : whenever an event occurs stating that a player was created
socket.on("player-created", function (data) {
    // Update player_id
    session_user._id = data;
    lscache.set('ec_session_' + window.location.pathname.substr(7), JSON.stringify({
        slug: window.location.pathname.substr(7),
        player_id: data
    }), 12);
});

// Name : frontend-game.socket.on.{slug}-lobby-error
// Desc : whenever an event occurs related to an error
socket.on(window.location.pathname.substr(7) + "-lobby-error", function (data) {
    console.log(data);
    if (data.msg === "LOBBY-DNE") {
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

// Name : frontend-game.socket.on.connect
// Desc : whenever we connect to the backend
socket.on("connect", function (data) {
    // Update _id to mark as online
    session_user._id = undefined;
    // Request game update
    socket.emit('retrieve-lobby', {
        slug: window.location.pathname.substr(7),
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
        slug: window.location.pathname.substr(7),
        player_id: session_user._id
    })
}

// Name : frontend-game.reset_game()
// Desc : emits the reset-game event when the host clicks the reset game button
function reset_game() {
    socket.emit('reset-game', {
        slug: window.location.pathname.substr(7),
        player_id: session_user._id
    })
}

// Name : frontend-game.kick_player(target_player_id)
// Desc : emits the kick-player event to kick a target player
function kick_player(target_player_id) {
    socket.emit('kick-player', {
        slug: window.location.pathname.substr(7),
        player_id: session_user._id,
        kick_player_id: target_player_id
    })
}

// Name : frontend-game.make_host(target_player_id)
// Desc : emits the make-host event to update the host
function make_host(target_player_id) {
    socket.emit('make-host', {
        slug: window.location.pathname.substr(7),
        player_id: session_user._id,
        suc_player_id: target_player_id
    })
}

// Name : frontend-game.import_pack(pack_name)
// Desc : emits the import-pack event to import a pack
function import_pack(pack_name) {
    socket.emit('import-pack', {
        slug: window.location.pathname.substr(7),
        player_id: session_user._id,
        pack_name: pack_name
    })
}

// Name : frontend-game.export_pack(pack_name)
// Desc : emits the export-pack event to export a pack
function export_pack(pack_name) {
    socket.emit('export-pack', {
        slug: window.location.pathname.substr(7),
        player_id: session_user._id,
        pack_name: pack_name
    })
}