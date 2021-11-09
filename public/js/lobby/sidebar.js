/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/lobby/sidebar.js
Desc     : handles ui updates and actions on the sidebar
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.sbr_update_widgets(lobby_details)
// Desc : update status, players, rooms, and games widgets
function sbr_update_widgets(lobby_details) {
    // Status widget variables
    let stat_header = "<div class=\"widget w-full p-2.5 rounded-lg bg-white border border-gray-100 dark:bg-gray-900 dark:border-gray-800\">\n";
    let stat_icon;
    let stat_text = "...";
    let stat_color_a = "";
    let stat_color_b = "";
    // Construct status widget
    if (session_user.is_host) {
        if (lobby_details.in_progress) {
            stat_header = "<button type=\"button\" class=\"widget w-full p-2.5 rounded-lg bg-white border border-gray-100 bg-gradient-to-r from-yellow-500 to-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500\"  onclick=\"reset_game()\">\n";
            stat_icon = "<svg class=\"stroke-current text-white\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15\" />\n" +
                "</svg>";
            stat_text = "Reset <span class=\"hidden sm:inline-block\">game</span>";
        } else {
            stat_header = "<button type=\"button\" class=\"widget w-full p-2.5 rounded-lg bg-white border border-gray-100 bg-gradient-to-r from-green-500 to-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500\" onclick=\"start_game()\">\n";
            stat_icon = "<svg class=\"stroke-current text-white\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9\" />\n" +
                "</svg>";
            stat_text = "Start <span class=\"hidden sm:inline-block\">game</span>";
        }
        stat_color_a = "text-white";
        stat_color_b = "text-white";
    } else {
        if (lobby_details.in_progress) {
            stat_icon = "<svg class=\"stroke-current text-blue-500\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n" +
                "</svg>\n";
            stat_text = "In game";
        } else {
            stat_icon = "<svg class=\"stroke-current text-blue-500\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n" +
                "</svg>\n";
            stat_text = "In lobby";
        }
        stat_color_a = "text-gray-500";
        stat_color_b = "text-black";
    }
    // Update status widget
    document.getElementById("sbr_ele_status").innerHTML = stat_header +
        "    <div class=\"flex flex-row items-center justify-between\">\n" +
        "        <div class=\"flex flex-col text-left\">\n" +
        "            <div class=\"text-xs uppercase truncate " + stat_color_a + "\">\n" +
        "                Status\n" +
        "            </div>\n" +
        "            <div class=\"text-lg font-bold truncate " + stat_color_b + "\">\n" +
        "                " + stat_text + "\n" +
        "            </div>\n" +
        "        </div>\n" + stat_icon +
        "    </div>\n" +
        "</div>";
    // Update players and rooms widgets
    document.getElementById("sbr_ele_players_ctn").innerHTML = lobby_details.players.length;
    document.getElementById("sbr_ele_rooms_ctn").innerHTML = lobby_details.games.length;
    document.getElementById("sbr_ele_games_ctn").innerHTML = lobby_details.games_completed;
}

