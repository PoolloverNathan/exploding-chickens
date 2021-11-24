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
const wipe = chalk.white;
const dataStore = require('data-store');
const config_storage = new dataStore({path: '../config/config.json'});
const stats_storage = new dataStore({path: './config/stats.json'});

// Services
let setup = require('../config/setup.js');
let lobby_actions = require('../services/lobby-actions.js');
let card_actions = require('../services/card-actions.js');
let game_actions = require('../services/game-actions.js');
let player_actions = require('../services/player-actions.js');
let rel_ids = require('../services/card-actions.js');
let event_actions = require('../services/event-actions.js');
const {uniqueNamesGenerator, adjectives, animals} = require("unique-names-generator");
const {get_turn_player_id} = require("../services/player-actions");

// Variables
let lobby_id;

// Name : test.before
// Desc : get everything setup for test cases
// Author(s) : RAk3rman
before(done => {
    console.log(chalk.blue.bold('\nExploding Chickens v' + pkg.version + ' | Game Logic Test Cases'));
    // Check configuration values
    setup.check_values(config_storage, stats_storage);
    // Connect to mongodb using mongoose
    console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Attempting to connect using url "` + config_storage.get('mongodb_url') + `"`));
    mongoose.connect(config_storage.get('mongodb_url'), {useNewUrlParser: true,  useUnifiedTopology: true, connectTimeoutMS: 10000});
    mongoose.connection.on('connected', function () {
        console.log(wipe(`${chalk.bold.yellow('MongoDB')}: [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Connected successfully at "` + config_storage.get('mongodb_url') + `"`));
        console.log(wipe(`${chalk.bold.red('Mocha')}:   [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Starting test cases, hopefully something doesn't break`));
        done();
    });
    mongoose.connect(config_storage.get('mongodb_url'), {useNewUrlParser: true,  useUnifiedTopology: true, connectTimeoutMS: 10000});
});

