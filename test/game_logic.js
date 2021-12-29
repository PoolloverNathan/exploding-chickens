/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/test/test.js
Desc     : evaluation suite for testing game,
           player, and card interactions
Author(s): RAk3rman, SengdowJones, Vincent Do
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Packages
let Lobby = require('../models/lobby.js');
let assert = require('chai').assert;
let mongoose = require('mongoose');
const moment = require('moment');
const chalk = require('chalk');
const pkg = require('../package.json');
const fs = require('fs');
const wipe = chalk.white;
const dataStore = require('data-store');
const config_store = new dataStore({path: '../config/config.json'});
const stats_store = new dataStore({path: './test/logs/stats.json'});
const winston = require('winston');

// Services
let setup = require('../config/setup.js');
let lobby_actions = require('../services/lobby-actions.js');
let card_actions = require('../services/card-actions.js');
let game_actions = require('../services/game-actions.js');
let player_actions = require('../services/player-actions.js');
let rel_ids = require('../services/card-actions.js');
let event_actions = require('../services/event-actions.js');
const {uniqueNamesGenerator, adjectives, animals} = require("unique-names-generator");
const {get_turn_plyr_id} = require("../services/player-actions");

// Setup event logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: './test/logs/events.log', options: { flags: 'w' } }),
    ],
});

// Name : test.before
// Desc : get everything setup for test cases
// Author(s) : RAk3rman
before(done => {
    console.log(chalk.blue.bold('\nExploding Chickens v' + pkg.version + ' | Game Logic Test Cases'));
    // Check configuration values
    setup.check_values(config_store, stats_store, false);
    // Connect to mongodb using mongoose
    console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Attempting to connect using url "` + config_store.get('mongodb_url') + `"`));
    mongoose.connect(config_store.get('mongodb_url'), {useNewUrlParser: true,  useUnifiedTopology: true, connectTimeoutMS: 10000});
    mongoose.connection.on('connected', function () {
        console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Connected successfully at "` + config_store.get('mongodb_url') + `"`));
        console.log(wipe(`${chalk.bold.red('Mocha')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Starting test cases, hopefully something doesn't break`));
        done();
    });
    mongoose.connect(config_store.get('mongodb_url'), {useNewUrlParser: true,  useUnifiedTopology: true, connectTimeoutMS: 10000});
});

// Name : test.config_setup
// Desc : tests the configuration setup functions
// Author(s) : RAk3rman
describe('Config setup', function() {
    describe('#setup.check_values()', function() {
        // Temp setup config and stats store
        const temp_config_store = new dataStore({path: './test/temp_config.json'});
        const temp_stats_store = new dataStore({path: './test/temp_stats.json'});
        // Check configuration values
        it('check datastore values', function() {
            setup.check_values(temp_config_store, temp_stats_store, true);
        })
        // Verify that the config_store was set to defaults
        it('verify config defaults', function() {
            assert.equal(temp_config_store.get('webserver_port'), 3000, 'verify webserver_port default value');
            assert.equal(temp_config_store.get('mongodb_url'), 'mongodb://localhost:27017/exploding-chickens', 'verify mongodb_url default value');
            assert.equal(temp_config_store.get('purge_age_hrs'), 12, 'verify purge_age_hrs default value');
            assert.equal(temp_config_store.get('verbose_debug'), false, 'verify verbose_debug default value');
            assert.equal(temp_config_store.get('discord_bot_token'), '', 'verify discord_bot_token default value');
            assert.equal(temp_config_store.get('discord_bot_channel'), '', 'verify discord_bot_channel default value');
        })
        // Verify that the stats_store was set to defaults
        it('verify stats defaults', function() {
            let stats_array = ['games_played', 'mins_played', 'attack', 'defuse', 'chicken', 'favor', 'randchick', 'reverse', 'seethefuture', 'shuffle', 'skip', 'hotpotato', 'favorgator', 'scrambledeggs', 'superskip', 'safetydraw', 'drawbottom', 'sockets_active'];
            stats_array.forEach(element => {
                assert.equal(temp_stats_store.has(element), true, 'verify stats value exists');
            })
        })
    })
});