// Name : frontend-game.sbr_update_players(lobby_details)
// Desc : updates players, add host actions if able
function sbr_update_players(lobby_details) {
    let payload = "";
    let found_player = false;
    // Loop through each player and append to payload
    for (let i = 0; i < lobby_details.games.length; i++) {
        for (let j = 0; j < lobby_details.games[i].players.length; j++) {
            // Check if we found current user, append to top
            if (lobby_details.games[i].players[j]._id === session_user._id) {
                document.getElementById("sbr_ele_usertop").innerHTML = lobby_details.games[i].players[j].nickname + create_stat_dot(lobby_details.games[i].players[j].sockets_open, "mx-1.5", "sbr_stat_usertop_" + lobby_details.games[i].players[j]._id);
                found_player = true;
            }
            // If host, add make host and kick options to each player
            let actions = "";
            if (session_user.is_host && lobby_details.games[i].players[j]._id !== session_user._id) {
                actions = "<div class=\"flex mt-0 ml-4\">\n" +
                    "    <span class=\"\">\n" +
                    "          <button onclick=\"make_host('" + lobby_details.games[i].players[j]._id + "')\" type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500\">\n" +
                    "                <svg class=\"-ml-1 mr-1 h-5 w-5 text-gray-500\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                    "                    <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z\" />\n" +
                    "                </svg>\n" +
                    "                Make Host\n" +
                    "          </button>\n" +
                    "    </span>\n" +
                    "    <span class=\"ml-3\">\n" +
                    "          <button onclick=\"kick_player('" + lobby_details.games[i].players[j]._id + "')\" type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500\">\n" +
                    "                <svg class=\"-ml-1 mr-1 h-5 w-5\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\" aria-hidden=\"true\">\n" +
                    "                    <path fill-rule=\"evenodd\" d=\"M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z\" clip-rule=\"evenodd\" />\n" +
                    "                </svg>\n" +
                    "                Kick\n" +
                    "          </button>\n" +
                    "    </span>\n" +
                    "</div>";
            }
            // Construct name for each player
            let name = lobby_details.games[i].players[j].nickname;
            if (lobby_details.games[i].players[j].type === "host") {
                name += ", Host"
            } else if (lobby_details.games[i].players[j]._id === session_user._id) {
                name += ", You"
            }
            // Add sidebar html to payload
            payload += "<div class=\"flex items-center justify-between mb-2\">\n" +
                "    <div class=\"flex-1 min-w-0\">\n" +
                "        <h3 class=\"text-md font-bold text-gray-900 truncate\">\n" +
                "            " + name + " " + create_stat_dot(lobby_details.games[i].players[j].sockets_open, "mx-0.5", "sbr_stat_player_dot_" + lobby_details.games[i].players[j]._id) + "\n" +
                "        </h3>\n" +
                "        <div class=\"mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6\">\n" +
                "            <div class=\"flex items-center text-sm text-gray-500\" id=\"sbr_stat_player_details_" + lobby_details.games[i].players[j]._id + "\">\n" +
                "                " + (lobby_details.games[i].in_progress ? "In game" : lobby_details.games[i].is_completed ? "In queue" : "Matchmaking") + ", " + (lobby_details.games[i].players[j].sockets_open > 0 ? "connected" : "disconnected") + "\n" +
                "            </div>\n" +
                "        </div>\n" +
                "    </div>\n" +
                actions +
                "</div>";
        }
        // Update with new player data
        if (payload !== "") {
            document.getElementById("sbr_ele_players").innerHTML = payload;
        }
        // If the user is a spectator, update title name
        if (!found_player) {
            document.getElementById("sbr_ele_usertop").innerHTML = "Spectator <span class=\"animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 ml-0.5 align-middle bg-gray-500\"></span>";
        }
    }
}

// Name : frontend-game.sbr_update_pstatus(lobby_details)
// Desc : updates only the status symbol of players
function sbr_update_pstatus(lobby_details) {
    // Loop through each player and update status
    for (let i = 0; i < lobby_details.games.length; i++) {
        for (let j = 0; j < lobby_details.games[i].players.length; j++) {
            // Check if we found current user, append to top
            if (lobby_details.games[i].players[j]._id === session_user._id) {
                document.getElementById("sbr_stat_usertop_" + lobby_details.games[i].players[j]._id).className = stat_dot_class(lobby_details.games[i].players[j].sockets_open, "mx-1.5");
            }
            // Update status for players element
            document.getElementById("sbr_stat_player_dot_" + lobby_details.games[i].players[j]._id).className = stat_dot_class(lobby_details.games[i].players[j].sockets_open, "mx-0.5");
            document.getElementById("sbr_stat_player_details_" + lobby_details.games[i].players[j]._id).innerHTML = (lobby_details.games[i].in_progress ? "In game" : lobby_details.games[i].is_completed ? "In queue" : "Matchmaking") + ", " + (lobby_details.games[i].players[j].sockets_open > 0 ? "connected" : "disconnected");
        }
    }
}


