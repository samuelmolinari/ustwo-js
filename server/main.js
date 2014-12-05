Meteor.startup(function () {
  Future = Npm.require('fibers/future');

  Meteor.publish('game', function(args) {
    return Games.find({ _id: args.id });
  });

  Meteor.publish('pendingGames', function() {
    return Games.find({});
  });

  Meteor.methods({
    join: function(gameId, playerId) {
      var future = new Future();

      // Make sure the game to join does not already have a second player
      Games.update({ $and: [{_id: gameId}, {secondPlayer: null}] },
                   { $set: { secondPlayer: playerId } },
                   function(err, n) {

        if(!err && n > 0) {
          future['return'](true);
        } else {
          future['return'](false)
        }

      });

      return future.wait();
    }
  });

});