// Name : test.setup_test_lobby
// Desc : creates a test lobby with 10 players
// Author(s) : RAk3rman
async function setup_test_lobby(lobby_details, plyr_ctn) {
    // Create lobby
    lobby_details = await lobby_actions.create_lobby();
    // Add 10 players to lobby
    for (let i = 0; i < plyr_ctn; i++) {
        player_actions.create_player(lobby_details, 'P' + i, 'default.png');
        event_actions.log_event(lobby_details, 'create-player', lobby_details.players[i]._id, undefined, undefined, undefined);
    }
    return lobby_details;
}

// Name : test.lobbies
// Desc : creates a test lobby and initializes to sample values
// Author(s) : RAk3rman
describe('Lobbies', function() {
    describe('#lobby_actions.create_lobby()', function() {
        let lobby_details;
        it('create new sample lobby', async function() {
            lobby_details = await lobby_actions.create_lobby();
            await lobby_details.save();
        });
        it('slug exists', function() {
            assert(lobby_details.slug);
        });
        it('no players exist', function() {
            assert.equal(lobby_details.players.length, 0);
        });
        it('no games exist', function() {
            assert.equal(lobby_details.games.length, 0);
        });
    });
    describe('#lobby_actions.partition_players()', function() {
        let lobby_details;
        it('create new lobby env with 10 players', async function() {lobby_details = await setup_test_lobby(lobby_details, 10)});
        it('basic random partition with 10 players', async function() {
            // Update partition grouping method
            await lobby_actions.update_option(lobby_details, 'grp_method', 'random');
            // Partition 10 players
            await lobby_actions.partition_players(lobby_details);
            // Test expected configuration
            assert.equal(lobby_details.games.length, 2, 'should have 2 games of 5');
        });
        it('basic win # partition with 10 players', async function() {
            // Update partition grouping method
            await lobby_actions.update_option(lobby_details, 'grp_method', 'wins');
            // Partition 10 players
            await lobby_actions.partition_players(lobby_details);
            // Test expected configuration
            assert.equal(lobby_details.games.length, 2, 'should have 2 games of 5');
        });
        it('partition after kicking 5 players', async function() {
            // Kick 5 players (but not the host)
            for (let i = 1; i < 6; i++) {
                await player_actions.kick_player(lobby_details, lobby_details.players[0]._id, lobby_details.players[i]._id);
                event_actions.log_event(lobby_details, 'kick-player', lobby_details.players[0]._id, lobby_details.players[i]._id, undefined, undefined);
            }
            // Partition 5 players who remain
            await lobby_actions.partition_players(lobby_details);
            // Test expected configuration
            assert.equal(lobby_details.games.length, 1, 'should have 1 game of 5');
        });
        it('partition while games are in progress', async function() {
            // Start games
            await lobby_actions.start_games(lobby_details);
            // Add 5 players to lobby
            for (let i = 1; i < 6; i++) {
                player_actions.create_player(lobby_details, 'P' + i, 'default.png');
                event_actions.log_event(lobby_details, 'create-player', lobby_details.players[i]._id, undefined, undefined, undefined);
            }
            // Partition 10 players (5 in game (don't touch) and 5 awaiting assignment)
            await lobby_actions.partition_players(lobby_details);
            // Test expected configuration
            assert.equal(lobby_details.games.length, 2, 'should have 2 games of 5');
            // Reset games
            await lobby_actions.reset_games(lobby_details);
        });
        it('partition after games have been completed', async function() {
            // Partition 10 players
            await lobby_actions.partition_players(lobby_details);
            // Test expected configuration
            assert.equal(lobby_details.games.length, 2, 'should have 2 games of 5');
            // Start games
            await lobby_actions.start_games(lobby_details);
            //
        });
    })
    describe('#lobby_actions.start_games()', function() {
        let lobby_details;
        it('create new lobby env with 10 players', async function() {lobby_details = await setup_test_lobby(lobby_details, 10)});
        it('basic start with 2 new games', async function() {
            // Partition 10 players
            await lobby_actions.partition_players(lobby_details);
            // Start games
            await lobby_actions.start_games(lobby_details);
            // Test expected configuration
            assert.equal(lobby_details.games.length, 2, 'should have 2 games of 5');
            assert.isTrue(lobby_details.games[0].in_progress, 'game should be in progress');
            assert.isTrue(lobby_details.in_progress, 'lobby should be in progress');
        });
    })
    describe('#lobby_actions.reset_games()', function() {
        let lobby_details;
        it('create new lobby env with 10 players', async function() {lobby_details = await setup_test_lobby(lobby_details, 10)});
        it('basic reset with 2 new games', async function() {
            // Partition 10 players
            await lobby_actions.partition_players(lobby_details);
            // Start games
            await lobby_actions.reset_games(lobby_details);
            // Test expected configuration
            assert.equal(lobby_details.games.length, 2, 'should have 2 games of 5');
            assert.isEmpty(lobby_details.games[0].events, 'events array should be empty');
            assert.isFalse(lobby_details.games[0].in_progress, 'game should not be in progress');
            assert.isFalse(lobby_details.in_progress, 'lobby should not be in progress');
        });
    })
    describe('#lobby_actions.update_option()', function() {
        let lobby_details;
        it('create new lobby env with 10 players', async function() {lobby_details = await setup_test_lobby(lobby_details, 10)});
        it('modify grp_method', async function() {
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'grp_method', 'wins'));
            assert.equal(lobby_details.grp_method, 'wins');
            assert.isFalse(await lobby_actions.update_option(lobby_details, 'grp_method', undefined));
            assert.equal(lobby_details.grp_method, 'wins');
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'grp_method', 'random'));
            assert.equal(lobby_details.grp_method, 'random');
        });
        it('modify room_size', async function() {
            for (let i = 2; i < 7; i++) {
                assert.isTrue(await lobby_actions.update_option(lobby_details, 'room_size', i));
                assert.equal(lobby_details.room_size, i);
            }
            assert.isFalse(await lobby_actions.update_option(lobby_details, 'room_size', undefined));
            assert.equal(lobby_details.room_size, 6);
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'room_size', 5));
            assert.equal(lobby_details.room_size, 5);
        });
        it('modify play_timeout', async function() {
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'play_timeout', '30'));
            assert.equal(lobby_details.play_timeout, '30');
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'play_timeout', '60'));
            assert.equal(lobby_details.play_timeout, '60');
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'play_timeout', '120'));
            assert.equal(lobby_details.play_timeout, '120');
            assert.isFalse(await lobby_actions.update_option(lobby_details, 'play_timeout', undefined));
            assert.equal(lobby_details.play_timeout, '120');
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'play_timeout', '-1'));
            assert.equal(lobby_details.play_timeout, '-1');
        });
        it('modify include_host', async function() {
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'include_host', undefined));
            assert.isFalse(lobby_details.include_host);
            assert.isUndefined(lobby_details.players[0].game_assign);
            assert.equal(lobby_details.players[0].seat_pos, -1);
            assert.isTrue(await lobby_actions.update_option(lobby_details, 'include_host', undefined));
            assert.isTrue(lobby_details.include_host);
        });
    })
    describe('#lobby_actions.lobby_export()', function() {
        let lobby_details;
        it('create new lobby env with 10 players', async function() {lobby_details = await setup_test_lobby(lobby_details, 10)});
        it('export lobby', async function() {
            // Partition 10 players
            await lobby_actions.partition_players(lobby_details);
            // Export lobby
            let lobby_export = await lobby_actions.lobby_export(lobby_details, 'tests', 'spectator');
            assert.isNotNull(lobby_export);
        });
    })
    describe('#lobby_actions.delete_lobby()', function() {
        let lobby_details;
        it('create new lobby env with 10 players', async function() {lobby_details = await setup_test_lobby(lobby_details, 10)});
        it('deleting sample lobby', function(done) {
            lobby_actions.delete_lobby(lobby_details._id).then(result => {
                done();
            })
        });
        it('verifying deletion', async function() {
            assert.isNotOk(await Lobby.exists({ _id: lobby_details._id }));
        });
    })
    describe('#lobby_actions.lobby_purge()', function() {
        let lobby_details;
        it('create purgeable lobby', async function () {
            lobby_details = await Lobby.create({
                slug: uniqueNamesGenerator({dictionaries: [adjectives, animals], separator: '-', length: 2}),
                created: moment().subtract(config_store.get('purge_age_hrs'), "hours")
            });
        });
        it('purging lobby', function(done) {
            lobby_actions.lobby_purge(true).then(result => {
                done();
            })
        });
        it('verifying purge', async function() {
            assert.isNotOk(await Lobby.exists({ _id: lobby_details._id }));
        });
    })
});

