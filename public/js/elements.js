/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/elements.js
Desc     : creates basic ui elements common among lobbies and games
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
        return "animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 " + margin + " align-middle bg-success"
    } else if (sockets_open === 0) {
        return "animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 " + margin + " align-middle bg-primary"
    } else {
        return "animate-pulse inline-flex rounded-full h-1.5 w-1.5 mb-0.5 " + margin + " align-middle bg-error"
    }
}

// Name : frontend-game.cards_icon(game_details, player_pos, turns)
// Desc : returns the html for cards in a players hand (as well as blue card for turns)
function card_icon(game_details, player_pos, turns) {
    let turns_payload = "";
    // Display win count if game is completed or lobby is in matchmaking
    if (!game_details.in_progress || game_details.is_completed) {
        if (game_details.players[player_pos].wins > 0) {
            return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md bg-green-500 shadow-md h-5 w-4\">\n" +
                "    <h1 class=\"text-white text-sm\">" + game_details.players[player_pos].wins + "</h1>\n" +
                "</div></div></div>\n"
        } else {
            return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md bg-gray-500 shadow-md h-5 w-4\">\n" +
                "    <h1 class=\"text-white text-sm\">" + game_details.players[player_pos].wins + "</h1>\n" +
                "</div></div></div>\n"
        }
    }
    // Check to see if target player has any turns remaining
    if (turns !== 0 && game_details.in_progress) {
        turns_payload = "<div class=\"transform inline-block rounded-md bg-info shadow-md h-5 w-4 ml-1\">\n" +
            "    <h1 class=\"text-white text-sm\">" + turns + "</h1>\n" +
            "</div>\n"
    }
    // Check if exploding
    let card1_color = game_details.players[player_pos].is_exploding ? "bg-red-500" : "bg-gray-500";
    let card2_color = game_details.players[player_pos].is_exploding ? "bg-red-600" : "bg-gray-600";
    let card3_color = game_details.players[player_pos].is_exploding ? "bg-red-700" : "bg-gray-700";
    let card4_color = game_details.players[player_pos].is_exploding ? "bg-red-800" : "bg-gray-800";
    // Determine number of cards in hand
    if (game_details.players[player_pos].is_dead) {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md bg-error shadow-md h-5 w-4\">\n" +
            "    <h1 class=\"text-white text-sm\"><i class=\"fas fa-skull-crossbones\"></i></h1>\n" +
            "</div></div></div>\n"
    } else if (game_details.players[player_pos].cards.length === 2) {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md " + card2_color + " shadow-md h-5 w-4 -rotate-6\"><h1 class=\"text-gray-600 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card1_color + " shadow-md h-5 w-4 rotate-6\">\n" +
            "    <h1 class=\"text-white text-sm\">" + game_details.players[player_pos].cards.length + "</h1>\n" +
            "</div></div>" +  turns_payload + "</div>\n"
    } else if (game_details.players[player_pos].cards.length === 3) {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md " + card3_color + " shadow-md h-5 w-4 -rotate-12\"><h1 class=\"text-gray-700 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card2_color + " shadow-md h-5 w-4\"><h1 class=\"text-gray-600 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card1_color + " shadow-md h-5 w-4 rotate-12\">\n" +
            "    <h1 class=\"text-white text-sm \">" + game_details.players[player_pos].cards.length + "</h1>\n" +
            "</div></div>" +  turns_payload + "</div>\n"
    } else if (game_details.players[player_pos].cards.length >= 4) {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md " + card4_color + " shadow-md h-5 w-4\" style=\"--tw-rotate: -18deg\"><h1 class=\"text-gray-700 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card3_color + " shadow-md h-5 w-4 -rotate-6\"><h1 class=\"text-gray-700 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card2_color + " shadow-md h-5 w-4 rotate-6\"><h1 class=\"text-gray-600 text-sm\">1</h1></div>\n" +
            "<div class=\"transform inline-block rounded-md " + card1_color + " shadow-md h-5 w-4\" style=\"--tw-rotate: 18deg\">\n" +
            "    <h1 class=\"text-white text-sm\">" + game_details.players[player_pos].cards.length + "</h1>\n" +
            "</div></div>" +  turns_payload + "</div>\n"
    } else {
        return "<div class=\"inline-block\"><div class=\"-space-x-4 rotate-12 inline-block\"><div class=\"transform inline-block rounded-md " + card1_color + " shadow-md h-5 w-4\">\n" +
            "    <h1 class=\"text-white text-sm\">" + game_details.players[player_pos].cards.length + "</h1>\n" +
            "</div></div>" +  turns_payload + "</div>\n"
    }
}

// Name : frontend-game.card_url(card_details)
// Desc : returns the image url for a card
function card_url(card_details) {
    if (card_details.action === "randchick-1" || card_details.action === "randchick-2" || card_details.action === "randchick-3" || card_details.action === "randchick-4" || card_details.action === "chicken") {
        return "/public/cards/" + card_details.pack + "/" + card_details.action + ".png";
    }
    return "/public/cards/" + card_details.pack + "/" + card_details._id + ".png";
}