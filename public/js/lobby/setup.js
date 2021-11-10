/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/lobby/setup.js
Desc     : handles setup for player settings in browser
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Global variables
let allow_user_prompt = true;
let selected_avatar = "default.png";
let user_prompt_open = false;

// Name : frontend-game.setup_session_check(lobby_details)
// Desc : check local user configuration on browser
function setup_session_check(lobby_details) {
    lscache.flushExpired();
    // Get browser session details
    if (!lscache.get('ec_session_' + window.location.pathname.substr(7))) {
        // Reset local storage and session player since game data doesn't exist
        lscache.set('ec_session_' + window.location.pathname.substr(7), JSON.stringify({
            slug: window.location.pathname.substr(7),
            player_id: undefined
        }), 12);
        session_user = {
            _id: undefined,
            is_host: false
        };
    } else if (JSON.parse(lscache.get('ec_session_' + window.location.pathname.substr(7))).slug !== window.location.pathname.substr(7)) {
        // Reset local storage and session player since slugs don't match
        lscache.set('ec_session_' + window.location.pathname.substr(7), JSON.stringify({
            slug: window.location.pathname.substr(7),
            player_id: undefined
        }), 12);
        session_user = {
            _id: undefined,
            is_host: false
        };
    } else {
        // Check to make sure that the player is valid
        for (let i = 0; i < lobby_details.players.length; i++) {
            // Check if individual player exists
            if (lobby_details.players[i]._id === JSON.parse(lscache.get('ec_session_' + window.location.pathname.substr(7))).player_id) {
                if (session_user._id === undefined) {
                    // Tell server that a valid player connected
                    socket.emit('player-online', {
                        slug: window.location.pathname.substr(7),
                        player_id: lobby_details.players[i]._id
                    })
                }
                // Update session_user _id and is_host
                session_user = {
                    _id: lobby_details.players[i]._id,
                    is_host: lobby_details.players[i].is_host
                };
                break;
            }
        }
    }
    // Open setup prompt if needed
    if (allow_user_prompt && session_user._id === undefined) {
        setup_user_prompt(lobby_details, "", "");
        allow_user_prompt = false;
    }
}

// Name : frontend-game.setup_user_prompt(lobby_details, err, nickname)
// Desc : fire a swal prompt to add user to lobby
function setup_user_prompt(lobby_details, err, nickname) {
    // Trigger Swal
    Swal.fire({
        html: "<h1 class=\"text-4xl text-gray-700 mt-3\" style=\"font-family: Bebas Neue\">Welcome to <a class=\"text-yellow-400\">EXPLODING</a> CHICKENS</h1>\n" +
            "<h1 class=\"text-sm text-gray-700\">Lobby Code: " + lobby_details.slug + " | Created: " + moment(lobby_details.created).calendar() + "</a><br><br><a class=\"text-red-500\">" + err + "</a></h1>\n" +
            "<div class=\"my-3 flex w-full max-w-sm mx-auto space-x-3 shadow-md\">\n" +
            "    <input\n" +
            "        class=\"text-center flex-1 appearance-none border border-transparent w-full py-2 px-10 bg-white text-gray-700 placeholder-gray-400 rounded-sm text-base border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500\"\n" +
            "        type=\"text\" id=\"nickname_swal\" maxlength=\"12\" value=\"" + nickname + "\" placeholder=\"What's your name?\">\n" +
            "</div>" +
            "<div class=\"flex flex-wrap justify-center items-center py-2\" id=\"avatar_options_swal\">\n" +
            "</div>\n",
        showCancelButton: true,
        confirmButtonColor: '#fbbf24',
        cancelButtonColor: '#374151',
        cancelButtonText: 'Spectate',
        confirmButtonText: 'Join Lobby',
        allowOutsideClick: false,
        didOpen: function() {
            user_prompt_open = true;
            setup_update_options();

        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Validate input
            let selected_nickname = document.getElementById("nickname_swal").value;
            if (selected_avatar === "default.png") {
                setup_user_prompt(lobby_details, "Please select an avatar", selected_nickname);
            } else {
                // Create new player
                socket.emit('create-player', {
                    slug: window.location.pathname.substr(7),
                    nickname: selected_nickname,
                    avatar: selected_avatar,
                    player_id: "spectator"
                })
            }
        }
        user_prompt_open = false;
    })
}


// Name : frontend-game.setup_update_options()
// Desc : show a swal prompt to add user to game
function setup_update_options() {
    let options = ["bear.png", "bull.png", "cat.png", "dog.png", "elephant.png", "flamingo.png", "fox.png", "lion.png", "mandrill.png", "meerkat.png", "monkey.png", "panda.png", "puma.png", "raccoon.png", "wolf.png"];
    let options_payload = "";
    // Loop through each avatar to see if in use or not
    for (let i = 0; i < options.length; i++) {
        // Append to payload
        if (selected_avatar === options[i]) { // Current selection, green halo
            options_payload += "<div class=\"flex-none block text-center m-2\" onclick=\"setup_select_option('" + options[i] + "')\">\n" +
                "    <img class=\"h-16 w-16 rounded-full ring-2 ring-offset-2 ring-green-500\" src=\"/public/avatars/" + options[i] + "\" id=\"" + options[i] + "\" alt=\"\">\n" +
                "</div>\n";
        } else { // Available for selection
            options_payload += "<div class=\"flex-none block text-center m-2\" onclick=\"setup_select_option('" + options[i] + "')\">\n" +
                "    <img class=\"h-16 w-16 rounded-full\" src=\"/public/avatars/" + options[i] + "\" id=\"" + options[i] + "\" alt=\"\">\n" +
                "</div>\n";
        }
    }
    // Append to swal
    document.getElementById("avatar_options_swal").innerHTML = options_payload;
}

// Name : frontend-game.setup_select_option(avatar)
// Desc : select an avatar and update ui
function setup_select_option(avatar) {
    // Update old selection
    if (selected_avatar !== "default.png") {
        document.getElementById(selected_avatar).className = "h-16 w-16 rounded-full";
    }
    // Update new selection
    selected_avatar = avatar;
    document.getElementById(selected_avatar).className = "h-16 w-16 rounded-full ring-2 ring-offset-2 ring-green-500";
}