// Name : test.players
// Desc : adds players to a sample lobby and tests interaction
// Author(s) : RAk3rman
describe('Players', function() {
    let lobby_details;
    it('create new sample lobby', async function() {
        lobby_details = await lobby_actions.create_lobby();
        await lobby_details.save();
    });
    describe('#player_actions.create_player()', function() {
        it('add 10 players to lobby', function() {
            for (let i = 0; i < 10; i++) {
                player_actions.create_player(lobby_details, 'P' + i, 'default.png');
            }
        });
        it('partition players', async function() {
            await lobby_actions.partition_players(lobby_details);
        });
        it('verify player count', function() {
            assert.equal(lobby_details.players.length, 10, 'player count should be 10');
        });
    })
    describe('#player_actions.get_player_details()', function() {
        it('player details exist', function() {
            for (let i = 0; i < 10; i++) {
                assert.isNotNull(player_actions.get_player_details(lobby_details, lobby_details.players[i]._id), 'should not be null');
            }
        });
        it('check non-existent player', function() {
            assert.isNull(player_actions.get_player_details(lobby_details, ''), 'should be null');
            assert.isNull(player_actions.get_player_details(lobby_details, 'PLAYER-DNE'), 'should be null');
        });
    })
    describe('#player_actions.get_player_pos()', function() {
        it('player position exist', function() {
            for (let i = 0; i < 10; i++) {
                assert.isNotNull(player_actions.get_player_pos(lobby_details, lobby_details.players[i]._id), 'should not be null');
            }
        });
        it('check non-existent player', function() {
            assert.isNull(player_actions.get_player_pos(lobby_details, ''), 'should be null');
            assert.isNull(player_actions.get_player_pos(lobby_details, 'PLAYER-DNE'), 'should be null');
        });
    })
    describe('#player_actions.get_turn_plyr_id()', function() {
        it('player id exist', function() {
            assert.isNotNull(player_actions.get_turn_plyr_id(lobby_details, 0), 'should not be null');
        });
        it('player id exist', function() {
            assert.isNotNull(player_actions.get_turn_plyr_id(lobby_details, 1), 'should not be null');
        });
        it('check non-existent player id', function() {
            lobby_details.games[0].turn_seat_pos = -1;
            lobby_details.games[1].turn_seat_pos = -1;
            assert.isNull(player_actions.get_turn_plyr_id(lobby_details, 0), 'should be null');
            assert.isNull(player_actions.get_turn_plyr_id(lobby_details, 1), 'should be null');
            lobby_details.games[0].turn_seat_pos = 0;
            lobby_details.games[1].turn_seat_pos = 0;
        });
    })
    describe('#player_actions.update_sockets_open()', function() {
        // TODO Implement test
    })
    describe('#player_actions.create_hand()', function() {
        // TODO Implement test
    })
    describe('#player_actions.randomize_seats()', function() {
        // TODO Implement test
    })
    describe('#player_actions.next_seat()', function() {
        // TODO Implement test
    })
    describe('#player_actions.disable_player()', function() {
        // TODO Implement test
    })
    describe('#player_actions.kick_player()', function() {
        // TODO Implement test
    })
    describe('#player_actions.make_host()', function() {
        // TODO Implement test
    })
    describe('#player_actions.sort_hand()', function() {
        // TODO Implement test
    })
    describe('#player_actions.is_exploding()', function() {
        // TODO Implement test
    })
    describe('#player_actions.player_export()', function() {
        // TODO Implement test
    })
});

