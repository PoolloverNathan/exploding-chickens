# Exploding Chickens

[![Mocha Tests](https://github.com/rak3rman/exploding-chickens/actions/workflows/mocha-tests.yml/badge.svg)](https://github.com/rak3rman/exploding-chickens/actions/workflows/mocha-tests.yml)
[![Codecov](https://codecov.io/gh/rak3rman/exploding-chickens/branch/main/graph/badge.svg?token=QB6J8LJ9BO)](https://codecov.io/gh/rak3rman/exploding-chickens)
![Language](https://img.shields.io/badge/Language-Node.js-informational.svg?style=flat) 
![License](https://img.shields.io/badge/License-MPL2.0-red.svg)

#### Play the game at [https://chickens.rakerman.com](https://chickens.rakerman.com)
#### Give us anonymous feedback on [Typeform](https://7ojkgwi952s.typeform.com/to/qWPf6y4Z)

A beautiful, online alternative to the popular kitty-powered version of Russian Roulette, Exploding Kittens. 
Exploding Chickens is a card game with explosions and of course, chickens — all crafted on the Node.js platform. 
The rules are simple. Each player takes turns drawing a card or playing a card, rolling the dice of luck so that they can survive for yet another turn. 
From there, the drawing deck slowly shrinks and the explosions only become more frequent. **So, who will be the last one standing?**

- **2-6 players** per game room
- Utilizes a **52-card** base deck
- **3-10 min** average game time

![Home UI](public/home_ui.png)

## Purpose
What was the reason for building a complex game like this? Learn more by reading the blog post —
[Exploding Chickens: Building a web-based game from scratch](https://rakerman.com/blog/exploding-chickens/)

## Install
As easy as 1, 2, 3..... boom.
1. Clone the repo and enter the directory: ``git clone https://github.com/rak3rman/exploding-chickens.git && cd exploding-chickens``
2. [Install a MongoDB instance](https://docs.mongodb.com/manual/installation/#mongodb-community-edition-installation-tutorials) locally or point to your own (more in usage)
3. Install packages and run: ``npm install``, ``npm run start``

## Usage
### Configuration
After the first run of exploding-chickens, a config file will be created in the config folder with path ``/config/config.json``. 
This file stores all the environment variables needed for the project, which can be edited when the instance is not running.
The config file will be populated with the following default values:
- ``"webserver_port": 3000`` Port where the webserver will accept incoming connections, of type int
- ``"mongodb_url": "mongodb://localhost:27017/exploding-chickens"`` The url of your mongodb instance (make sure to add "/exploding-chickens" at the end of the url), of type string
- ``"purge_age_hrs": 12`` How old should a game or lobby be (in hours) before it is deleted, set to -1 to disable
- ``"verbose_debug": false`` How explicit the debug output is, set to true if you want all logs to be printed to the console
- ``"discord_bot_token": ""`` Authentication token for the Discord Bot found on Discord Developer Portal, leave blank to disable feature
- ``"discord_bot_channel": ""`` What Discord channel the bot should send updates to, leave blank to disable feature

**NOTE:** Make sure to stop the instance of exploding-chickens before changing any of these values. If the file is modified while an instance is active, the changes will be overridden.

### Running the project
The npm package supports multiple ways to run the project.
- ``npm run start`` Runs the project, plain and simple.
- ``npm run dev`` Builds the project (see build cmd below), then starts the project and watches for all file changes. Restarts the instance if critical files are updated.
- ``npm run test`` Runs a test suite built using [mocha](https://mochajs.org/) and [chai assert](https://www.chaijs.com/api/assert/). Tests can be found in path ``/test`` . Code coverage reports generated using [Istanbul](https://istanbul.js.org/). Travis-CI also runs these tests.
- ``npm run build`` Builds and compresses the css package, along with any other assets. If something new doesn't look right, give this a shot.

Use ``^C`` to exit any of these instances. Currently, there are no exit commands or words.

## Contributors
- **Radison Akerman** // Creator + Coding Wizard
- **Sengdao Inthavong** // Graphics Designer
- **Vincent Do** // Game Content
- **Richard Yang** // Game Content

*Individual contributions are listed on most functions*

## Sponsorship
Your sponsorship is **incredibly important** in keeping projects like this running.
Exploding Chickens requires a surprisingly large amount of resources.
Take server hosting, network infrastructure, and external commissions, just to name a few.
We would greatly appreciate it if you could make a contribution of any size to this project. Thanks!

[https://github.com/sponsors/rak3rman](https://github.com/sponsors/rak3rman)

## License
This project (exploding-chickens) is protected by the Mozilla Public License 2.0 as disclosed in the [LICENSE](https://github.com/rak3rman/exploding-chickens/blob/main/LICENSE). Adherence to the policies and terms listed is required.
