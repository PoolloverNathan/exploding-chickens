/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/routes/lobby-api.js
Desc     : all routes related to lobby actions
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Export to app.js file
module.exports = function (fastify) {

    // Packages
    const chalk = require('chalk');
    const wipe = chalk.white;
    const moment = require('moment');

    // Services
    let lobby_actions = require('../services/lobby-actions.js');
    let game_actions = require('../services/game-actions.js');
    let player_actions = require('../services/player-actions.js');
    let card_actions = require('../services/card-actions.js');
    let event_actions = require('../services/event-actions.js');

    // "/lobby" POST: Create new lobby and redirect
    fastify.post('/lobby', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute'
            }
        }
    }, async function (req, reply) {
        // Create new lobby
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('POST ' + req.url + '')} ${chalk.bold.green('200')} Create new lobby then redirect to url`));
        console.log(wipe(`${chalk.bold.white('API')}:     [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('create-lobby    ')} Received request to create new lobby`));
        let lobby_details = await lobby_actions.create_lobby();
        console.log(wipe(`${chalk.bold.white('API')}:     [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('create-lobby    ')} ${chalk.dim.yellow(lobby_details["slug"])} Created new lobby`));
        // Redirect to lobby url
        reply.redirect("/lobby/" + lobby_details["slug"] + "?auth_token=" + lobby_details["auth_token"]);
    })
};
