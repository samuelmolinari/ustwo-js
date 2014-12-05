/** @namespace **/
ustwo = window.ustwo || {};

/**
 * Represents a game session
 * @constructor
 */
ustwo.GameSession = function() {
  var _this = this;

  function init() {
    initBinders();
    _this.remove();
    generatePlayerId();
  }

  function generatePlayerId() {
    var playerId = _this.playerId.get();
    if(!playerId) _this.playerId.set(Meteor.uuid());
  }

  function initBinders() {
    /**
    * Build template for binders
    * @param {string} key
    * @param {boolean} useSession Choose to use persistent session or not
    * @return {object}
    */
    _this.binderMethodsTemplate = function(key, useSession) {
      return {

        dependency: useSession ? null : new Deps.Dependency(),

        /**
         * Get the binder value
         * @return {*}
         */
        get: function() {
          var value;

          if(useSession) {
            value = Session.get(key);
          } else {
            this.dependency.depend();
            value = _this[key];
          }
          return value;
        },

        /**
         * Set binder value
         * @param {*} value
         */
        set: function(value) {
          if(useSession) {
            Session.clear(key);
            Session.setPersistent(key, value);
          } else {
            _this[key] = value;
            this.dependency.changed();
          }
        },

        /**
         * Clear binder value
         */
        remove: function() {
          if(useSession) {
            Session.clear(key);
          } else {
            _this[key] = null;
          }
        }

      };
    };

    // Generate all the data binders with their getter, setter and clear methods
    // Make playerId and gameId sessions
    ustwo.GameSession.BINDERS.forEach(function(key) {
      _this[key] = _this.binderMethodsTemplate('_' + key,
                                               key === 'playerId' ||
                                               key === 'gameId');
    });

    /**
     * Get the grid binder setter, getter and clear method
     * @return {object}
     */
    _this.grid = _this.binderMethodsTemplate('_grid');

    _this.grid.set = function(value) {
      // Set the store value of the grid if trying to set a Grid, otherwise,
      // store the value
      if(value instanceof ustwo.Grid)
        _this._grid = value.store;
      else
        _this._grid = value;

      this.dependency.changed();
    };

    _this.grid.get = function() {
      this.dependency.depend();
      // Convert array to a Grid
      return new ustwo.Grid(_this._grid);
    };
  }

  init();
};

ustwo.GameSession.X = 'x';
ustwo.GameSession.O = 'o';
ustwo.GameSession.BINDERS = [ 'player'
                            , 'playerId'
                            , 'gameId',
                            , 'rival'
                            , 'isPlayerTurn'
                            , 'isPending'
                            , 'winner'
                            , 'isFirstPlayer' ];

/**
 * Remove existing game and clear binders
 */
ustwo.GameSession.prototype.remove = function() {
  Games.remove(this.gameId.get());
  this.clear();
}

/**
 * Find a game for the user to join
 */
ustwo.GameSession.prototype.find = function() {
  var _this = this;

  Meteor.subscribe('pendingGames',function() {
    var pendingGame = Games.findOne({secondPlayer: null});

    // Join the pending game if found, otherwise create a new game
    if(pendingGame) {
      _this.joinExistingGame(pendingGame);
    } else {
      _this.create();
    }
  });
};

/**
 * Join a existing pending game remotely
 * @param {Game} pendingGame a pending game
 */
ustwo.GameSession.prototype.joinExistingGame = function(pendingGame) {
  var _this = this;

  // Ask the server to join the game
  Meteor.call( 'join'
             , pendingGame._id
             , _this.playerId.get()

             , function(error, accepted) {
    // When the game is accepted, start the game session, otherwise, try to find another game
    if(accepted && !error) {
      _this.gameId.set(pendingGame._id);
      _this.start(false);
      _this.turn(pendingGame.turn);
      _this.isPending.set(false);
    } else {
      _this.find();
    }
  });
}

/**
 * Create a new game
 */
