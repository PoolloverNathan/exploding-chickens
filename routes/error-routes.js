/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/routes/error-routes.js
Desc     : all routes related error handling
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

const moment = require('moment');
const chalk = require('chalk');
const wipe = chalk.white;

//Export to app.js file
module.exports = function (fastify) {
    // Services
    let card_actions = require('../services/card-actions.js');
    let game_actions = require('../services/game-actions.js');
    let player_actions = require('../services/player-actions.js');

    // 404 error handler
    fastify.setNotFoundHandler({
        preValidation: (req, reply, done) => {
            // your code
            done()
        },
        preHandler: (req, reply, done) => {
            // your code
            done()
        }
    }, function (request, reply) {
        reply.status(404).view('/templates/error.hbs', { error_code: "404", title: "Page does not exist", desc_1: "Unfortunately, we could not find the page you are looking for.", desc_2: "Try a different link or visit the home page." });
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET ' + request.url + '')} ${chalk.bold.red('404')} Could not find resource`));
    })

    // Other error code handler
    fastify.setErrorHandler(function (error, request, reply) {
        // Log error
        this.log.error(error);
        // Send error response
        if (error.statusCode === 429) {
            reply.status(429).view('/templates/error.hbs', { error_code: error.statusCode, title: "Request limit reached", desc_1: "Woah there, it looks like you made too many requests.", desc_2: "Please try again in a couple minutes." });
            console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET ' + request.url + '')} ${chalk.bold.red('429')} Request limit reached`));
        } else {
            reply.status(404).view('/templates/error.hbs', { error_code: error.statusCode, title: "Internal server error", desc_1: "Unfortunately, we could not complete the action that was requested.", desc_2: "Please try again later." });
            console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET ' + request.url + '')} ${chalk.bold.red('404')} Could not find resource`));
        }

    })
};