// Name : frontend-game.sbr_update_packs(lobby_details)
// Desc : updates which card packs are marked as imported
function sbr_update_packs(lobby_details) {
    if (lobby_details.packs.includes("yolking_around") && session_user.is_host) {
        document.getElementById("pack_yolking_around").innerHTML = "<button type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none\" onclick=\"export_pack('yolking_around')\">\n" +
            "      <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"-ml-1 mr-1 h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18 12H6\" />\n" +
            "      </svg>" +
            "      Remove\n" +
            "</button>";
    } else if (lobby_details.packs.includes("yolking_around")) {
        document.getElementById("pack_yolking_around").innerHTML = "<button type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none\">\n" +
            "      <svg class=\"-ml-1 mr-1 h-5 w-5\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n" +
            "      </svg>\n" +
            "      Imported\n" +
            "</button>";
    } else if (session_user.is_host) {
        document.getElementById("pack_yolking_around").innerHTML = "<button type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none\" onclick=\"import_pack('yolking_around')\">\n" +
            "      <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"-ml-1 mr-1 h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 6v6m0 0v6m0-6h6m-6 0H6\" />\n" +
            "      </svg>\n" +
            "      Add Pack\n" +
            "</button>";
    }
}

// Name : frontend-game.moment.updateLocale()
// Desc : updates the moment locale for durations
moment.updateLocale('en', {
    relativeTime : {
        future: "in %s",
        past:   "%s",
        s  : '%ds',
        ss : '%ds',
        m:  "%dm",
        mm: "%dm",
        h:  "%dh",
        hh: "%dh"
    }
});

// Name : frontend-game.sbr_update_log(lobby_details)
// Desc : updates the game log list
setInterval(sbr_update_log, 1000);
function sbr_update_log() {
    // Loop through each event and print
    let payload = "";
    for (let i = 0; i < events_data.length; i++) {
        payload += "<li class=\"flex items-start\">\n" +
            "    <span class=\"h-6 flex items-center " + events_data[i].icon_color + "\">\n" +
            "        <svg class=\"flex-shrink-0 h-5 w-5\" viewBox=\"0 0 20 20\" fill=\"currentColor\">\n" + events_data[i].icon_path +
            "        </svg>\n" +
            "    </span>\n" +
            "    <p class=\"ml-2 pr-2 w-full\">\n" +
            "        <a class=\"float-right text-sm pt-0.5\">" + moment(events_data[i].created).fromNow(true) + "</a><a class='pr-10'>" + events_data[i].desc + "</a>\n" +
            "    </p>\n" +
            "</li>"
    }
    // Add remaining events text if over 20
    if (events_length > 20) {
        payload += "<li class=\"flex items-start text-gray-500\">\n" +
            "    <span class=\"h-6 flex items-center\">\n" +
            "        <svg class=\"flex-shrink-0 h-5 w-5\" viewBox=\"0 0 20 20\" fill=\"currentColor\">\n" +
            "            <path d=\"M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z\" />\n" +
            "        </svg>\n" +
            "    </span>\n" +
            "    <p class=\"ml-2 pr-2 w-full\">\n" +
            "        <a class='pr-10'>" + (events_length - 20) + " more events...</a>\n" +
            "    </p>\n" +
            "</li>"
    }
    if (events_length !== 0) {
        document.getElementById("sbr_game_log").innerHTML = payload;
    }
}

// Name : frontend-game.sbr_copy_url()
// Desc : copies the game url to the clients clipboard
function sbr_copy_url() {
    let tempInput = document.createElement("input");
    tempInput.value = window.location.href;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    toast_alert.fire({
        icon: 'success',
        html: '<h1 class="text-lg font-bold pl-2 pr-1">Copied game link</h1>'
    });
}