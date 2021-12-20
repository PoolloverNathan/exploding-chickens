/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/config/setup.js
Desc     : checks and sets up configuration values
           in env.json using data-store
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
const chalk = require('chalk');
const wipe = chalk.white;
const moment = require('moment');

// Name : setup.check_values(config_store, stats_store, suppress_debug)
// Desc : checks all env.json values and configures each value if invalid
// Author(s) : RAk3rman
exports.check_values = function (config_store, stats_store, suppress_debug) {
    if (!suppress_debug) console.log(wipe(`${chalk.bold.cyan('Setup')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Checking system setup values`));
    let config_updated = 0;
    let stats_updated = 0;
    // Config value: webserver_port | the port where the webserver will listen for requests
    if (!config_store.has('webserver_port') || config_store.get('webserver_port') === '') {
        config_store.set('webserver_port', 3000);
        config_updated++;
    }
    // Config value: mongodb_url | the url used to access an external mongodb database
    if (!config_store.has('mongodb_url') || config_store.get('mongodb_url') === '') {
        config_store.set('mongodb_url', 'mongodb://localhost:27017/exploding-chickens');
        config_updated++;
    }
    // Config value: purge_age_hrs | the verbosity of output to the console
    if (!config_store.has('purge_age_hrs') || config_store.get('purge_age_hrs') === '') {
        config_store.set('purge_age_hrs', 12);
        config_updated++;
    }
    // Config value: verbose_debug | the verbosity of output to the console
    if (!config_store.has('verbose_debug') || config_store.get('verbose_debug') === '') {
        config_store.set('verbose_debug', false);
        config_updated++;
    }
    // Config value: discord_bot_token | token of discord bot, not used if blank
    if (!config_store.has('discord_bot_token')) {
        config_store.set('discord_bot_token', '');
        config_updated++;
    }
    // Config value: discord_bot_channel | discord channel that the bot will post messages to
    if (!config_store.has('discord_bot_channel')) {
        config_store.set('discord_bot_channel', '');
        config_updated++;
    }
    if (!suppress_debug) console.log(wipe(`${chalk.bold.cyan('Setup')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Configuration values have been propagated (` + config_updated + `)`));
    // Check default stats values
    let stats_array = ['games_played', 'mins_played', 'attack', 'defuse', 'chicken', 'favor', 'randchick', 'reverse', 'seethefuture', 'shuffle', 'skip', 'hotpotato', 'favorgator', 'scrambledeggs', 'superskip', 'safetydraw', 'drawbottom', 'sockets_active'];
    stats_array.forEach(element => {
        if (!stats_store.has(element)) {
            stats_store.set(element, 0);
            stats_updated++;
        }
    })
    if (!suppress_debug) console.log(wipe(`${chalk.bold.cyan('Setup')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Statistic values have been propagated (` + stats_updated + `)`));
}