// Name : test.cards
// Desc : adds cards to a sample lobby and tests interaction
// Author(s) : RAk3rman
// describe('Cards', function() {
//
// });

// Name : test.events
// Desc : adds events to a sample lobby and tests parse-ability
// Author(s) : RAk3rman
describe('Events', function() {
    let lobby_details;
    it('create new sample lobby', async function() {
        lobby_details = await lobby_actions.create_lobby();
        await lobby_details.save();
    });
    it('add 10 players to lobby', function() {
        for (let i = 0; i < 10; i++) {
            player_actions.create_player(lobby_details, 'P' + i, 'default.png');
            event_actions.log_event(lobby_details, 'create-player', lobby_details.players[i]._id, undefined, undefined, undefined);
        }
    });
    it('partition players', async function() {
        await lobby_actions.partition_players(lobby_details);
    });
    describe('#event_actions.log_event()', function() {
        it('logging every type of event', function() {
            // Valid events
            event_actions.log_event(lobby_details, 'create-player', lobby_details.players[0]._id, undefined, undefined, undefined);
            event_actions.log_event(lobby_details, 'include-player', lobby_details.players[0]._id, undefined, undefined, undefined);
            event_actions.log_event(lobby_details, 'start-games', lobby_details.players[0]._id, undefined, undefined, undefined);
            event_actions.log_event(lobby_details, 'start-game', lobby_details.players[0]._id, undefined, undefined, undefined);
            event_actions.log_event(lobby_details, 'reset-games', lobby_details.players[0]._id, undefined, undefined, undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'attack', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'chicken', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'defuse', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, lobby_details.players[1]._id, 'favor', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, lobby_details.players[1]._id, 'randchick-1', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, lobby_details.players[1]._id, 'randchick-2', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, lobby_details.players[1]._id, 'randchick-3', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, lobby_details.players[1]._id, 'randchick-4', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'reverse', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'seethefuture', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'shuffle', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'skip', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'hotpotato', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'scrambledeggs', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'superskip', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'safetydraw', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'drawbottom', undefined);
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, lobby_details.players[1]._id, 'favorgator', undefined);
            event_actions.log_event(lobby_details, 'draw-card', lobby_details.players[0]._id, undefined, lobby_details.games[0].cards[0]._id, undefined);
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'grp_method', 'random');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'grp_method', 'wins');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'room_size', '2');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'room_size', '3');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'room_size', '4');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'room_size', '5');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'room_size', '6');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'play_timeout', '-1');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'play_timeout', '30');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'play_timeout', '60');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'play_timeout', '120');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'include_host', 'true');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'include_host', 'false');
            event_actions.log_event(lobby_details, 'kick-player', lobby_details.players[0]._id, lobby_details.players[1]._id, undefined, undefined);
            event_actions.log_event(lobby_details, 'make-host', lobby_details.players[0]._id, lobby_details.players[1]._id, undefined, undefined);
            event_actions.log_event(lobby_details, 'import-pack', lobby_details.players[0]._id, undefined, 'yolking_around', undefined);
            event_actions.log_event(lobby_details, 'export-pack', lobby_details.players[0]._id, undefined, 'yolking_around', undefined);
            event_actions.log_event(lobby_details, 'game-won', lobby_details.players[0]._id, undefined, undefined, undefined);
            // Invalid events
            event_actions.log_event(lobby_details, 'play-card', lobby_details.players[0]._id, undefined, 'CARD-DNE', undefined);
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'grp_method', undefined);
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'room_size', '1');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'room_size', '7');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'play_timeout', '-999');
            event_actions.log_event(lobby_details, 'update-option', lobby_details.players[0]._id, undefined, 'OPTION-DNE', undefined);
            event_actions.log_event(lobby_details, 'import-pack', lobby_details.players[0]._id, undefined, 'PACK-DNE', undefined);
            event_actions.log_event(lobby_details, 'export-pack', lobby_details.players[0]._id, undefined, 'PACK-DNE', undefined);
            event_actions.log_event(lobby_details, 'invalid', undefined, undefined, undefined, undefined);
        });
    })
    describe('#event_actions.parse_event()', function() {
        let splice_pos = 52;
        it('check valid events', function() {
            for (let i = 0; i < splice_pos; i++) {
                assert.notEqual(event_actions.parse_event(lobby_details, lobby_details.events[i]).desc, 'Invalid event action', 'event action should be valid');
            }
        })
        it('check invalid events', function() {
            for (let i = splice_pos; i < lobby_details.events.length; i++) {
                assert.equal(event_actions.parse_event(lobby_details, lobby_details.events[i]).desc, 'Invalid event action', 'event action should not be valid');
            }
        })
    })
});

