/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/lobby/interface.js
Desc     : handles ui updates and actions on the interface
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Swal toast settings
const toast_turn = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    padding: '0.3rem'
});

// Name : frontend-game.itr_update_games(lobby_details)
// Desc : updates game rooms
function itr_update_games(lobby_details) {
    // Check base case, no games
    if (lobby_details.games.length === 0) {
        document.getElementById("itr_ele_groups").innerHTML = "<div class=\"flex flex-col items-center justify-center h-screen\">\n" +
            "    <h3 class=\"text-3xl text-gray-700 pb-3 text-center\"><strong>Waiting for players to join...</strong></h3>\n" +
            "    <h3 class=\"text-md text-gray-700 px-2 text-center\">Welcome to <strong>Exploding Chickens</strong>! Lobby: <i>" + lobby_details.slug + "</i></h3>\n" +
            "    <h3 class=\"text-md text-gray-700 px-2 pb-3 text-center\">Invite your friends by clicking on the invite link below.</h3>\n" +
            "    <button type=\"button\" onclick=\"sbr_copy_url()\" class=\"inline-flex items-center px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500\">\n" +
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
                "    <h1 class=\"text-gray-600 font-medium text-sm\">\n" +
                "        " + lobby_details.games[i].players[j].nickname + " " + create_stat_dot(lobby_details.games[i].players[j].sockets_open, "", "itr_stat_player_dot_" + lobby_details.games[i].players[j]._id) + "\n" +
                "    </h1>\n" +
                "    <div class=\"flex flex-col items-center -space-y-3\">\n" +
                "        <img class=\"h-12 w-12 rounded-full " + filter + "\" src=\"/public/avatars/" + lobby_details.games[i].players[j].avatar + "\" alt=\"\">\n" +
                card_icon(lobby_details, i, j, turns) +
                "    </div>\n" +
                "</div>";
        }
        game_grid_payload += "<div class=\"block text-center\">\n" +
            "    <h1 class=\"text-gray-600 font-medium text-sm\">\n" +
            "        Game Room: " + lobby_details.games[i].slug + " <span class=\"animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 align-middle bg-" + (lobby_details.games[i].in_progress ? "green" : "blue") + "-500\"></span>\n" +
            "    </h1>\n" +
            "    <h1 class=\"text-gray-600 font-medium text-sm\">\n" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 text-blue-500 -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z\" />\n" +
            "        </svg>\n" +
            "        " + lobby_details.games[i].players.length + "/" + lobby_details.room_size + "\n" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 ml-1 text-purple-500 -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z\" />\n" +
            "        </svg>\n" +
            "        " + lobby_details.games[i].cards_remain + "/" + lobby_details.games[i].cards_total + " Cards\n" +
            "        <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline-block pb-0.5 ml-1 text-red-500 -mr-0.5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z\" />\n" +
            "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z\" />\n" +
            "        </svg>\n" +
            "        " + lobby_details.games[i].ec_remain + " EC\n" +
            "    </h1>\n" +
            "    <div class=\"px-2 pb-2\">\n" +
            "        <progress class=\"progress " + (lobby_details.games[i].is_completed ? "progress-success" : "progress-info") + "\" value=\"" + Math.ceil(((lobby_details.games[i].cards_total - lobby_details.games[i].cards_remain) / lobby_details.games[i].cards_total) * 100) + "\" max=\"100\"></progress>\n" +
            "    </div>\n" +
            "    <div class=\"rounded-2xl bg-contain mx-1 border-dashed border-4 border-gray-400\">\n" +
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
                "    <button type=\"button\" class=\"inline-flex items-center px-2 py-1 rounded-md shadow-sm text-lg font-medium text-white border border-gray-100 bg-gradient-to-r from-yellow-500 to-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500\" onclick=\"reset_game()\">\n" +
                "        <svg class=\"-ml-1 mr-1 h-6 w-6\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                "            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15\" />\n" +
                "        </svg>" +
                "        Reset Game\n" +
                "    </button>\n" +
                "</div>"
        } else {
            host_action_payload = "<div class=\"flex justify-center mt-4 mb-6\">\n" +
                "    <button type=\"button\" class=\"inline-flex items-center px-2 py-1 rounded-md shadow-sm text-lg font-medium text-white border border-gray-100 bg-gradient-to-r from-green-500 to-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500\" onclick=\"start_game()\">\n" +
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

// Name : frontend-game.itr_update_pstatus(game_details)
// Desc : updates only the status symbol of players
function itr_update_pstatus(lobby_details) {
    // Loop through each player and update status
    for (let i = 0; i < lobby_details.players.length; i++) {
        document.getElementById("itr_stat_player_dot_" + lobby_details.players[i]._id).className = stat_dot_class(lobby_details.players[i].sockets_open, "mx-0.5");
    }
}

/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 GAME UI HELPER FUNCTIONS
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Name : frontend-game.create_stat_dot(sockets_open, margin, id)
// Desc : returns the html for a pulsating status dot
function create_stat_dot(sockets_open, margin, id) {
    return "<span class=\"" + stat_dot_class(sockets_open, margin) + "\" id=\"" + id + "\"></span>"
}

// Name : frontend-game.stat_dot_class(sockets_open, margin)
// Desc : returns the class for a status dot
function stat_dot_class(sockets_open, margin) {
    if (sockets_open > 0) {
        return "animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 " + margin + " align-middle bg-green-500"
    } else if (sockets_open <= 0) {
        return "animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 " + margin + " align-middle bg-yellow-500"
    } else {
        return "animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 " + margin + " align-middle bg-gray-500"
    }
}

// Name : frontend-game.cards_icon(game_details, player_details, turns)
// Desc : returns the html for cards in a players hand (as well as blue card for turns)
function card_icon(lobby_details, game_pos, player_pos, turns) {
    let turns_payload = "";
    // Display win count if game is completed or lobby is in matchmaking
    if (!lobby_details.in_progress || lobby_details.games[game_pos].is_completed) {
        if (lobby_details.games[game_pos].players[player_pos].wins > 0) {
            return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md bg-green-500 shadow-md h-5 w-4\">\n" +
                "    <h1 class=\"text-white text-sm\">" + lobby_details.games[game_pos].players[player_pos].wins + "</h1>\n" +
                "</div></div></div>\n"
        } else {
            return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md bg-gray-500 shadow-md h-5 w-4\">\n" +
                "    <h1 class=\"text-white text-sm\">" + lobby_details.games[game_pos].players[player_pos].wins + "</h1>\n" +
                "</div></div></div>\n"
        }
    }
    // Check to see if target player has any turns remaining
    if (turns !== 0 && lobby_details.games[game_pos].in_progress) {
        turns_payload = "<div class=\"transform inline-block rounded-md bg-blue-500 shadow-md h-5 w-4 ml-1\">\n" +
            "    <h1 class=\"text-white text-sm\">" + turns + "</h1>\n" +
            "</div>\n"
    }
    // Check if exploding
    let card1_color = lobby_details.games[game_pos].players[player_pos].is_exploding ? "bg-red-500" : "bg-gray-500";
    let card2_color = lobby_details.games[game_pos].players[player_pos].is_exploding ? "bg-red-600" : "bg-gray-600";
    let card3_color = lobby_details.games[game_pos].players[player_pos].is_exploding ? "bg-red-700" : "bg-gray-700";
    let card4_color = lobby_details.games[game_pos].players[player_pos].is_exploding ? "bg-red-800" : "bg-gray-800";
    // Determine number of cards in hand
    if (lobby_details.games[game_pos].players[player_pos].is_dead) {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md bg-red-500 shadow-md h-5 w-4\">\n" +
            "    <h1 class=\"text-white text-sm\"><i class=\"fas fa-skull-crossbones\"></i></h1>\n" +
            "</div></div></div>\n"
    } else if (lobby_details.games[game_pos].players[player_pos].cards.length === 2) {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md " + card2_color + " shadow-md h-5 w-4 -rotate-6\"><h1 class=\"text-gray-600 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card1_color + " shadow-md h-5 w-4 rotate-6\">\n" +
            "    <h1 class=\"text-white text-sm\">" + lobby_details.games[game_pos].players[player_pos].cards.length + "</h1>\n" +
            "</div></div>" +  turns_payload + "</div>\n"
    } else if (lobby_details.games[game_pos].players[player_pos].cards.length === 3) {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md " + card3_color + " shadow-md h-5 w-4 -rotate-12\"><h1 class=\"text-gray-700 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card2_color + " shadow-md h-5 w-4\"><h1 class=\"text-gray-600 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card1_color + " shadow-md h-5 w-4 rotate-12\">\n" +
            "    <h1 class=\"text-white text-sm \">" + lobby_details.games[game_pos].players[player_pos].cards.length + "</h1>\n" +
            "</div></div>" +  turns_payload + "</div>\n"
    } else if (lobby_details.games[game_pos].players[player_pos].cards.length >= 4) {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md " + card4_color + " shadow-md h-5 w-4\" style=\"--tw-rotate: -18deg\"><h1 class=\"text-gray-700 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card3_color + " shadow-md h-5 w-4 -rotate-6\"><h1 class=\"text-gray-700 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card2_color + " shadow-md h-5 w-4 rotate-6\"><h1 class=\"text-gray-600 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card1_color + " shadow-md h-5 w-4\" style=\"--tw-rotate: 18deg\">\n" +
            "    <h1 class=\"text-white text-sm\">" + lobby_details.games[game_pos].players[player_pos].cards.length + "</h1>\n" +
            "</div></div>" +  turns_payload + "</div>\n"
    } else {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md " + card1_color + " shadow-md h-5 w-4\">\n" +
            "    <h1 class=\"text-white text-sm\">" + lobby_details.games[game_pos].players[player_pos].cards.length + "</h1>\n" +
            "</div></div>" +  turns_payload + "</div>\n"
    }
}