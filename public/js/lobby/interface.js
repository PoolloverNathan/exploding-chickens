/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/lobby/interface.js
Desc     : handles ui updates and actions on the interface
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.itr_create_games(lobby_details)
// Desc : creates game rooms on ui
function itr_create_games(lobby_details) {
    // Check base case, no games
    if (lobby_details.games.length === 0) {
        document.getElementById("itr_ele_groups").innerHTML = "<div class=\"flex flex-col items-center justify-center h-screen\">\n" +
            "    <h3 class=\"text-3xl text-base-content pb-3 text-center\"><strong>Waiting for players to join...</strong></h3>\n" +
            "    <h3 class=\"text-md text-base-content px-2 text-center\">Welcome to <strong>Exploding Chickens</strong>! Lobby: <i>" + lobby_details.slug + "</i></h3>\n" +
            "    <h3 class=\"text-md text-base-content px-2 pb-3 text-center\">Invite your friends by clicking on the invite link below.</h3>\n" +
            "    <button type=\"button\" onclick=\"sbr_copy_url()\" class=\"inline-flex items-center px-2 py-1 border border-base-content rounded-md shadow-sm text-sm font-medium text-base-content bg-base-100 hover:bg-base-200 focus:outline-none\">\n" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"-ml-1 mr-1 h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1\" />\n" +
            "        </svg>\n" +
            "        Invite Link\n" +
            "    </button>\n" +
            "</div>";
        return;
    }
    // Prepare game grid payload
    let game_grid_payload = "";
    // Loop through each game
    for (let i = 0; i < lobby_details.games.length; i++) {
        // Loop through each player
        let player_payload = "";
        for (let j = 0; j < lobby_details.games[i].players.length; j++) {
            // Construct center player payload
            let turns = lobby_details.games[i].turn_seat_pos === lobby_details.games[i].players[j].seat_pos ? lobby_details.games[i].turns_remain : 0;
            // Check for dead filter
            let filter = lobby_details.games[i].players[j].is_dead ? "filter grayscale" : "";
            player_payload += "<div class=\"block text-center w-28\">\n" +
                "    <h1 class=\"text-base-content font-medium text-sm\">\n" +
                "        " + lobby_details.games[i].players[j].nickname + " " + create_stat_dot(lobby_details.games[i].players[j].sockets_open, "", "itr_player_dot_" + lobby_details.games[i].players[j]._id) + "\n" +
                "    </h1>\n" +
                "    <div class=\"flex flex-col items-center -space-y-3\">\n" +
                "        <img class=\"h-12 w-12 rounded-full " + filter + "\" id=\"itr_player_avatar_" + lobby_details.games[i].players[j]._id + "\" src=\"/public/avatars/" + lobby_details.games[i].players[j].avatar + "\" alt=\"\">\n" +
                "        <div id=\"itr_player_cards_" + lobby_details.games[i].players[j]._id + "\">" +
                card_icon(lobby_details.games[i], j, turns) +
                "        </div>" +
                "    </div>\n" +
                "</div>";
        }
        game_grid_payload += "<div class=\"block text-center\">\n" +
            "    <h1 class=\"text-base-content font-medium text-sm\">\n" +
            "        Game Room: " + lobby_details.games[i].game_slug + " <span class=\"animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 align-middle bg-" + (lobby_details.games[i].in_progress ? "success" : "info") + "\"></span>\n" +
            "    </h1>\n" +
            "    <h1 class=\"text-base-content font-medium text-sm\">\n" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 text-info -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z\" />\n" +
            "        </svg>\n" +
            "        <span id=\"itr_game_room_size_" + lobby_details.games[i].game_slug + "\">" + lobby_details.games[i].players.length + "/" + lobby_details.games[i].room_size + "</span>\n" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 ml-1 text-secondary -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z\" />\n" +
            "        </svg>\n" +
            "        <span id=\"itr_game_cards_" + lobby_details.games[i].game_slug + "\">" + lobby_details.games[i].cards_remain + "/" + lobby_details.games[i].cards_total + "</span> Cards\n" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 ml-1 text-error -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z\" />\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z\" />\n" +
            "        </svg>\n" +
            "        <span id=\"itr_game_ec_" + lobby_details.games[i].game_slug + "\">" + lobby_details.games[i].ec_remain + "</span> EC\n" +
            "    </h1>\n" +
            "    <div class=\"px-2 pb-2\">\n" +
            "        <progress id=\"itr_game_progress_" + lobby_details.games[i].game_slug + "\" class=\"progress " + (lobby_details.games[i].is_completed ? "progress-success" : "progress-info") + "\" value=\"" + (lobby_details.games[i].is_completed ? 100 : Math.ceil((((lobby_details.games[i].cards_total - (lobby_details.games[i].players.length * 5 + (6 - lobby_details.games[i].players.length))) - lobby_details.games[i].cards_remain) / (lobby_details.games[i].cards_total - (lobby_details.games[i].players.length * 5 + (6 - lobby_details.games[i].players.length)))) * 100)) + "\" max=\"100\"></progress>\n" +
            "    </div>\n" +
            "    <div class=\"rounded-2xl bg-contain mx-1 border-dashed border-4 border-neutral\">\n" +
            "        <div class=\"grid grid-cols-2 gap-x-2 gap-y-4 py-6 px-4\">\n" +
            player_payload +
            "        </div>\n" +
            "    </div>\n" +
            "</div>";
    }
    // Determine row breakpoints
    let grid_break = "grid-cols-1 md:grid-cols-3 xl:grid-cols-4";
    if (lobby_details.games.length === 1) {
        grid_break = "grid-cols-1";
    } else if (lobby_details.games.length === 2) {
        grid_break = "grid-cols-1 md:grid-cols-2";
    } else if (lobby_details.games.length === 3) {
        grid_break = "grid-cols-1 md:grid-cols-3";
    }
    // Host action btn
    let host_action_payload = "";
    if (session_user.is_host) {
        if (lobby_details.in_progress) {
            host_action_payload = "<div class=\"flex justify-center mt-4 mb-6\">\n" +
                "    <button type=\"button\" class=\"inline-flex items-center px-2 py-1 rounded-md shadow-sm text-lg font-medium text-white border border-base-200 bg-error focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error\" onclick=\"reset_lobby()\">\n" +
                "        <svg class=\"-ml-1 mr-1 h-6 w-6\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636\" />\n" +
                "        </svg>" +
                "        Suspend Game\n" +
                "    </button>\n" +
                "</div>"
        } else {
            host_action_payload = "<div class=\"flex justify-center mt-4 mb-6\">\n" +
                "    <button type=\"button\" class=\"inline-flex items-center px-2 py-1 rounded-md shadow-sm text-lg font-medium text-white border border-base-200 bg-success focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success\" onclick=\"start_games()\">\n" +
                "        <svg class=\"-ml-1 mr-1 h-6 w-6\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9\" />\n" +
                "        </svg>\n" +
                "        Start Game\n" +
                "    </button>\n" +
                "</div>"
        }
    }
    // Construct payload
    document.getElementById("itr_ele_groups").innerHTML = "<div class=\"grid " + grid_break + " gap-x-6 gap-y-6 p-4\">" +
        game_grid_payload +
        "</div>" +
        host_action_payload;
}

