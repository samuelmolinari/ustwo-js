ustwo = window.ustwo || {};

var gameSession = null;
gameSession = new ustwo.GameSession();

Meteor.startup(function() {
  gameSession.find();
});

Template.body.helpers({
  player: function() {
    return gameSession.player.get();
  },
  rival: function() {
    return gameSession.rival.get();
  },
  isPlayerTurn: function() {
    return gameSession.isPlayerTurn.get();
  },
  isPending: function() {
    return gameSession.isPending.get();
  },
  grid: function() {
    return gameSession.grid.get().toTemplateObject();
  },
  winner: function() {
    return gameSession.winner.get();
  }
});

Template.body.events({
  'click .board-cell:not([data-player])': function(event) {
    if(gameSession.canPlay()) {
      var coordinates = {
        row: parseInt(event.target.parentNode.getAttribute('data-row')),
        column: parseInt(event.target.getAttribute('data-column'))
      };
      gameSession.play(coordinates.row, coordinates.column);
    }
  }
});
