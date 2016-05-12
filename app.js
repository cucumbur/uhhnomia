var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var _ = require('lodash');


var rooms = [];
var testdeck = require('./data/testdeck.json');

var program = require('commander');
var port = 3012

// Game constants
const symbols = ["🔵", "🔶", "🔰", "❗️", "💜", "🌞", "🍀", "💋"]
const COOL = "COOL";
const HOT = 'HOT';


// CLI option handler
program
  .version('1.0.0')
  .option('-p, --port <n>', 'Set server port number', parseInt)
  .parse(process.argv);
if (program.port) {
  port = program.port;
}

// Development route /
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html')
});

// Production route /uhhnomia/
app.get('/uhhnomia/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html')
});

// Serve asset folders and main game js
app.use('/assets', express.static(__dirname + '/public/assets'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/css', express.static(__dirname + '/public/css'));

// Server listening
http.listen(port, function () {
  console.log('Uhhnomia server listening on ' + port);
});

// Socket.IO connection logic
io.on('connection', function(socket){
  // Log sockets upon connection and disconnection
  console.log('Sock ' + socket.id + " connected");
  socket.on('disconnect', function(){
    //TODO: Handle player disconnecting
    userDisconnect(socket);
    console.log('Sock  ' + socket.id + " disconnected");
  });

  // player tries to "login" and join / create a room
  socket.on('join room try', function(loginData){
    roomName = loginData.roomName;
    socket.name = loginData.userName;
    console.log(socket.name + " attempting to join " + roomName);
    if (!rooms[roomName]) {
      console.log('roomname:' + roomName);
      rooms[roomName] = new Room(roomName);
      rooms[roomName].addUser(socket);
      socket.room = roomName;
      console.log(socket.name + " created new room " + roomName);
      socket.emit('join room success', rooms[roomName].getInfo());
      socket.broadcast.in(roomName).emit('player joined room', socket.name);
      return true;
    }
    if (rooms[roomName].addUser(socket)) {
      socket.room = roomName;
      console.log(socket.name + " joined " + roomName);
      socket.emit('join room success', rooms[roomName].getInfo());
      socket.broadcast.in(roomName).emit('player joined room', socket.name);
      return true;
    }
    socket.emit('join room fail');
    return false;
  });

  // player leaves a room
  socket.on('leave room', function () {
    if (socket.room) {
      socket.left = true;
      rooms[socket.room].clearLeftPlayers();
    }
    socket.leave(socket.room);
    socket.room = null;
  });


  // Make sure this isn't called redundantly a bunch by every function.
  // Only when prompted to by a single user
  socket.on('update room info', function () {
    io.in(socket.room).emit('update room info', rooms[socket.room].getInfo());
  });

  socket.on('chat message', function (message) {
    //TODO: Handle player leaving a room, removing from roomlist, disbanding room if need be
    socket.broadcast.in(socket.room).emit('chat message', {text:message, sentBy:socket.name}); //FIXME: Use room code. not total broadcast
  });

  socket.on('start game', function() {
    io.in(socket.room).emit('game starting');
    rooms[socket.room].newGame();
  });



});

// Game helper functions
var Room = function Room(name) {
  this.name = name;
  this.maxPlayers = 2;
  this.deck = testdeck;
  this.players = [];
  this.playing = false;
};
Room.prototype = {
  addUser: function addUser(user) {
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
  },
  clearLeftPlayers: function() {
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
  },
  disband: function() {
    roomName = this.name;
    console.log(roomName + " disbanded");
    delete rooms[roomName];
  },
  newGame: function() {
    this.game = Game(this);
  },
  getInfo: function getInfo() {
    var roomPlayers = this.players.map(function(player){
      return player.name;
    });
    var info = {
      name:roomName,
      players:roomPlayers,
      deck:this.deck.name,
      maxPlayers:this.maxPlayers
    }
    return info;
  }

}

// Handles disconnects. Leaves the room if in a room
// and deals with the game if they left a game
function userDisconnect(socket) {
  if (socket.room) {
    socket.left = true;
    rooms[socket.room].clearLeftPlayers();
  }
}

// In-Game code

// The primary game object that represents present state
var Game = function Game(room) {
  // Creates a drawpile of all the cards that will be used in the game
  // based on the room's settings
  this.drawPile = createDrawPile(room);
  this.players = room.players;
  // Makes sure any left game-data from previous sessions is cleared
  for (player in this.players) {
    player.currentCard = null;
    player.points = 0;
  }

  // Randomly select a player to go first.
  this.whoseTurn = _.sample(players);
  this.drawn = false;
  this.stage = COOL;

};

var Card = function Card(text, symbol) {
  this.text = text;
  this.symbol = symbol;
}

// This function assigns the text strings to a card with a symbol
// and randomizes them, to be used in a game
function createDrawPile(room) {
  var numSymbols = room.players.length < 4 ? 6 : 8;

  var symbols = symbols.slice(0, numSymbols);
  var cardStrings = _.shuffle(room.deck.cards);
  var cards = [];

  var currentSymbol;
  var splitCardStrings = evenlySplit(cardStrings, numSymbols);
  for (symbolSet in splitCardStrings) {
    currentSymbol = symbols.pop();
    for (cardString in symbolSet) {
      cards.push(Card(cardString, currentSymbol));
    }
  }
  return cards;
}

function evenlySplit(a, n) {
    if (n < 2)
        return [a];

    var len = a.length,
            out = [],
            i = 0,
            size;

    if (len % n === 0) {
        size = Math.floor(len / n);
        while (i < len) {
            out.push(a.slice(i, i += size));
        }
    } else {
        while (i < len) {
            size = Math.ceil((len - i) / n--);
            out.push(a.slice(i, i += size));
        }
    }

    return out;
}



//TODO: when a room has zero players, delete it
//TODO: when the server is closed, send a message to all players so their client can handle it
//TODO: code for when the player disconnects but still has browser open (ie, internet cut out)
//TODO: PROFANITY FILTERS (swearjar)
//IDEA: use emoji or icons for symbols
