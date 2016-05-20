var Game = require('./game.js');
var _ = require('lodash');

module.exports = class Room {
  constructor(name, deck) {
    this.name = name;
    this.maxPlayers = 4;
    this.deck = deck;
    this.players = [];
    this.playing = false;
    this.game = null;
  }

  addUser(user) {
    if (this.players.length == this.maxPlayers) {
      console.log(user.name + "'s join unsuccessful: room " + this.name + " full");
      return false;
    }
    if (this.playing) {
      console.log(user.name + "'s join unsuccessful: room " + this.name + " is playing");
      return false;
    }
    this.players.push(user);
    // Puts the socket in the corresponding socket room
    user.join(this.name);
    return true;
  }

  clearLeftPlayers() {
    var roomName = this.name
    _.remove(this.players, function(elem) {
      if (elem.left){
        console.log(elem.name + " left room " + roomName);
        elem.broadcast.in(roomName).emit('player left room', elem.name);
        return true;
      }
      return false;
    });
    if (this.players.length == 0) {
      this.disband();
    }
  }

  disband() {
    //FIXME: doesn't do anything
    // also it needs tests
    roomName = this.name;
    console.log(roomName + " disbanded");
    //delete rooms[roomName];
  }

  newGame(deck) {
    if (this.playing) {
      return;
    }
    this.game = new Game(this, deck);
    this.playing = true;
  }

  getInfo() {
    var roomPlayers = this.players.map(function(player){
      return player.name;
    });
    var info = {
      name:roomName, //FIXME: UHHH what is roomname here?
      players:roomPlayers,
      deck:this.deck.name,
      maxPlayers:this.maxPlayers
    };
    return info;
  }

  // Handles disconnects. Leaves the room if in a room
  // and deals with the game if they left a game
  userDisconnect(socket) {
    if (socket.room) {
      socket.left = true;
      this.clearLeftPlayers();
    }
  }
}
