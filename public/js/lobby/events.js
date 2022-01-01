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

// Name : frontend-game.socket.on.lobby-update
// Desc : whenever an event occurs containing a lobby update
socket.on("lobby-update", function (data) {
    console.log("Lobby Trigger: " + data.trigger);
    console.log(data);
    // Check browser session
    setup_session_check(data);
    // Update events log
    events_data = data.events;
    events_length = data.events_length;
    sbr_update_log();
    // Update elements based on update trigger
    if (data.trigger === "player-online" || data.trigger === "player-offline") { // Existing player connected
        sbr_update_pstatus(data);
        itr_update_pstatus(data);
        return;
    } else if (data.trigger === "create-player") { // New player was created
        sbr_update_lobby_widgets(data);
        sbr_update_players(data);
        itr_create_games(data);
        return;
    } else if (data.trigger === "start-games") { // Game started
        sbr_update_lobby_widgets(data);
        sbr_update_options(data);
        sbr_update_pstatus(data);
        itr_create_games(data);
        game_start_prompt(data);
        return;
    } else if (data.trigger === "make-host") {
        // Update host designation in session_user
        for (let i = 0; i < data.players.length; i++) {
            // Check if individual player exists
            if (data.players[i]._id === JSON.parse(lscache.get('ec_session_' + window.location.pathname.split('/')[2])).plyr_id) {
                // Update session_user _id and is_host
                session_user = {
                    _id: data.players[i]._id,
                    is_host: data.players[i].type === "host"
                };
                break;
            }
        }
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Host was updated</h1>'
        });
    } else if (data.trigger === "kick-player") {
        toast_turn.close();
        toast_alert.fire({
            icon: 'info',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Player was kicked</h1>'
        });
    } else if (data.trigger === "import-pack") {
        sbr_update_lobby_widgets(data);
        sbr_update_packs(data);
        itr_create_games(data);
        toast_turn.close();
        toast_alert.fire({
            icon: 'success',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Pack was imported</h1>'
        });
        return;
    } else if (data.trigger === "export-pack") {
        sbr_update_lobby_widgets(data);
        sbr_update_packs(data);
        itr_create_games(data);
        toast_turn.close();
        toast_alert.fire({
            icon: 'success',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Pack was removed</h1>'
        });
        return;
    }
    // Update entire UI
    sbr_update_lobby_widgets(data);
    sbr_update_options(data);
    sbr_update_players(data);
    sbr_update_packs(data);
    itr_create_games(data);
});

// Name : frontend-game.socket.on.game-update
// Desc : whenever an event occurs containing a game update
socket.on("game-update", function (payload) {
    console.log("Game Trigger: " + payload.trigger);
    console.log(payload);
    // Update game room on ui
    itr_update_game(payload);
});

// Name : frontend-game.socket.on.player-created
// Desc : whenever an event occurs stating that a player was created
socket.on("player-created", function (data) {
    // Save data into cache
    lscache.set('ec_session_' + window.location.pathname.split('/')[2], JSON.stringify({
        lobby_slug: window.location.pathname.split('/')[2],
        plyr_id: data
    }), 12);
});

