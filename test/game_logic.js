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

// Variables
let lobby_id;

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
// Desc : simulates game play over 30 lobbies with a variable number of players over 3 rounds
// Author(s) : RAk3rman
describe('Simulation (final boss)', function() {
    // Create 20 lobbies
    for (let i = 1; i < 20; i++) {
        let plyr_ctn = i + 1;
        let rounds = 3;
        simulate_lobby(i, plyr_ctn, rounds);
    }
});

// Name : test.simulate_lobby
// Desc : simulates game play in a single lobby with n number of rounds
// Author(s) : RAk3rman
function simulate_lobby(id, plyr_ctn, rounds) {
    describe('Lobby #' + id + ' (' + plyr_ctn + 'P)', function () {
        this.timeout(plyr_ctn * 150); // Dynamically increase timeout for larger lobbies
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
            let include_host_choice = (Math.random() < 0.5) && plyr_ctn > 2;
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
        logger.info('Game simulation starting', { 'in': 'simulate_game', 'l_slug': lobby_details.slug, 'g_slug': lobby_details.games[i].slug, 'plyr_ctn': (await game_actions.get_players(lobby_details, i)).length });
        let turn_ctn = 0;
        // Loop forever until we get a winner, will time out if a player never wins
        while (!await game_actions.is_winner(lobby_details, i)) {
            // Check which player is playing
            let plyr_id = await player_actions.get_turn_plyr_id(lobby_details, i);
            // Simulate turn
            await simulate_turn(lobby_details, i, plyr_id, false, false);
            // If the turn is still on the current player, draw card
            if (await player_actions.get_turn_plyr_id(lobby_details, i) === plyr_id) {
                // Make sure we aren't exploding before drawing a card
                if (!await player_actions.is_exploding(await card_actions.filter_cards(plyr_id, lobby_details.games[i].cards))) {
                    // Draw card to end turn
                    let card_details = await game_actions.draw_card(lobby_details, i, plyr_id);
                    assert.exists(card_details, 'ensure drawn card exists');
                    // Log that card was drawn
                    logger.info('Card drawn (' + card_details._id + ')', { 'in': 'simulate_game', 'g_slug': lobby_details.games[i].slug, 'plyr_id': plyr_id });
                }
                // Check if the player is exploding (drew an EC somehow)
                if (await player_actions.is_exploding(await card_actions.filter_cards(plyr_id, lobby_details.games[i].cards))) {
                    logger.info('Player is exploding, attempt to defuse', { 'in': 'simulate_game', 'g_slug': lobby_details.games[i].slug, 'plyr_id': plyr_id });
                    // Force play through all cards to see if player has a defuse
                    await simulate_turn(lobby_details, i, plyr_id, true, false);
                    // If we are still exploding, kill player
                    if (await player_actions.is_exploding(await card_actions.filter_cards(plyr_id, lobby_details.games[i].cards))) {
                        // Log that card was drawn
                        logger.info('Player still exploding, force play chicken', { 'in': 'simulate_game', 'g_slug': lobby_details.games[i].slug, 'plyr_id': plyr_id });
                        await simulate_turn(lobby_details, i, plyr_id, true, true);
                    }
                }
            }
            turn_ctn++;
        }
        assert.isAbove(turn_ctn, 1, 'ensure number of turns is greater than 1');
        assert.isTrue(await game_actions.is_winner(lobby_details, i), 'ensure we have a winner');
    }
}

// Name : test.simulate_turn
// Desc : randomly plays cards as if a user were playing
// Author(s) : RAk3rman
async function simulate_turn(lobby_details, game_pos, plyr_id, play_all, play_chicken) {
    logger.info('Turn simulation starting', { 'in': 'simulate_turn', 'g_slug': lobby_details.games[game_pos].slug, 'plyr_id': plyr_id });
    // Get player's hand
    let player_hand = await card_actions.filter_cards(plyr_id, lobby_details.games[game_pos].cards);
    // Loop over each card in the players hand
    // Break out of loop if we use a card that advances the turn order
    for (let i = 0; i < player_hand.length && ((await player_actions.get_turn_plyr_id(lobby_details, game_pos)) === plyr_id); i++) {
        // For this card, give the user a 30% chance of playing it
        // If play_all is true, try to play every card in the hand except chickens
        // Then, make sure the card we are about to play is not a chicken unless play_chicken is true
        if ((Math.random() < 0.3 || play_all) && (player_hand[i].action !== "chicken" || play_chicken)) {
            // Make blind attempt to play card
            let target = { plyr_id: undefined, card_id: undefined, deck_pos: undefined }
            let callback = await game_actions.play_card(lobby_details, game_pos, player_hand[i]._id, plyr_id, target);
            // Ensure err wasn't thrown, if so, do nothing and try to play another card
            // Errors are sent to the client in the callback and appear in a popup when they attempt to play the card
            if (!callback.err) {
                // Log that card was played
                logger.info('Attempting to play (' + callback.card_id + ')', { 'in': 'simulate_turn', 'g_slug': lobby_details.games[game_pos].slug, 'plyr_id': plyr_id });
                // Check if callback was complete or incomplete
                // We shouldn't expect any errors with these group of cards
                if (callback.incomplete) {
                    // Make sure we are in card group that should require a callback
                    // These cards require special action and cannot be played blindly
                    let incomplete_group = ['defuse', 'favor', 'favorgator', 'randchick-1', 'randchick-2', 'randchick-3', 'randchick-4'];
                    assert.isTrue(incomplete_group.includes(callback.card_action), 'callback on ' + callback.card_id + ' should be in complete group');
                    // Return complete callback
                    if (callback.card_action === 'defuse') {
                        // Update target with needed parameters and play card
                        target.deck_pos = callback.data.max_pos;
                        callback = await game_actions.play_card(lobby_details, game_pos, player_hand[i]._id, plyr_id, target);
                        assert.isFalse(callback.incomplete, 'callback on ' + callback.card_id + ' should be complete');
                    } else if (callback.card_action === 'favor') {
                        // Update target with needed parameters and play card
                        target.plyr_id = await player_actions.next_seat(lobby_details, game_pos, "_id");
                        let target_hand = await card_actions.filter_cards(target.plyr_id, lobby_details.games[game_pos].cards);
                        target.card_id = target_hand.length !== 0 ? target_hand[Math.floor(Math.random() * (target_hand.length - 1))]._id : undefined;
                        callback = await game_actions.play_card(lobby_details, game_pos, player_hand[i]._id, plyr_id, target);
                    } else if (callback.card_action.includes('randchick') || callback.card_action === 'favorgator') {
                        // Update target with needed parameters and play card
                        target.plyr_id = await player_actions.next_seat(lobby_details, game_pos, "_id");
                        callback = await game_actions.play_card(lobby_details, game_pos, player_hand[i]._id, plyr_id, target);
                    } else {
                        assert.fail('callback on ' + callback.card_id + ' should be complete');
                    }
                    // Make sure we exited cleanly after making callback complete
                    assert.isUndefined(callback.err, 'callback on ' + callback.card_id + ' should not throw errors (' + callback.err + ')');
                } else {
                    // Make sure we are in card group that should not require a callback
                    // These cards can be played without any user interaction, no callbacks needed
                    let complete_group = ['attack', 'chicken', 'reverse', 'seethefuture', 'shuffle', 'skip', 'hotpotato', 'scrambledeggs', 'superskip', 'safetydraw', 'drawbottom'];
                    assert.isTrue(complete_group.includes(callback.card_action), 'callback on ' + callback.card_id + ' should be in incomplete group');
                }
                // Log that card was played
                logger.info('Card played (' + callback.card_id + ')', { 'in': 'simulate_turn', 'g_slug': lobby_details.games[game_pos].slug, 'plyr_id': plyr_id });
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