/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/app.js
Desc     : main application file
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages and configuration - - - - - - - - - - - - - - - - - - - - - - - - -

// Declare packages
let Lobby = require('./models/lobby.js');
const path = require('path');
let mongoose = require('mongoose');
const dataStore = require('data-store');
const config_store = new dataStore({path: './config/config.json'});
const stats_store = new dataStore({path: './config/stats.json'});
const moment = require('moment');
const chalk = require('chalk');
const pkg = require('./package.json');
const bnr_config = require('./config/banner.json');
require('eris-embed-builder');
const eris = require('eris');
const wipe = chalk.white;

// Configuration & testing
let setup = require('./config/setup.js');

// Services
let lobby_actions = require('./services/lobby-actions.js');
let socket_handler = require('./services/socket-handler.js');

// Print header to console
console.clear();
console.log(chalk.blue.bold('\nExploding Chickens v' + pkg.version + ((process.argv[2] !== undefined) ? ' | ' + process.argv[2].toUpperCase() : "" )));
console.log(chalk.white('--> Contributors: ' + pkg.author));
console.log(chalk.white('--> Description: ' + pkg.description));
console.log(chalk.white('--> Github: ' + pkg.homepage + '\n'));

// Check configuration values
setup.check_values(config_store, stats_store, false);

// Discord bot setup
let bot;
let send_startup_msg = true;
if (config_store.has('discord_bot_token') && config_store.get('discord_bot_token') !== '' &&
    config_store.has('discord_bot_channel') && config_store.get('discord_bot_channel') !== '') {
    // Declare bot instance
    bot = new eris.Client(config_store.get('discord_bot_token'));
    // When the bot is connected and ready, update console
    bot.on('ready', () => {
        // Set bot status
        bot.editStatus("online");
        // Send update to console
        console.log(wipe(`${chalk.bold.blueBright('Discord')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.blueBright('bot-connect     ')} Bot is now connected to Discord API`));
        if (send_startup_msg) {
            bot.createMessage(config_store.get('discord_bot_channel'), ":white_check_mark: **Exploding Chickens v" + pkg.version + ": Service Online**");
            send_startup_msg = false;
        }
    });
    // Handle any errors that the bot encounters
    bot.on('error', err => {
        console.warn(err);
    });
}

// End of Packages and configuration - - - - - - - - - - - - - - - - - - - - - -


// Fastify and main functions - - - - - - - - - - - - - - - - - - - - - - - - - -

// Declare fastify
const fastify = require('fastify')({logger: false});

// Prepare rendering template
fastify.register(require('point-of-view'), {
    engine: {
        handlebars: require('handlebars')
    },
    options: {
        partials: {
            sbr_card_packs: '/templates/partials/sidebar/sbr_card_packs.hbs',
            sbr_event_log: '/templates/partials/sidebar/sbr_event_log.hbs',
            sbr_footer: '/templates/partials/sidebar/sbr_footer.hbs',
            sbr_game_widgets: '/templates/partials/sidebar/sbr_game_widgets.hbs',
            sbr_header: '/templates/partials/sidebar/sbr_header.hbs',
            sbr_lobby_widgets: '/templates/partials/sidebar/sbr_lobby_widgets.hbs',
            sbr_options: '/templates/partials/sidebar/sbr_options.hbs',
            sbr_players: '/templates/partials/sidebar/sbr_players.hbs',
            banner: '/templates/partials/banner.hbs'
        }
    }
})
fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'public'),
    prefix: '/public/',
})
fastify.register(require('fastify-socket.io'), {})
fastify.register(require('fastify-formbody'))
fastify.register(require('fastify-rate-limit'), {
    global: false,
    max: 250,
    timeWindow: '1 minute'
})

// Routers
let lobby_api = require('./routes/lobby-api.js');
let error_api = require('./routes/error-api.js');

// Import routes
lobby_api(fastify);
error_api(fastify);

// Home page
fastify.get('/', (req, reply) => {
    reply.view('/templates/home.hbs', {
        title: "Exploding Chickens",
        version: pkg.version,
        stat_games_played: stats_store.get('games_played').toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,'),
        stat_explosions: stats_store.get('chicken').toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,'),
        stats_avg_play_time: Math.round(stats_store.get('mins_played') / stats_store.get('games_played')) || 0,
        bnr_short_desc: bnr_config.short_desc,
        bnr_long_desc: bnr_config.long_desc,
        bnr_tag: bnr_config.tag
    })
    console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET /')} ${chalk.bold.green('200')} Rendering home page`));
})