// Name : frontend-game.socket.on.{slug}-lobby-error
// Desc : whenever an event occurs related to an error
socket.on(window.location.pathname.split('/')[2] + "-lobby-error", function (data) {
    console.log(data);
    if (data.msg === "LOBBY-DNE") {
        window.location.href = "/";
    } else if (data.msg === "PLYR-NAME") {
        setup_user_prompt(data.lobby_details, "Please enter a valid nickname <br> (letters only, < 12 chars, not already used)", "");
    } else if (data.msg === "PLYR-AVTR") {
        setup_user_prompt(data.lobby_details, "Please select an avatar", selected_nickname);
    } else if (data.msg === "AUTH-TOKN") {
        setup_user_prompt(data.lobby_details, "Please enter a valid lobby password <br> (Active players can see this value by clicking <br> on 'Lobby Code' in the sidebar)", selected_nickname);
    } else {
        toast_alert.fire({
            icon: 'error',
            html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">' + data.msg + '</h1>',
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
        lobby_slug: window.location.pathname.split('/')[2],
        plyr_id: "spectator"
    })
    // Update status dot
    document.getElementById("status_ping").innerHTML = "<span class=\"animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75\"></span>\n" +
        "<span class=\"relative inline-flex rounded-full h-2 w-2 bg-success\"></span>"
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
socket.on("disconnect", function (data) {
    // Update status dot
    document.getElementById("status_ping").innerHTML = "<span class=\"animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75\"></span>\n" +
        "<span class=\"relative inline-flex rounded-full h-2 w-2 bg-error\"></span>"
    if (session_user._id) {
        document.getElementById("sbr_stat_usertop_" + session_user._id).className = stat_dot_class(-1, "mx-1.5");
        document.getElementById("sbr_stat_player_dot_" + session_user._id).className = stat_dot_class(-1, "mx-0.5");
        document.getElementById("sbr_stat_player_details_" + session_user._id).innerHTML = "Offline, trying to reconnect..."
    }
    // Send alert
    toast_alert.fire({
        icon: 'error',
        html: '<h1 class="text-lg text-base-content font-bold pl-2 pr-1">Disconnected</h1>'
    });
});

/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 PLAYER ACTION FUNCTIONS
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.start_games()
// Desc : emits the start-games event when the host clicks the start game button
function start_games() {
    socket.emit('start-games', {
        lobby_slug: window.location.pathname.split('/')[2],
        plyr_id: session_user._id
    })
}

// Name : frontend-game.reset_lobby()
// Desc : emits the reset-lobby event when the host clicks the reset game button
function reset_lobby() {
    socket.emit('reset-lobby', {
        lobby_slug: window.location.pathname.split('/')[2],
        plyr_id: session_user._id
    })
}

// Name : frontend-game.update_option(option, value)
// Desc : emits the update-option event to update an option
function update_option(option, value) {
    if (session_user.is_host) {
        socket.emit('update-option', {
            lobby_slug: window.location.pathname.split('/')[2],
            plyr_id: session_user._id,
            option: option,
            value: value
        })
    }
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

// Name : frontend-game.import_pack(pack_name)
// Desc : emits the import-pack event to import a pack
function import_pack(pack_name) {
    socket.emit('import-pack', {
        lobby_slug: window.location.pathname.split('/')[2],
        plyr_id: session_user._id,
        pack_name: pack_name
    })
}

// Name : frontend-game.export_pack(pack_name)
// Desc : emits the export-pack event to export a pack
function export_pack(pack_name) {
    socket.emit('export-pack', {
        lobby_slug: window.location.pathname.split('/')[2],
        plyr_id: session_user._id,
        pack_name: pack_name
    })
}

// Name : frontend-game.game_start_prompt(lobby_details)
// Desc : fire a swal prompt to inform player that their game has started
function game_start_prompt(lobby_details) {
    // Find player
    for (let i = 0; i < lobby_details.games.length; i++) {
        for (let j = 0; j < lobby_details.games[i].players.length; j++) {
            if (lobby_details.games[i].players[j]._id === session_user._id) {
                // Trigger Swal
                Swal.fire({
                    html: "<h1 class=\"text-4xl text-base-content mt-3\" style=\"font-family: Bebas Neue\">Your game has <a class=\"text-green-500\">started!</a></h1>\n" +
                        "<h1 class=\"text-sm text-base-content\">Lobby: " + lobby_details.slug + " → Game: " + lobby_details.games[i].players[j].game_assign + "</a></h1>\n" +
                        "    <h1 class=\"text-base-content text-sm\">\n" +
                        "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 text-info -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                        "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z\" />\n" +
                        "        </svg>\n" +
                        "        " + lobby_details.games[i].players.length + "/" + lobby_details.room_size + "\n" +
                        "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 ml-1 text-secondary -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                        "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z\" />\n" +
                        "        </svg>\n" +
                        "        " + lobby_details.games[i].cards_total + " Cards\n" +
                        "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 ml-1 text-error -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                        "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z\" />\n" +
                        "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z\" />\n" +
                        "        </svg>\n" +
                        "        " + lobby_details.games[i].ec_remain + " EC\n" +
                        "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 ml-1 text-primary -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                        "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z\" />\n" +
                        "        </svg>\n" +
                        "        " + moment(lobby_details.games[i].created).calendar() +
                        "    </h1>\n" + (session_user.is_host ? "<h1 class=\"text-base-content text-sm pt-2\"><strong>Host:</strong> Joining the game will open a new tab for you to play in. The lobby dashboard (this tab) will remain open for you to check up on the progress of all active games.</h1>" : ""),
                    background: "hsla(var(--b1) / var(--tw-bg-opacity))",
                    confirmButtonColor: 'hsla(var(--p) / var(--tw-border-opacity))', // Primary color
                    cancelButtonColor: 'hsla(var(--n) / var(--tw-border-opacity))', // Neutral color
                    confirmButtonText: 'Join in New Tab',
                    cancelButtonText: 'Join in This Tab',
                    showCancelButton: session_user.is_host,
                    allowOutsideClick: false,
                    timer: session_user.is_host ? 10000 : 3000,
                    timerProgressBar: true,
                    didOpen: () => {
                        if (!session_user.is_host) Swal.showLoading();
                    }
                }).then((result) => {
                    console.log(result);
                    if (session_user.is_host && result.isConfirmed) {
                        window.open("/lobby/" + lobby_details.slug + "/game/" + lobby_details.games[i].players[j].game_assign, '_blank');
                    } else {
                        window.location.href = "/lobby/" + lobby_details.slug + "/game/" + lobby_details.games[i].players[j].game_assign;
                    }
                })
                break;
            }
        }
    }
}