// Name : test.simulation
// Desc : simulates game play over 6 lobbies with (2 + 3 * n) number of players over 3 rounds
// Author(s) : RAk3rman
describe('Simulation (final boss)', function() {
    let stats = { lobbies: 0, games: 0, cards: 0 }
    // Create 6 lobbies
    for (let i = 0; i < 6; i++) {
        let plyr_ctn = 2 + 3 * i;
        let rounds = 3;
        simulate_lobby(i + 1, plyr_ctn, rounds, stats);
    }
    // Print stats after we are done with this test
    after(function() {
        console.log(wipe(`\n${chalk.bold.red('Mocha')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Simulation stats: ` + stats.lobbies + ` lobbies, ` + stats.games + ` games, with ` + stats.cards + ` card interactions`));
    });
});

// Name : test.simulate_lobby
// Desc : simulates game play in a single lobby with n number of rounds
// Author(s) : RAk3rman
function simulate_lobby(id, plyr_ctn, rounds, stats) {
    describe('Lobby #' + id + ' (' + plyr_ctn + 'P)', function () {
        this.timeout(plyr_ctn * 1000 + 3000); // Dynamically increase timeout for larger lobbies
        stats.lobbies++;
        let lobby_details;
        it('Setup lobby', async function () {
            // Create new lobby
            lobby_details = await lobby_actions.create_lobby();
            await lobby_details.save();
            // Select grouping method
            let grp_method_options = ['random', 'wins'];
            let grp_method_choice = grp_method_options[Math.floor(Math.random() * grp_method_options.length)];
            await lobby_actions.update_option(lobby_details, 'grp_method', grp_method_choice);
            // Select room size
            let room_size_options = ['2', '3', '4', '5', '6'];
            let room_size_choice = room_size_options[Math.floor(Math.random() * room_size_options.length)];
            await lobby_actions.update_option(lobby_details, 'room_size', room_size_choice);
            // Select play timeout (even though it is redundant in testing)
            let play_timeout_options = ['-1', '30', '60', '120'];
            let play_timeout_choice = play_timeout_options[Math.floor(Math.random() * play_timeout_options.length)];
            await lobby_actions.update_option(lobby_details, 'play_timeout', play_timeout_choice);
            // Add players to game and select if we want to include host
            let include_host_choice = (Math.random() < 0.5) && plyr_ctn > 2;
            if ((plyr_ctn - (include_host_choice ? 1 : 0)) % 2 !== 0 && lobby_details.room_size === 2) plyr_ctn += 1;
            for (let i = 0; i < plyr_ctn; i++) {
                player_actions.create_player(lobby_details, 'P' + i, 'default.png');
            }
            if (include_host_choice) await lobby_actions.update_option(lobby_details, 'include_host', '');
            // Import expansion packs
            let packs = ['yolking_around'];
            for (let i = 0; i < packs.length; i++) {
                if (Math.random() < 0.5) lobby_details.packs.push(packs[i]);
            }
        })
        // Simulate unique games over unique rounds
        for (let i = 0; i < rounds; i++) {
            it('Round #' + (i + 1),async function () {
                await lobby_actions.partition_players(lobby_details);
                await lobby_actions.start_games(lobby_details);
                await simulate_games(lobby_details, stats);
                await audit_games(lobby_details);
                await lobby_actions.reset_games(lobby_details);
            })
        }
        it('Teardown lobby', async function () {
            await lobby_actions.delete_lobby(lobby_details._id);
            assert.isNotOk(await Lobby.exists({ _id: lobby_details._id }));
        })
    });
}

