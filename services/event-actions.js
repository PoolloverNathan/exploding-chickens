/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/services/event-actions.js
Desc     : handles all event actions
           and modifies events in game db
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
const moment = require("moment");

// Services
let lobby_actions = require('./lobby-actions.js');
let game_actions = require('./game-actions.js');
let player_actions = require('./player-actions.js');
let card_actions = require('./card-actions.js');
let event_actions = require('./event-actions.js');

// Name : event_actions.log_event(details, tag, req_plyr_id, target_plyr_id, rel_id, rel_val)
// Desc : creates a new event
// Author(s) : RAk3rman
exports.log_event = function (details, tag, req_plyr_id, target_plyr_id, rel_id, rel_val) {
    details.events.push({
        tag: tag,
        req_plyr_id: req_plyr_id,
        target_plyr_id: target_plyr_id,
        rel_id: rel_id,
        rel_val: rel_val
    });
}

// Name : event_actions.parse_event(lobby_details, event)
// Desc : parses an event into readable html
// Author(s) : RAk3rman
exports.parse_event = function (lobby_details, event) {
    out: {
        if (event.tag === "create-player") {
            return {
                icon_path: "<path d=\"M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z\"/>",
                icon_color: "text-info",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> joined the lobby",
                created: moment(event.created).format()
            };
        } else if (event.tag === "include-player") {
            return {
                icon_path: "<path d=\"M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z\"/>",
                icon_color: "text-info",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> joined the game",
                created: moment(event.created).format()
            };
        } else if (event.tag === "start-games") {
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-success",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> started all games",
                created: moment(event.created).format()
            };
        } else if (event.tag === "start-game") {
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-success",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> started the game",
                created: moment(event.created).format()
            };
        } else if (event.tag === "reset-lobby") {
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-warning",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> reset the lobby",
                created: moment(event.created).format()
            };
        } else if (event.tag === "reset-game") {
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-warning",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> reset the game <strong>" + game_actions.get_game_details(lobby_details, event.rel_id).slug + "</strong>",
                created: moment(event.created).format()
            };
        } else if (event.tag === "play-card") {
            let desc = "";
            // Determine which card was played
            if (event.rel_id.slice(0, -2) === "attack") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> played an attack card";
            } else if (event.rel_id.slice(0, -2) === "chicken") {
                return {
                    icon_path: "<path fill-rule=\"evenodd\" d=\"M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z\" clip-rule=\"evenodd\"/>",
                    icon_color: "text-error",
                    desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> exploded",
                    created: moment(event.created).format()
                };
            } else if (event.rel_id.slice(0, -2) === "defuse") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> played a defuse card";
            } else if (event.rel_id.slice(0, -2) === "favor" || event.rel_id.slice(0, -2) === "randchick-1" || event.rel_id.slice(0, -2) === "randchick-2" ||
                event.rel_id.slice(0, -2) === "randchick-3" || event.rel_id.slice(0, -2) === "randchick-4") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> asked for a favor from <strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.target_plyr_id)).nickname + "</strong>";
            } else if (event.rel_id.slice(0, -2) === "reverse") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> played a reverse card";
            } else if (event.rel_id.slice(0, -2) === "seethefuture") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> saw the future";
            } else if (event.rel_id.slice(0, -2) === "shuffle") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> shuffled the deck";
            } else if (event.rel_id.slice(0, -2) === "skip") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> skipped their turn";
            } else if (event.rel_id.slice(0, -2) === "hotpotato") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> used a hot potato";
            } else if (event.rel_id.slice(0, -2) === "scrambledeggs") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> scrambled all hands in play";
            } else if (event.rel_id.slice(0, -2) === "superskip") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> used a super skip";
            } else if (event.rel_id.slice(0, -2) === "safetydraw") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> played a safety draw card";
            } else if (event.rel_id.slice(0, -2) === "drawbottom") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> drew from the bottom";
            } else if (event.rel_id.slice(0, -2) === "favorgator") {
                desc = "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> used a favor gator on <strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.target_plyr_id)).nickname + "</strong>";
            } else {
                break out;
            }
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-info",
                desc: desc,
                created: moment(event.created).format()
            };
        } else if (event.tag === "draw-card") {
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z\" clip-rule=\"evenodd\"/>\n" +
                    "            <path fill-rule=\"evenodd\" d=\"M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-success",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> drew a new card",
                created: moment(event.created).format()
            };
        } else if (event.tag === "update-option") {
            let desc = "";
            // Determine which option was updated
            if (event.rel_id === "grp_method") {
                if (event.rel_val === "random") desc = "updated the <strong class=\"text-base-content\">Grouping Method</strong> to <strong class=\"text-base-content\">Random</strong>";
                else if (event.rel_val === "wins") desc = "updated the <strong class=\"text-base-content\">Grouping Method</strong> to <strong class=\"text-base-content\">Win #</strong>";
                else {break out;}
            } else if (event.rel_id === "room_size") {
                if (event.rel_val > 1 && event.rel_val < 7) desc = "updated the <strong class=\"text-base-content\">Room Size</strong> to <strong class=\"text-base-content\">" + event.rel_val + "</strong>";
                else {break out;}
            } else if (event.rel_id === "play_timeout") {
                if (event.rel_val === "-1") desc = "updated the <strong class=\"text-base-content\">Auto Play Timeout</strong> to <strong class=\"text-base-content\">∞</strong>";
                else if (event.rel_val === "30") desc = "updated the <strong class=\"text-base-content\">Auto Play Timeout</strong> to <strong class=\"text-base-content\">30S</strong>";
                else if (event.rel_val === "60") desc = "updated the <strong class=\"text-base-content\">Auto Play Timeout</strong> to <strong class=\"text-base-content\">1M</strong>";
                else if (event.rel_val === "120") desc = "updated the <strong class=\"text-base-content\">Auto Play Timeout</strong> to <strong class=\"text-base-content\">2M</strong>";
                else {break out;}
            } else if (event.rel_id === "include_host") {
                desc = event.rel_val === "true" ? "included the host in games" : "removed the host from games";
            } else {
                break out;
            }
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z\" clip-rule=\"evenodd\" />",
                icon_color: "text-secondary",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> " + desc,
                created: moment(event.created).format()
            };
        } else if (event.tag === "kick-player") {
            return {
                icon_path: "<path d=\"M11 6a3 3 0 11-6 0 3 3 0 016 0zM14 17a6 6 0 00-12 0h12zM13 8a1 1 0 100 2h4a1 1 0 100-2h-4z\"/>",
                icon_color: "text-error",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> kicked <strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.target_plyr_id)).nickname + "</strong> from the game",
                created: moment(event.created).format()
            };
        } else if (event.tag === "make-host") {
            return {
                icon_path: "<path d=\"M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z\"/>",
                icon_color: "text-secondary",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> made <strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.target_plyr_id)).nickname + "</strong> the host",
                created: moment(event.created).format()
            };
        } else if (event.tag === "import-pack") {
            let pack = "";
            if (event.rel_id === "yolking_around") {
                pack = "Yolking Around";
            } else {
                break out;
            }
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-success",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> added the <strong class=\"text-base-content\">" + pack + "</strong> card pack",
                created: moment(event.created).format()
            };
        } else if (event.tag === "export-pack") {
            let pack = "";
            if (event.rel_id === "yolking_around") {
                pack = "Yolking Around";
            } else {
                break out;
            }
            return {
                icon_path: "<path fill-rule=\"evenodd\" d=\"M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm1 8a1 1 0 100 2h6a1 1 0 100-2H7z\" clip-rule=\"evenodd\"/>",
                icon_color: "text-error",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> removed the <strong class=\"text-base-content\">" + pack + "</strong> card pack",
                created: moment(event.created).format()
            };
        } else if (event.tag === "game-won") {
            return {
                icon_path: "<path d=\"M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z\"/>",
                icon_color: "text-warning",
                desc: "<strong class=\"text-base-content\">" + (player_actions.get_player_details(lobby_details, event.req_plyr_id)).nickname + "</strong> won the game",
                created: moment(event.created).format()
            };
        }
    }
    return {
        icon_path: "<path fill-rule=\"evenodd\" d=\"M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z\" clip-rule=\"evenodd\"/>",
        icon_color: "text-error",
        desc: "Invalid event action",
        created: moment(event.created).format()
    };
}