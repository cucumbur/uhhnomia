var _ = require('lodash');
var Util = require('./util.js')
var Constant = require('./constant.js')
var Card = require('./card.js')

module.exports = class Game {
  constructor(room, deck) {
    // Creates a drawpile of all the cards that will be used in the game
    // based on the room's settings
    this.name = room.name;
    // Possible states
    // DRAWING: The game is in session, there are no matchups or voting, and people are going back and forth drawing cards
    // ANSWERING: Two players have cards that are matched up. They have not answered yet, and no one has voted yet.
    // VOTING: A matchup is present on the table, and some one has submitted an answer. There is a short wait while players vote

    this.state = "DRAWING";
    this.deck = deck;
    this.deckSize = 96;
    this.players = room.players;

    // Makes sure any left game-data from previous sessions is cleared
    for (var i = 0; i<this.players.length; i++) {
      this.players[i].cards = new Array();
      this.players[i].cardsWon = new Array();
      this.players[i].points = 0;
      this.players[i].voted = false;
    }

    // Randomly select a player to go first.
    this.whoseTurn = _.sample(this.players);
    this.drawn = false;
    this.matchup = null;
    this.drawPile = this.createDrawPile();
    this.voting = false;
    this.rejectCount = 0;

  }

  // Faux-state helper functions
  hasMatchup() {
    return (this.state === "ANSWERING" || this.state === "VOTING");
  }

  getInfo() {
    var gamePlayers = this.players.map(function(player){
      return {name:player.name, points:player.points, topCard:_.last(player.cards)};
    });
    var gameMatchup = null;
    var lastMatchupText = null;
    if (this.matchup) {
      gameMatchup = _.map(this.matchup, _.property('name')).sort();
      lastMatchupText = _.last(this.matchup[0].cards).text + _.last(this.matchup[1].cards).text;
    }
    var info = {
      name:this.name,
      players:gamePlayers,
      whoseTurn:this.whoseTurn.name,
      matchup:gameMatchup,
      lastMatchup:lastMatchupText,
      cardsLeft:this.drawPile.length
    };
    return info;
  }

  drawCard() {
    this.whoseTurn.cards.push(this.drawPile.pop());
    this.drawn = true;
    return _.last(this.whoseTurn.cards);
  }

  findMatchup(updateGame=true) {
    for (var player1idx in this.players) {
      for (var player2idx in this.players) {
        if (player1idx != player2idx) {
          var player1 = this.players[player1idx], player2 = this.players[player2idx];
          if ( (!_.isEmpty(player1.cards) && !_.isEmpty(player2.cards)) && (_.last(player1.cards).symbol == _.last(player2.cards).symbol) ) {
            if (!updateGame) {
              return true;
            }
            this.matchup = [player1, player2];
            console.log("Matchup in room " + this.name);
            return true;
          }
        }
      }
    }
    this.matchup = null;
    return false;
  }

  advanceTurn() {
    // var sortedPlayers = _.map(this.players, _.property('name')).sort();
    // var idx = _.findIndex(sortedPlayers, function(n) { return n == this.whoseTurn.name; });
    // if ((idx + 1) == sortedPlayers.length) {
    // }
    if (this.checkGameOver()){
      return;
    }
    var g = this;
    var idx = _.findIndex(this.players, function(n) { return n.name === g.whoseTurn.name; });
    if ((idx + 1) == this.players.length) {
      idx = 0;
    } else {
      idx = idx + 1;
    }
    this.whoseTurn = this.players[idx];
    this.drawn = false;
  }

  checkGameOver() {
    if (this.matchup || this.drawPile.length > 0){
      return false;
    }
    let winner = _.reduce(this.players, function(highest, player) {return highest.points >= player.points ? highest : {name:player.name, points:player.points};}, this.players[0]);
    console.log("Room " + this.name + " finished their game. " + winner.name + " won with " + winner.points + " points");
    rooms[this.name].playing = false;
    rooms[this.name].game = null;
    io.in(this.name).emit('game over', {name:winner.name, points:winner.points});
    return true;
  }

  // This function assigns the text strings to a card with a symbol
  // and randomizes them, to be used in a game
  createDrawPile() {
    var numSymbols = this.players.length < 4 ? 6 : 8;

    var symbols = Constant.SYMBOLS.slice(0, numSymbols);

    var cardStrings = _.shuffle(this.deck).slice(0, this.deckSize > this.deck.length ? this.deck.length : this.deckSize);

    var cards = [];

    var currentSymbol;
    var splitCardStrings = Util.evenlySplit(cardStrings, numSymbols);

    var symbolSet;
    for (symbolSet in splitCardStrings) {
      currentSymbol = symbols.pop();
      for (var cardString in splitCardStrings[symbolSet]) {
        cards.push(new Card(splitCardStrings[symbolSet][cardString], currentSymbol));
      }
    }

    return _.shuffle(cards);
  }
}
