/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/lobby/sidebar.js
Desc     : handles ui updates and actions on the sidebar
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Global variables
let auth_token = "undefined";

// Name : frontend-game.sbr_update_lobby_widgets(lobby_details)
// Desc : update status, players, rooms, and games widgets
function sbr_update_lobby_widgets(lobby_details) {
    // Status widget variables
    let stat_header = "<div class=\"widget w-full p-2.5 rounded-lg bg-white border border-gray-100 dark:bg-gray-900 dark:border-gray-800\">\n";
    let stat_icon;
    let stat_text;
    let stat_color_a;
    let stat_color_b;
    let itr_stat;
    // Construct status widget
    if (session_user.is_host) {
        if (lobby_details.in_progress) {
            stat_header = "<button type=\"button\" class=\"widget w-full p-2.5 rounded-lg bg-white border border-gray-100 bg-gradient-to-r from-yellow-500 to-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500\"  onclick=\"reset_games()\">\n";
            stat_icon = "<svg class=\"stroke-current text-white\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15\" />\n" +
                "</svg>";
            stat_text = "Reset <span class=\"hidden sm:inline-block\">game</span>";
            itr_stat = "Games in Play";
        } else {
            stat_header = "<button type=\"button\" @click=\"sidebar_open = false\" class=\"widget w-full p-2.5 rounded-lg bg-white border border-gray-100 bg-gradient-to-r from-green-500 to-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500\" onclick=\"start_games()\">\n";
            stat_icon = "<svg class=\"stroke-current text-white\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9\" />\n" +
                "</svg>";
            stat_text = "Start <span class=\"hidden sm:inline-block\">game</span>";
            itr_stat = "Matchmaking";
        }
        stat_color_a = "text-white";
        stat_color_b = "text-white";
    } else {
        if (lobby_details.in_progress) {
            stat_icon = "<svg class=\"stroke-current text-blue-500\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n" +
                "</svg>\n";
            stat_text = "In game";
            itr_stat = "Games in Play";
        } else {
            stat_icon = "<svg class=\"stroke-current text-blue-500\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n" +
                "</svg>\n";
            stat_text = "In lobby";
            itr_stat = "Matchmaking";
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
    document.getElementById("itr_ele_status").innerHTML = itr_stat;
}

// Name : frontend-game.sbr_update_game_widgets(game_details)
// Desc : update status, ec chance, and cards left widgets
function sbr_update_game_widgets(game_details) {
    // Status widget variables
    let stat_header = "<div class=\"widget w-full p-2.5 rounded-lg bg-white border border-gray-100 dark:bg-gray-900 dark:border-gray-800\">\n";
    let stat_icon;
    let stat_text = "...";
    let stat_color_a = "";
    let stat_color_b = "";
    // Construct status widget
    if (session_user.is_host) {
        stat_header = "<button type=\"button\" class=\"widget w-full p-2.5 rounded-lg bg-white border border-gray-100 bg-gradient-to-r from-yellow-500 to-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500\"  onclick=\"reset_game()\">\n";
        stat_icon = "<svg class=\"stroke-current text-white\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15\" />\n" +
            "</svg>";
        stat_text = "Reset <span class=\"hidden sm:inline-block\">game</span>";
        stat_color_a = "text-white";
        stat_color_b = "text-white";
    } else {
        stat_text = game_details.is_completed ? "Completed" : "In game";
        stat_icon = "<svg class=\"stroke-current text-blue-500\" height=\"24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n" +
            "</svg>\n";
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
    // Calculate percent chance of EC
    let p_chance = 100;
    if (game_details.cards_remain !== 0) {
        p_chance = Math.floor((game_details.ec_remain/game_details.cards_remain)*100);
    }
    // Update remaining elements
    document.getElementById("sbr_ele_ec_count").innerHTML = game_details.ec_remain + "<a class=\"font-light\"> / " +  p_chance + "% chance</a>";
    document.getElementById("sbr_ele_cards_remain").innerHTML = game_details.cards_remain;
    document.getElementById("itr_ele_ec_count").innerHTML = game_details.is_completed ? "Game Completed" : "<i class=\"fas fa-bomb\"></i> " + game_details.ec_remain + "<a class=\"font-light\"> / " +  p_chance + "%</a>";
}

// Name : frontend-game.sbr_update_options(details)
// Desc : updates lobby options
function sbr_update_options(details) {
    // Grouping method
    document.getElementById("grp_method_random").checked = details.grp_method === "random";
    document.getElementById("grp_method_wins").checked = details.grp_method === "wins";
    document.getElementById("grp_method_random").disabled = !session_user.is_host || details.in_progress;
    document.getElementById("grp_method_wins").disabled = !session_user.is_host || details.in_progress;
    // Room size
    document.getElementById("room_size_2").checked = details.room_size === 2;
    document.getElementById("room_size_3").checked = details.room_size === 3;
    document.getElementById("room_size_4").checked = details.room_size === 4;
    document.getElementById("room_size_5").checked = details.room_size === 5;
    document.getElementById("room_size_6").checked = details.room_size === 6;
    document.getElementById("room_size_2").disabled = !session_user.is_host || details.in_progress;
    document.getElementById("room_size_3").disabled = !session_user.is_host || details.in_progress;
    document.getElementById("room_size_4").disabled = !session_user.is_host || details.in_progress;
    document.getElementById("room_size_5").disabled = !session_user.is_host || details.in_progress;
    document.getElementById("room_size_6").disabled = !session_user.is_host || details.in_progress;
    // Auto play timeout
    document.getElementById("play_timeout_inf").checked = details.play_timeout === -1;
    document.getElementById("play_timeout_30").checked = details.play_timeout === 30;
    document.getElementById("play_timeout_60").checked = details.play_timeout === 60;
    document.getElementById("play_timeout_120").checked = details.play_timeout === 120;
    document.getElementById("play_timeout_inf").disabled = !session_user.is_host || details.in_progress;
    document.getElementById("play_timeout_30").disabled = !session_user.is_host || details.in_progress;
    document.getElementById("play_timeout_60").disabled = !session_user.is_host || details.in_progress;
    document.getElementById("play_timeout_120").disabled = !session_user.is_host || details.in_progress;
    // Remove host from games
    document.getElementById("include_host").checked = !details.include_host;
    document.getElementById("include_host").disabled = !session_user.is_host || details.in_progress;
}

// Name : frontend-game.sbr_update_packs(details)
// Desc : updates which card packs are marked as imported
function sbr_update_packs(details) {
    if (details.packs.includes("yolking_around") && session_user.is_host && details.game_slug === undefined && !details.in_progress) {
        document.getElementById("pack_yolking_around").innerHTML = "<button type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500\" onclick=\"export_pack('yolking_around')\">\n" +
            "      <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"-ml-1 mr-1 h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18 12H6\" />\n" +
            "      </svg>" +
            "      Remove\n" +
            "</button>";
    } else if (details.packs.includes("yolking_around")) {
        document.getElementById("pack_yolking_around").innerHTML = "<button type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500\">\n" +
            "      <svg class=\"-ml-1 mr-1 h-5 w-5\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n" +
            "      </svg>\n" +
            "      Imported\n" +
            "</button>";
    } else if (session_user.is_host && details.game_slug === undefined && !details.in_progress) {
        document.getElementById("pack_yolking_around").innerHTML = "<button type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700\" onclick=\"import_pack('yolking_around')\">\n" +
            "      <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"-ml-1 mr-1 h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 6v6m0 0v6m0-6h6m-6 0H6\" />\n" +
            "      </svg>\n" +
            "      Add Pack\n" +
            "</button>";
    } else {
        document.getElementById("pack_yolking_around").innerHTML = "<button type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none\">\n" +
            "      <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"-ml-1 mr-1 h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "        <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z\" />\n" +
            "      </svg>\n" +
            "      Available\n" +
            "</button>";
    }
}

// Name : frontend-game.sbr_update_players(details)
// Desc : updates players, add host actions if able
function sbr_update_players(details) {
    let payload = "";
    let found_player = false;
    // Loop through each player and append to payload
    for (let i = 0; i < details.players.length; i++) {
        // Check if we found current user, append to top
        if (details.players[i]._id === session_user._id) {
            document.getElementById("sbr_ele_usertop").innerHTML = details.players[i].nickname + create_stat_dot(details.players[i].sockets_open, "mx-1.5", "sbr_stat_usertop_" + details.players[i]._id);
            found_player = true;
        }
        // If host, add make host and kick options to each player
        let actions = "";
        if (session_user.is_host && details.players[i]._id !== session_user._id) {
            actions = "<div class=\"flex mt-0 ml-4\">\n" +
                "    <span class=\"\">\n" +
                "          <button onclick=\"make_host('" + details.players[i]._id + "')\" type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500\">\n" +
                "                <svg class=\"-ml-1 mr-1 h-5 w-5 text-gray-500\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "                    <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z\" />\n" +
                "                </svg>\n" +
                "                Make Host\n" +
                "          </button>\n" +
                "    </span>\n" +
                "    <span class=\"ml-3\">\n" +
                "          <button onclick=\"kick_player('" + details.players[i]._id + "')\" type=\"button\" class=\"inline-flex items-center px-2 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500\">\n" +
                "                <svg class=\"-ml-1 mr-1 h-5 w-5\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\" aria-hidden=\"true\">\n" +
                "                    <path fill-rule=\"evenodd\" d=\"M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z\" clip-rule=\"evenodd\" />\n" +
                "                </svg>\n" +
                "                Kick\n" +
                "          </button>\n" +
                "    </span>\n" +
                "</div>";
        }
        // Construct name for each player
        let name = details.players[i].nickname;
        if (details.players[i].is_host) {
            name += ", Host"
        } else if (details.players[i]._id === session_user._id) {
            name += ", You"
        }
        // Add sidebar html to payload
        payload += "<div class=\"flex items-center justify-between mb-2\">\n" +
            "    <div class=\"flex-1 min-w-0\">\n" +
            "        <h3 class=\"text-md font-bold text-gray-900 truncate\">\n" +
            "            " + name + " " + create_stat_dot(details.players[i].sockets_open, "mx-0.5", "sbr_stat_player_dot_" + details.players[i]._id) + "\n" +
            "        </h3>\n" +
            "        <div class=\"mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6\">\n" +
            "            <div class=\"flex items-center text-sm text-gray-500\" id=\"sbr_stat_player_details_" + details.players[i]._id + "\">\n" +
            (details.players[i].is_dead ? "Exploded" : details.in_progress ? "In game" : details.players[i].is_host && !details.include_host ? "Spectating" : "Matchmaking") + ", " + (details.players[i].sockets_open > 0 ? "connected" : "disconnected") + "\n" +
            "            </div>\n" +
            "        </div>\n" +
            "    </div>\n" +
            actions +
            "</div>";
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

// Name : frontend-game.sbr_update_pstatus(details)
// Desc : updates only the status symbol of players
function sbr_update_pstatus(details) {
    // Loop through each player and update status
    for (let i = 0; i < details.players.length; i++) {
        // Check if we found current user, append to top
        if (details.players[i]._id === session_user._id) {
            document.getElementById("sbr_stat_usertop_" + details.players[i]._id).className = stat_dot_class(details.players[i].sockets_open, "mx-1.5");
        }
        // Update status for players element
        document.getElementById("sbr_stat_player_dot_" + details.players[i]._id).className = stat_dot_class(details.players[i].sockets_open, "mx-0.5");
        document.getElementById("sbr_stat_player_details_" + details.players[i]._id).innerHTML = (details.players[i].is_dead ? "Exploded" : details.in_progress ? "In game" : details.players[i].is_host && !details.include_host ? "Spectating" : "Matchmaking") + ", " + (details.players[i].sockets_open > 0 ? "connected" : "disconnected");
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

// Name : frontend-game.sbr_update_log(details)
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
    // Trigger Swal
    Swal.fire({
        html: "<h1 class=\"text-4xl text-gray-700 mt-3\" style=\"font-family: Bebas Neue\">" +
            "Lobby <a class=\"text-blue-500\">Invite</a>" +
            "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-7 w-7 inline-block text-blue-500 ml-1\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "  <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1\" />\n" +
            "</svg>" +
            "</h1>\n" +
            "<h1 class=\"text-sm text-gray-700\">Lobby Code: " + window.location.pathname.split('/')[2] + "</a></h1>\n" +
            (auth_token !== "undefined" ? ("<div class=\"form-control\">\n" +
                "  <label class=\"label\">\n" +
                "    <span class=\"label-text\">Player Link</span>\n" +
                "  </label> \n" +
                "  <div class=\"relative\">\n" +
                "    <input type=\"text\" value=\"" + window.location.protocol + "//" + window.location.host + "/lobby/" + window.location.pathname.split('/')[2] + "?auth_token=" + auth_token + "\" disabled=\"disabled\" id=\"player_link\" class=\"w-full pr-14 input input-sm input-primary input-bordered\"> \n" +
                "    <button class=\"absolute top-0 right-0 rounded-l-none btn btn-sm btn-primary\" onclick=\"let ele = document.getElementById('player_link');ele.select();ele.setSelectionRange(0, 99999);navigator.clipboard.writeText(ele.value)\">" +
                "      <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "        <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3\" />\n" +
                "      </svg>" +
                "    </button>\n" +
                "  </div>\n" +
                "  <label class=\"label\">\n" +
                "    <span class=\"label-text-alt\">" +
                "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block text-green-500 -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n" +
                "        </svg>" +
                "        Can <strong>view</strong> lobby and games" +
                "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block ml-1 text-green-500 -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n" +
                "        </svg>" +
                "        Can <strong>join</strong> lobby and games" +
                "    </span>\n" +
                "  </label>" +
                "</div>\n") : "") +
            "<div class=\"form-control\">\n" +
            "  <label class=\"label\">\n" +
            "    <span class=\"label-text\">Spectator Link</span>\n" +
            "  </label> \n" +
            "  <div class=\"relative\">\n" +
            "    <input type=\"text\" value=\"" + window.location.protocol + "//" + window.location.host + "/lobby/" + window.location.pathname.split('/')[2] + "\" disabled=\"disabled\" id=\"spectator_link\" class=\"w-full pr-14 input input-sm input-primary input-bordered\"> \n" +
            "    <button class=\"absolute top-0 right-0 rounded-l-none btn btn-sm btn-primary\" onclick=\"let ele = document.getElementById('spectator_link');ele.select();ele.setSelectionRange(0, 99999);navigator.clipboard.writeText(ele.value)\">" +
            "      <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "        <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3\" />\n" +
            "      </svg>" +
            "    </button>\n" +
            "  </div>\n" +
            "  <label class=\"label\">\n" +
            "    <span class=\"label-text-alt\">" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block text-green-500 -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n" +
            "        </svg>" +
            "        Can <strong>view</strong> lobby and games" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block ml-1 text-red-500 -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 18L18 6M6 6l12 12\" />\n" +
            "        </svg>" +
            "        Can <strong>join</strong> lobby and games" +
            "    </span>\n" +
            "  </label>" +
            "</div> " +
            (auth_token !== "undefined" ? ("<div class=\"form-control\">\n" +
                "  <label class=\"label\">\n" +
                "    <span class=\"label-text\">Lobby Password</span>\n" +
                "  </label> \n" +
                "  <div class=\"relative\">\n" +
                "    <input type=\"text\" value=\"" + auth_token + "\" disabled=\"disabled\" id=\"auth_link\" class=\"w-full pr-14 input input-sm input-primary input-bordered\"> \n" +
                "    <button class=\"absolute top-0 right-0 rounded-l-none btn btn-sm btn-primary\" onclick=\"let ele = document.getElementById('auth_link');ele.select();ele.setSelectionRange(0, 99999);navigator.clipboard.writeText(ele.value)\">" +
                "      <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "        <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3\" />\n" +
                "      </svg>" +
                "    </button>\n" +
                "  </div>\n" +
                "  <label class=\"label\">\n" +
                "    <span class=\"label-text-alt text-left\">" +
                "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block text-blue-500\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n" +
                "        </svg>" +
                "        If a player joins through the home page or uses a spectator link, they may need this password to join the lobby" +
                "    </span>\n" +
                "  </label>" +
                "</div>\n") : ""),
        confirmButtonColor: '#3b82f6'
    })
}