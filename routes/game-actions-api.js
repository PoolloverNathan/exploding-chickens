/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/routes/game-actions-api.js
Desc     : all routes related to game actions
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

    // Create game route, expecting a player nickname
    fastify.post('/lobby/create', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute'
            }
        }
    }, async function (req, reply) {
        // Create new lobby
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('POST ' + req.url + '')} ${chalk.bold.green('200')} Create new lobby then redirect to lobby url`));
        console.log(wipe(`${chalk.bold.white('API')}:     [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('create-lobby    ')} Received request to create new lobby`));
        let lobby_details = await lobby_actions.create_lobby();
        console.log(wipe(`${chalk.bold.white('API')}:     [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.cyan('create-lobby    ')} ${chalk.dim.yellow(lobby_details["slug"])} Created new lobby`));
        // Insert first game in lobby
        await game_actions.create_game(lobby_details);
        // Redirect to lobby url
        reply.redirect("/lobby/" + lobby_details["slug"]);
    })
};
