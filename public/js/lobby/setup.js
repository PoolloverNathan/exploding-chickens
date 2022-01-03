/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/lobby/setup.js
Desc     : handles setup for player settings in browser
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Global variables
let allow_user_prompt = true;
let selected_nickname = "";
let selected_avatar = "default.png";
let user_prompt_open = false;

// Name : frontend-game.setup_session_check(lobby_details)
// Desc : check local user configuration on browser
function setup_session_check(lobby_details) {
    lscache.flushExpired();
    // Update auth_token
    auth_token = lobby_details.auth_token;
    // Get browser session details
    if (!lscache.get('ec_session_' + window.location.pathname.split('/')[2])) {
        // Reset local storage and session player since game data doesn't exist
        lscache.set('ec_session_' + window.location.pathname.split('/')[2], JSON.stringify({
            lobby_slug: window.location.pathname.split('/')[2],
            plyr_id: undefined
        }), 12);
        session_user = {
            _id: undefined,
            is_host: false
        };
    } else if (JSON.parse(lscache.get('ec_session_' + window.location.pathname.split('/')[2])).lobby_slug !== window.location.pathname.split('/')[2]) {
        // Reset local storage and session player since slugs don't match
        lscache.set('ec_session_' + window.location.pathname.split('/')[2], JSON.stringify({
            lobby_slug: window.location.pathname.split('/')[2],
            plyr_id: undefined
        }), 12);
        session_user = {
            _id: undefined,
            is_host: false
        };
    } else {
        // Check to make sure that the player is valid
        for (let i = 0; i < lobby_details.players.length; i++) {
            // Check if individual player exists
            if (lobby_details.players[i]._id === JSON.parse(lscache.get('ec_session_' + window.location.pathname.split('/')[2])).plyr_id) {
                if (session_user._id === undefined) {
                    // Tell server that a valid player connected
                    socket.emit('player-online', {
                        lobby_slug: window.location.pathname.split('/')[2],
                        plyr_id: lobby_details.players[i]._id
                    })
                    // Replace url without auth_token
                    window.history.replaceState({}, document.title, "/lobby/" + window.location.pathname.split('/')[2]);
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
    let auth_token = (new URLSearchParams(window.location.search)).get("auth_token");
    // Trigger Swal
    Swal.fire({
        html: "<h1 class=\"text-4xl text-base-content mt-3\" style=\"font-family: Bebas Neue\">Welcome to <a class=\"text-primary\">EXPLODING</a> CHICKENS</h1>\n" +
            "<h1 class=\"text-sm text-base-content\">Lobby Code: " + lobby_details.slug + " | Created: " + moment(lobby_details.created).calendar() + "</a><br><br><a class=\"text-error\">" + err + "</a></h1>\n" +
            "<div class=\"my-3 flex w-full max-w-sm mx-auto space-x-3 shadow-md\">\n" +
            "    <input\n" +
            "        class=\"text-center flex-1 appearance-none border border-transparent w-full py-2 px-10 bg-base-100 text-base-content placeholder-neutral rounded-sm text-base border-base-200 focus:outline-none\"\n" +
            "        type=\"text\" id=\"nickname_swal\" maxlength=\"12\" value=\"" + nickname + "\" placeholder=\"What's your name?\">\n" +
            "</div>" +
            (auth_token === null ? ("<div class=\"my-3 flex w-full max-w-sm mx-auto space-x-3 shadow-md\">\n" +
            "    <input\n" +
            "        class=\"text-center flex-1 appearance-none border border-transparent w-full py-2 px-10 bg-base-100 text-base-content placeholder-neutral rounded-sm text-base border-base-200 focus:outline-none\"\n" +
            "        type=\"text\" id=\"auth_token_swal\" maxlength=\"6\" placeholder=\"What's the password?\">\n" +
            "</div>") : "") +
            "<div class=\"flex flex-wrap justify-center items-center py-2\" id=\"avatar_options_swal\">\n" +
            "</div>\n",
        showCancelButton: true,
        confirmButtonColor: 'hsla(var(--p) / var(--tw-border-opacity))', // Primary color
        cancelButtonColor: 'hsla(var(--n) / var(--tw-border-opacity))', // Neutral color
        cancelButtonText: 'Spectate',
        confirmButtonText: 'Join Lobby',
        allowOutsideClick: false,
        background: "hsla(var(--b1) / var(--tw-bg-opacity))", // Base-100 color
        didOpen: function() {
            user_prompt_open = true;
            setup_update_options();
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Validate input
            selected_nickname = document.getElementById("nickname_swal").value;
            if (selected_avatar === "default.png") {
                setup_user_prompt(lobby_details, "Please select an avatar", selected_nickname);
            } else {
                // Create new player
                socket.emit('create-player', {
                    lobby_slug: window.location.pathname.split('/')[2],
                    auth_token: auth_token === null ? document.getElementById("auth_token_swal").value : auth_token,
                    nickname: selected_nickname,
                    avatar: selected_avatar,
                    plyr_id: "spectator"
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
                "    <img class=\"h-16 w-16 rounded-full ring-2 ring-green-500\" src=\"/public/avatars/" + options[i] + "\" id=\"" + options[i] + "\" alt=\"\">\n" +
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
    document.getElementById(selected_avatar).className = "h-16 w-16 rounded-full ring-2 ring-green-500";
}