ustwo.GameSession.prototype.create = function() {
  var _this = this;

  // Pick the player that will start the game when the game begins
  var turn = ustwo.GameSession.pickRandomPlayer();

  // Create a game with an empty grid
  Games.insert({ grid: new ustwo.Grid().getStore()
                 // First player as the current user
               , firstPlayer: _this.playerId.get()
                 // Make sure the second player is null
               , secondPlayer: null
                 // Set the player that will play first
               , turn: turn },

                // When the server respond and the game was created,
                 // save the game id, start the game as the first player to join
                 // and store who's turn it is to play
                 function(err,id) {
                   if(!err && id) {
                     _this.gameId.set(id);
                     _this.start(true);
                     _this.turn(turn);
                   }
                 });
};

/**
 * Start a game session
 * @param {boolean} isFirstPlayer true when the user created the game, false if it joined the game
 */
ustwo.GameSession.prototype.start = function(isFirstPlayer) {
  var _this = this;

  // Set the players depending on when they've joined
  _this.isFirstPlayer.set(isFirstPlayer);
  _this.player.set(isFirstPlayer ? ustwo.GameSession.X : ustwo.GameSession.O);
  _this.rival.set(isFirstPlayer ? ustwo.GameSession.O : ustwo.GameSession.X);

  // Set an observer for that game to get real-time feedback when the document
  // is changed or removed
  Games.find(_this.gameId.get()).observe({
    changed: function(newDoc) {
      _this.onChange(newDoc);
    },
    removed: function(oldDoc) {
      _this.onRemove(oldDoc);
    }
  });
};

/**
 * Callback for when the document is removed
 * @param {Game} oldDoc the old game that has been removed
 */
ustwo.GameSession.prototype.onRemove = function(oldDoc) {
  var _this = this;
  if(oldDoc._id === _this.gameId.get()) {
    _this.find();
  }
};

/**
 * Callback for when the document is updated
 * @param {Game} newDoc the newer version of the game
 */
ustwo.GameSession.prototype.onChange = function(newDoc) {
  var _this = this;
  var grid = new ustwo.Grid(newDoc.grid);

  // Store the new grid, player turn and make sure the game isn't pending anymore
  // to allow the player to play. The first time the document is updated is when
  // the second player joins
  _this.grid.set(grid);
  _this.turn(newDoc.turn);
  _this.isPending.set(false);

  // Check if the grid is full or has a winner. In both cases, the winnner
  // is saved and set a time out to clear the game and start a new one
  if(grid.hasWinner() || grid.isFull()) {
    _this.winner.set(grid.winner);

    setTimeout(function() {
      _this.remove();
    }, (Math.random() * 10000) / 2)
  }
};

/**
 * Make a move on a given cell. Update the grid and pass turn to the other player
 * @param {number} row the row number
 * @param {number} column the column number
 */
ustwo.GameSession.prototype.play = function(row, column) {
  var grid = this.grid.get();
  grid.set(row, column, this.player.get());
  this.grid.set(grid);
  this.passTurn();
};

/**
 * Allow the other user to play and forbid the current user to play
 */
ustwo.GameSession.prototype.passTurn = function() {
  var rival = this.rival.get();
  this.turn(rival);
  Games.update(this.gameId.get(),
               { $set: { grid: this.grid.get().store, turn: rival } });
};

/**
 * Give turn to a given user. Will allow the current user to play or not
 * @param {string} player the player to give turn
 */
ustwo.GameSession.prototype.turn = function(player) {
  this.isPlayerTurn.set(player === this.player.get());
};

/**
 * Check if the current user can play
 * @return {boolean}
 */
ustwo.GameSession.prototype.canPlay = function() {
  return this.isPlayerTurn.get() &&
         !this.isPending.get() &&
         !this.grid.get().hasWinner();
};

/**
 * Clear all binders
 */
ustwo.GameSession.prototype.clear = function() {
  this.player.set(null);
  this.rival.set(null);
  this.isFirstPlayer.set(null);
  this.isPending.set(true);
  this.gameId.set(null);
  this.isPlayerTurn.set(null);
  this.grid.set(new ustwo.Grid().getStore());
  this.winner.set(null);
};

/**
 * Randomly pick between x and o
 * @return {string}
 */
ustwo.GameSession.pickRandomPlayer = function() {
  var shuffleIndex = Math.floor(Math.random() * 10) % 2;
  return [ustwo.GameSession.X, ustwo.GameSession.O][shuffleIndex];
};