// Name : test.simulate_games
// Desc : simulates all games in a lobby to completion
// Author(s) : RAk3rman
async function simulate_games(lobby_details, stats) {
    for (let i = 0; i < lobby_details.games.length; i++) {
        logger.info('Game simulation starting', { 'in': 'simulate_game', 'l_slug': lobby_details.slug, 'g_slug': lobby_details.games[i].slug, 'plyr_ctn': (await game_actions.get_players(lobby_details, i)).length });
        stats_store.set('games_played', stats_store.get('games_played') + 1);
        stats.games++;
        let turn_ctn = 0;
        // Loop forever until we get a winner, will time out if a player never wins
        while (!await game_actions.is_winner(lobby_details, i)) {
            // Check which player is playing
            let plyr_id = await player_actions.get_turn_plyr_id(lobby_details, i);
            // Simulate turn
            await simulate_turn(lobby_details, i, plyr_id, false, false, stats);
            // If the turn is still on the current player, draw card
            if (await player_actions.get_turn_plyr_id(lobby_details, i) === plyr_id) {
                // Make sure we aren't exploding before drawing a card
                if (!await player_actions.is_exploding(await card_actions.filter_cards(plyr_id, lobby_details.games[i].cards))) {
                    // Draw card to end turn
                    let card_details = await game_actions.draw_card(lobby_details, i, plyr_id);
                    assert.exists(card_details, 'ensure drawn card exists');
                    // Log that card was drawn
                    logger.info('Card drawn (' + card_details._id + ')', { 'in': 'simulate_game', 'g_slug': lobby_details.games[i].slug, 'plyr_id': plyr_id });
                    stats.cards++;
                }
                // Check if the player is exploding (drew an EC somehow)
                if (await player_actions.is_exploding(await card_actions.filter_cards(plyr_id, lobby_details.games[i].cards))) {
                    logger.info('Player is exploding, attempt to defuse', { 'in': 'simulate_game', 'g_slug': lobby_details.games[i].slug, 'plyr_id': plyr_id });
                    // Force through all cards to see if player has a defuse card
                    await simulate_turn(lobby_details, i, plyr_id, true, false, stats);
                    // If we are still exploding, kill player
                    if (await player_actions.is_exploding(await card_actions.filter_cards(plyr_id, lobby_details.games[i].cards))) {
                        logger.info('Player still exploding, force play chicken', { 'in': 'simulate_game', 'g_slug': lobby_details.games[i].slug, 'plyr_id': plyr_id });
                        await simulate_turn(lobby_details, i, plyr_id, true, true, stats);
                    }
                }
            }
            turn_ctn++;
        }
        // Game has finished, prelim assertions
        assert.isAbove(turn_ctn, 1, 'ensure number of turns is greater than 1');
        assert.isTrue(await game_actions.is_winner(lobby_details, i), 'ensure we have a winner');
    }
}