// Name : frontend-game.itr_update_game(game_details)
// Desc : updates a game room on ui
function itr_update_game(game_details) {
    // Update game statistics
    document.getElementById("itr_game_room_size_" + game_details.game_slug).innerHTML = game_details.players.length + "/" + game_details.room_size;
    document.getElementById("itr_game_cards_" + game_details.game_slug).innerHTML = game_details.cards_remain + "/" + game_details.cards_total;
    document.getElementById("itr_game_ec_" + game_details.game_slug).innerHTML = game_details.ec_remain;
    // Update progress bar
    let actual_deck_size = game_details.cards_total - (game_details.players.length * 5 + (6 - game_details.players.length));
    let prev = document.getElementById("itr_game_progress_" + game_details.game_slug).value;
    let curr = (game_details.is_completed ? 100 : Math.ceil(((actual_deck_size - game_details.cards_remain) / actual_deck_size) * 100));
    let incr = 0;
    if (prev < curr) {
        for (let i = prev; i < curr; i += 0.1) {
            setTimeout(function () {
                document.getElementById("itr_game_progress_" + game_details.game_slug).value = i
            }, incr += 10);
        }
    } else if (prev > curr) {
        for (let i = prev; i > curr; i -= 0.1) {
            setTimeout(function () {
                document.getElementById("itr_game_progress_" + game_details.game_slug).value = i
            }, incr += 10);
        }
    }
    // Loop through each player and update card icon
    let game_exploding = false;
    for (let i = 0; i < game_details.players.length; i++) {
        // Check exploding
        if (game_details.players[i].is_exploding) game_exploding = true;
        // Get number of turns
        let turns = game_details.turn_seat_pos === game_details.players[i].seat_pos ? game_details.turns_remain : 0;
        // Check for dead filter
        document.getElementById("itr_player_avatar_" + game_details.players[i]._id).className = game_details.players[i].is_dead ? "h-12 w-12 rounded-full filter grayscale" : "h-12 w-12 rounded-full";
        document.getElementById("itr_player_cards_" + game_details.players[i]._id).innerHTML = card_icon(game_details, i, turns);
    }
    // Update progress bar color
    document.getElementById("itr_game_progress_" + game_details.game_slug).className = game_details.is_completed ? "progress progress-success" : game_exploding ? "progress progress-error" : "progress progress-info";
}

// Name : frontend-game.itr_update_pstatus(details)
// Desc : updates only the status symbol of players
function itr_update_pstatus(details) {
    // Loop through each player and update status
    for (let i = 0; i < details.players.length; i++) {
        document.getElementById("itr_player_dot_" + details.players[i]._id).className = stat_dot_class(details.players[i].sockets_open, "mx-0.5");
    }
}