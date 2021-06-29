/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/app.js
Desc     : main application file
Author(s): RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages and configuration - - - - - - - - - - - - - - - - - - - - - - - - -

// Declare packages
let game = require('./models/game.js');
const path = require('path');
let mongoose = require('mongoose');
const dataStore = require('data-store');
const config_storage = new dataStore({path: './config/config.json'});
const stats_storage = new dataStore({path: './config/stats.json'});
const moment = require('moment');
const chalk = require('chalk');
const pkg = require('./package.json');
const eris = require('eris');
const wipe = chalk.white;

// Configuration & testing
let setup = require('./config/setup.js');

// Services
let game_actions = require('./services/game-actions.js');
let socket_handler = require('./services/socket-handler.js');

// Print header to console
console.clear();
console.log(chalk.blue.bold('\nExploding Chickens v' + pkg.version + ((process.argv[2] !== undefined) ? ' | ' + process.argv[2].toUpperCase() : "" )));
console.log(chalk.white('--> Contributors: ' + pkg.author));
console.log(chalk.white('--> Description: ' + pkg.description));
console.log(chalk.white('--> Github: ' + pkg.homepage + '\n'));

// Check configuration values
setup.check_values(config_storage, stats_storage);

// Discord bot setup
let bot;
if (config_storage.has('discord_bot_token') && config_storage.get('discord_bot_token') !== '' &&
    config_storage.has('discord_bot_channel') && config_storage.get('discord_bot_channel') !== '') {
    // Declare variable
    bot = new eris.Client(config_storage.get('discord_bot_token'));

    // When the bot is connected and ready, update console
    bot.on('ready', () => {
        // Set bot status
        bot.editStatus("online");
        // Send update to console
        console.log(wipe(`${chalk.bold.blueBright('Discord')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Bot is now connected to Discord API`));
        bot.createMessage(config_storage.get('discord_bot_channel'), ":white_check_mark: Exploding Chickens is now online");
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
let game_actions_api = require('./routes/game-actions-api.js');
let error_routes = require('./routes/error-routes.js');

// Import routes
game_actions_api(fastify);
error_routes(fastify);

// Home page
fastify.get('/', (req, reply) => {
    reply.view('/templates/home.hbs', {
        title: "Exploding Chickens",
        version: pkg.version,
        stat_games_played: stats_storage.get('games_played').toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,'),
        stat_explosions: stats_storage.get('explosions').toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,'),
        stats_avg_play_time: Math.round(stats_storage.get('mins_played') / stats_storage.get('games_played'))
    })
    console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET /')} ${chalk.bold.green('200')} Rendering home page`));
})

// Game page
fastify.get('/game/:_id', {
    config: {
        rateLimit: {
            max: 15,
            timeWindow: '1 minute'
        }
    }
}, async function (req, reply) {
    // Make sure game exists
    if (await game.exists({ slug: req.params._id })) {
        reply.view('/templates/game.hbs', { slug_1: req.params._id, slug_2: req.params._id, slug_3: req.params._id, version: pkg.version })
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] ${chalk.dim.magenta('web-request     ')} ${chalk.bold.magenta('GET ' + req.url + '')} ${chalk.bold.green('200')} Game exists, rendering game page`));
    } else {
        reply.status(404).view('/templates/error.hbs', { error_code: "404", title: "Game does not exist", desc_1: "Unfortunately, we could not find the game lobby you are looking for.", desc_2: "Try a different link or create a new game on the home page." });
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
console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Attempting to connect using url "` + config_storage.get('mongodb_url') + `"`));
mongoose.connect(config_storage.get('mongodb_url'), {useNewUrlParser: true,  useUnifiedTopology: true, connectTimeoutMS: 10000});
mongoose.set('useFindAndModify', false);

// When mongoose establishes a connection with mongodb
function mongoose_connected() {
    console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Connected successfully at ` + config_storage.get('mongodb_url')));
    // Start purge game cycle
    game_actions.game_purge().then(function () {});
    setInterval(game_actions.game_purge, 3600000*2);
    // Start webserver using config values
    console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Attempting to start http webserver on port ` + config_storage.get('webserver_port')));
    fastify.listen(config_storage.get('webserver_port'), function (err) {
        if (err) {
            fastify.log.error(err)
            process.exit(1)
        }
        console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Started http webserver on port ` + config_storage.get('webserver_port')));
        // Open socket.io connection
        socket_handler(fastify, stats_storage);
        // Connect discord bot
        if (config_storage.has('discord_bot_token') && config_storage.get('discord_bot_token') !== '') {
            bot.connect();
        }
    })
}

// When mongoose losses a connection with mongodb
function mongoose_disconnected() {
    console.log(wipe(`${chalk.bold.magenta('Fastify')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Stopping http webserver on port ` + config_storage.get('webserver_port')));
    //server.close();
}

// End of Setup external connections - - - - - - - - - - - - - - - - - - - - - -