// Lobby page
fastify.get('/lobby/:lobby_slug', {
    config: {
        rateLimit: {
            max: 15,
            timeWindow: '1 minute'
        }
    }
}, async function (req, reply) {
    // Make sure lobby exists
    if (await Lobby.exists({ slug: req.params.lobby_slug, created: { $gte: moment().subtract(12, "hours").toISOString() } })) {
        reply.view('/templates/lobby.hbs', { slug_1: req.params.lobby_slug, slug_2: req.params.lobby_slug, slug_3: req.params.lobby_slug, slug_4: req.params.lobby_slug, version: pkg.version, bnr_short_desc: bnr_config.short_desc, bnr_long_desc: bnr_config.long_desc, bnr_tag: bnr_config.tag })
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET ' + req.url + '')} ${chalk.bold.green('200')} Lobby exists, rendering lobby page`));
    } else {
        reply.status(404).view('/templates/error.hbs', { error_code: "404", title: "Lobby does not exist", desc_1: "Unfortunately, we could not find the lobby you are looking for.", desc_2: "Try a different link or create a new lobby on the home page." });
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET ' + req.url + '')} ${chalk.bold.red('404')} Lobby does not exist, rendering error page`));
    }
})

// Game page
fastify.get('/lobby/:lobby_slug/game/:game_slug', {
    config: {
        rateLimit: {
            max: 15,
            timeWindow: '1 minute'
        }
    }
}, async function (req, reply) {
    // Make sure lobby exists
    if (await Lobby.exists({ slug: req.params.lobby_slug, games: { $elemMatch: { slug: req.params.game_slug }}, created: { $gte: moment().subtract(12, "hours").toISOString() } })) {
        reply.view('/templates/game.hbs', { slug_1: req.params.lobby_slug, slug_2: req.params.lobby_slug, slug_3: req.params.lobby_slug, slug_4: req.params.lobby_slug, version: pkg.version, bnr_short_desc: bnr_config.short_desc, bnr_long_desc: bnr_config.long_desc, bnr_tag: bnr_config.tag })
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET ' + req.url + '')} ${chalk.bold.green('200')} Game exists, rendering game page`));
    } else {
        reply.status(404).view('/templates/error.hbs', { error_code: "404", title: "Game does not exist", desc_1: "Unfortunately, we could not find the game you are looking for.", desc_2: "Try a different link or create a new lobby on the home page." });
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET ' + req.url + '')} ${chalk.bold.red('404')} Game does not exist, rendering error page`));
    }
})

// End of Fastify and main functions - - - - - - - - - - - - - - - - - - - - - -


// Setup external connections - - - - - - - - - - - - - - - - - - - - - - - - -

// Prepare async mongoose connection messages
mongoose.connection.on('connected', function () {mongoose_connected()});
mongoose.connection.on('timeout', function () {console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Connection timed out`));mongoose_disconnected()});
mongoose.connection.on('disconnected', function () {console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Connection was interrupted`));mongoose_disconnected()});

// Connect to mongodb using mongoose
console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Attempting to connect using url "` + config_store.get('mongodb_url') + `"`));
mongoose.connect(config_store.get('mongodb_url'), {useNewUrlParser: true,  useUnifiedTopology: true, connectTimeoutMS: 10000});
//mongoose.set('useFindAndModify', false);

// When mongoose establishes a connection with mongodb
function mongoose_connected() {
    console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Connected successfully at "` + config_store.get('mongodb_url') + `"`));
    // Start purge game cycle
    if (config_store.get('purge_age_hrs') !== -1) {
        console.log(wipe(`${chalk.bold.red('Purge')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Purging all lobbies older than ` + config_store.get('purge_age_hrs') + ` hours`));
        lobby_actions.lobby_purge().then(function () {});
        setInterval(e => {
            console.log(wipe(`${chalk.bold.red('Purge')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Purging all lobbies older than ` + config_store.get('purge_age_hrs') + ` hours`));
            lobby_actions.lobby_purge().then(function () {});
        }, 3600000*2);
    }
    // Start webserver using config values
    console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Attempting to start http webserver on port ` + config_store.get('webserver_port')));
    fastify.listen(config_store.get('webserver_port'), function (err) {
        if (err) {
            fastify.log.error(err)
            process.exit(1)
        }
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Started http webserver on port ` + config_store.get('webserver_port')));
        // Open socket.io connection
        socket_handler(fastify, stats_store, config_store, bot);
        // Connect discord bot
        if (config_store.has('discord_bot_token') && config_store.get('discord_bot_token') !== '' &&
            config_store.has('discord_bot_channel') && config_store.get('discord_bot_channel') !== '') {
            bot.connect();
        }
    })
}

// When mongoose losses a connection with mongodb
function mongoose_disconnected() {
    console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Stopping http webserver on port ` + config_store.get('webserver_port')));
    //server.close();
}

// End of Setup external connections - - - - - - - - - - - - - - - - - - - - - -