// Name : test.lobby_setup
// Desc : creates a test lobby and initializes to sample values
// Author(s) : RAk3rman
describe('Lobby setup', function() {
    let lobby_details;
    describe('#lobby_actions.create_lobby()', function() {
        it('create new sample lobby', function(done) {
            lobby_actions.create_lobby().then(result => {
                lobby_details = result;
                lobby_id = result._id;
                done();
            })
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
    describe('#lobby_actions.game_details_slug(slug)', function() {
        let lobby_details_test;
        it('search for existing lobby', function(done) {
            lobby_actions.lobby_details_slug(lobby_details.slug).then(result => {
                lobby_details_test = result;
                done();
            })
        });
        it('games match', function() {
            assert.equal(lobby_details.slug, lobby_details_test.slug);
        });
    });
    describe('#lobby_actions.lobby_details_id(_id)', function() {
        let lobby_details_test;
        it('search for existing lobby', function(done) {
            lobby_actions.lobby_details_id(lobby_details._id).then(result => {
                lobby_details_test = result;
                done();
            })
        });
        it('lobbies match', function() {
            assert.equal(lobby_details.slug, lobby_details_test.slug);
        });
    });
});

// Name : test.players
// Desc : adds players to a sample game and tests interaction
// Author(s) : RAk3rman
// describe('Players', function() {
//
// });

// Name : test.cards
// Desc : adds cards to a sample game and tests interaction
// Author(s) : RAk3rman
// describe('Cards', function() {
//
// });

// Name : test.gameplay
// Desc : tests game functions and interaction
// Author(s) : RAk3rman
// describe('Gameplay', function() {
//
// });

// Name : test.lobby_deletion
// Desc : deletes a test lobby and cleans up
// Author(s) : RAk3rman
describe('Lobby deletion', function() {
    describe('#lobby_actions.lobby_purge()', function() {
        let lobby_details;
        it('create purgeable lobby', async function () {
            lobby_details = await Lobby.create({
                slug: uniqueNamesGenerator({dictionaries: [adjectives, animals], separator: '-', length: 2}),
                created: moment().subtract(config_storage.get('purge_age_hrs'), "hours")
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
    });
    describe('#lobby_actions.delete_lobby(lobby_id))', function() {
        it('deleting sample lobby', function(done) {
            lobby_actions.delete_lobby(lobby_id).then(result => {
                done();
            })
        });
        it('verifying deletion', async function() {
            assert.isNotOk(await Lobby.exists({ _id: lobby_id }));
        });
    });
});

// Name : test.simulation
// Desc : simulates game play over 50 lobbies with a variable number of players over 3 rounds
// Author(s) : RAk3rman
describe('Simulation (final boss)', function() {
    // Create 50 lobbies
    for (let i = 1; i < 50; i++) {
        simulate_lobby(i, i + 1, 3);
    }
    simulate_lobby(50, 200, 3);
});

// Name : test.simulate_lobby
// Desc : simulates game play in a single lobby with x number of rounds
// Author(s) : RAk3rman
function simulate_lobby(id, plyr_ctn, rounds) {
    describe('Lobby #' + id + ' (' + plyr_ctn + 'P)', function () {
        this.timeout(plyr_ctn * 50); // Dynamically increase timeout for larger lobbies
        let lobby_details;
        describe('Setup lobby', function () {
            it('create lobby', async function() {
                lobby_details = await lobby_actions.create_lobby();
            });
            let grp_method_options = ['random', 'wins'];
            let grp_method_choice = grp_method_options[Math.floor(Math.random() * grp_method_options.length)];
            it('choose grp_method (' + grp_method_choice + ')', async function() {
                await lobby_actions.update_option(lobby_details, 'grp_method', grp_method_choice);
            });
            let room_size_options = ['2', '3', '4', '5', '6'];
            let room_size_choice = room_size_options[Math.floor(Math.random() * room_size_options.length)];
            it('choose room_size (' + room_size_choice + ')', async function() {
                await lobby_actions.update_option(lobby_details, 'room_size', room_size_choice);
            });
            let include_host_choice = Math.random() < 0.5;
            it('choose include_host (' + !include_host_choice + ')', async function() {
                if (include_host_choice) await lobby_actions.update_option(lobby_details, 'include_host', '');
            });
            it('populate players (' + plyr_ctn + ')', async function() {
                if ((plyr_ctn - (include_host_choice ? 1 : 0)) % 2 !== 0 && lobby_details.room_size === 2) plyr_ctn += 1;
                for (let i = 0; i < plyr_ctn; i++) {
                    await player_actions.create_player(lobby_details, 'P' + i, 'default.png');
                }
            });
            let packs = ['yolking_around'];
            for (let i = 0; i < packs.length; i++) {
                if (Math.random() < 0.5) packs.splice(i, 1);
            }
            it('import expansion packs (' + packs + ')', async function() {
                for (let i = 0; i < packs.length; i++) {
                    lobby_details.packs.push(packs[i]);
                }
            });
        })
        // Simulate unique games over unique rounds
        for (let i = 0; i < rounds; i++) {
            describe('Round #' + (i + 1),function () {
                it('partition players', async function() {
                    await lobby_actions.partition_players(lobby_details);
                });
                it('start games', async function() {
                    await lobby_actions.start_games(lobby_details);
                });
                it('simulate games to completion', async function() {
                    await simulate_games(lobby_details);
                });
                it('audit integrity of games');
                it('replay games using events');
                it('reset games', async function() {
                    await lobby_actions.reset_games(lobby_details);
                });
            })
        }
        describe('Teardown lobby', function () {
            it('delete lobby', async function() {
                await lobby_actions.delete_lobby(lobby_details._id);
            });
            it('verifying deletion', async function() {
                assert.isNotOk(await Lobby.exists({ _id: lobby_id }));
            });
        })
    });
}

// Name : test.simulate_games
// Desc : simulates all games in a lobby to completion
// Author(s) : RAk3rman
async function simulate_games(lobby_details) {
    for (let i = 0; i < lobby_details.games.length; i++) {
        // Loop forever until we get a winner, will timeout if a player never wins
        while (!await game_actions.is_winner(lobby_details, i)) {
            let player_id = await player_actions.get_turn_player_id(lobby_details, i);
            let card_details = await game_actions.draw_card(lobby_details, i, player_id);
            assert.exists(card_details, 'ensure drawn card exists');
            if (card_details.action === 'chicken') {
                await card_actions.kill_player(lobby_details, i, player_id);
                await game_actions.advance_turn(lobby_details, i);
            }
        }
        assert.isTrue(await game_actions.is_winner(lobby_details, i), 'ensure we have a winner');
    }
}

// Name : test.audit_games
// Desc : audits all games in lobby, ensuring game outcome was possible
// Author(s) : RAk3rman
function audit_games(lobby_details, game_pos) {

}

// Name : test.replay_games
// Desc : reconstructs all games in a lobby into new, single use lobbies and attempts to replay game
// Author(s) : RAk3rman
function replay_games(lobby_details, game_pos) {

}

// Name : test.after
// Desc : clean everything up after test cases
// Author(s) : RAk3rman
after(done => {
    // Close mongoose connection
    console.log(wipe(`${chalk.bold.yellow('Mongoose')}:  [` + moment().format('MM/DD/YY-HH:mm:ss') + `] Closing mongodb connection`));
    mongoose.disconnect().then(result => {done()});
});