// Name : test.simulate_turn
// Desc : randomly plays cards as if a user were playing
// Author(s) : RAk3rman
async function simulate_turn(lobby_details, game_pos, plyr_id, play_all, play_chicken, stats) {
    logger.info('Turn simulation starting', { 'in': 'simulate_turn', 'g_slug': lobby_details.games[game_pos].slug, 'plyr_id': plyr_id });
    // Get player's hand
    let player_hand = await card_actions.filter_cards(plyr_id, lobby_details.games[game_pos].cards);
    // Loop over each card in the players hand
    // Break out of loop if we use a card that advances the turn order
    for (let i = 0; i < player_hand.length && ((await player_actions.get_turn_plyr_id(lobby_details, game_pos)) === plyr_id); i++) {
        // For this card, give the user a 30% chance of playing it
        // If play_all is true, try to play every card in the hand
        // Then, make sure the card we are about to play is not a chicken unless play_chicken is true
        if ((Math.random() < 0.5 || play_all) && (player_hand[i].action !== "chicken" || play_chicken)) {
            // Make blind attempt to play card
            let target = { plyr_id: undefined, card_id: undefined, deck_pos: undefined }
            let callback = await game_actions.play_card(lobby_details, game_pos, player_hand[i]._id, plyr_id, target, stats_store);
            // Ensure err wasn't thrown, if so, do nothing and try to play another card
            // Errors are sent to the client in the callback and appear in a popup when they attempt to play the card
            if (!callback.err) {
                // Log that a card was played
                logger.info('Attempting to play (' + callback.card._id + ')', { 'in': 'simulate_turn', 'g_slug': lobby_details.games[game_pos].slug, 'plyr_id': plyr_id });
                // Check if callback was complete or incomplete
                // We shouldn't expect any errors with these group of cards
                if (callback.incomplete) {
                    // Make sure we are in card group that should require a callback
                    // These cards require special action and cannot be played blindly
                    let incomplete_group = ['defuse', 'favor', 'favorgator', 'randchick-1', 'randchick-2', 'randchick-3', 'randchick-4'];
                    assert.isTrue(incomplete_group.includes(callback.card.action), 'callback on ' + callback.card._id + ' should be in complete group');
                    // Provide value where we can enforce incompleteness and errors
                    let enforce_errors = true;
                    let enforce_incomplete = true;
                    // Return complete callback
                    if (callback.card.action === 'defuse') { // Provide deck pos target
                        target.deck_pos = Math.floor(Math.random() * callback.data.max_pos);
                    } else if (callback.card.action === 'favor') { // Provide plyr_id and card_id target
                        target.plyr_id = await player_actions.next_seat(lobby_details, game_pos, "_id");
                        let target_hand = await card_actions.filter_cards(target.plyr_id, lobby_details.games[game_pos].cards);
                        target.card_id = target_hand.length !== 0 ? target_hand[Math.floor(Math.random() * (target_hand.length - 1))]._id : undefined;
                        enforce_incomplete = false;
                    } else if (callback.card.action.includes('randchick') || callback.card.action === 'favorgator') { // Provide plyr_id target
                        target.plyr_id = await player_actions.next_seat(lobby_details, game_pos, "_id");
                        enforce_incomplete = false;
                    } else {
                        assert.fail('callback on ' + callback.card._id + ' should be complete');
                    }
                    // Play card with new target parameters
                    callback = await game_actions.play_card(lobby_details, game_pos, player_hand[i]._id, plyr_id, target, stats_store);
                    // Make sure we exited cleanly after making callback complete
                    if (enforce_errors) assert.isUndefined(callback.err, 'callback on ' + callback.card._id + ' should not throw errors (' + callback.err + ')');
                    if (enforce_incomplete) assert.isFalse(callback.incomplete, 'callback on ' + callback.card._id + ' should be complete');
                } else {
                    // Make sure we are in card group that should not require a callback
                    // These cards can be played without any user interaction, no callbacks needed
                    let complete_group = ['attack', 'chicken', 'reverse', 'seethefuture', 'shuffle', 'skip', 'hotpotato', 'scrambledeggs', 'superskip', 'safetydraw', 'drawbottom'];
                    assert.isTrue(complete_group.includes(callback.card.action), 'callback on ' + callback.card._id + ' should be in incomplete group');
                }
                // Log that card was played
                logger.info('Card played (' + callback.card._id + ')', { 'in': 'simulate_turn', 'g_slug': lobby_details.games[game_pos].slug, 'plyr_id': plyr_id });
                stats.cards++;
            }
        }
    }
    // Verify number of active chickens and active players match
    let active_chickens = 1;
    let active_players = 0;
    for (let i = 0; i < lobby_details.games[game_pos].cards.length; i++) {
        if (lobby_details.games[game_pos].cards[i].action === 'chicken' && lobby_details.games[game_pos].cards[i].assign !== 'out_of_play') active_chickens++;
    }
    let players = await game_actions.get_players(lobby_details, game_pos);
    for (let i = 0; i < players.length; i++) {
        if (!players[i].is_dead) active_players++;
    }
    assert.equal(active_chickens, active_players, 'active players (exp) should equal active chickens (act) plus 1');
}

// Name : test.audit_games
// Desc : audits all games in lobby, ensuring game outcome was possible
// Author(s) : RAk3rman
function audit_games(lobby_details) {
    for (let i = 0; i < lobby_details.games.length; i++) {
        // Make sure card assignments match
        let assigns = new Set(['draw_deck', 'discard_deck', 'out_of_play']);
        for (let j = 0; j < lobby_details.games[i].cards.length; j++) {
            assigns.add(lobby_details.games[i].cards[j].assign);
        }
        assert.isBelow(assigns.size, 5, 'ensure card assignments match')
    }
}

// Name : test.after
// Desc : clean everything up after test cases
// Author(s) : RAk3rman
after(done => {
    // Clean up temp config and stats store
    fs.unlinkSync('./test/temp_config.json');
    fs.unlinkSync('./test/temp_stats.json');
    // Close mongoose connection
    console.log(wipe(`${chalk.bold.yellow('Mongoose')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Closing mongodb connection`));
    mongoose.disconnect().then(result => {done()});
});