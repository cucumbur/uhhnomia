var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var _ = require('lodash');

var Room = require('./lib/room.js');
var Game = require('./lib/game.js');
var Util = require('./lib/util.js')

var rooms = [];
var decks = new Object();
decks['test'] = require('./data/testdeck.json');
decks['test small'] = require('./data/testdeck_small.json');
decks['classic'] = require('./data/deck_classic.json');
var program = require('commander');
var port = 3012

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
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room].userDisconnect(socket);
      if (rooms[socket.room] && rooms[socket.room].players.length == 0) {
        delete rooms[socket.room];
      }
    }
    console.log('Sock  ' + socket.id + " disconnected");
  });

  // Playercount update for main screen
  socket.on('update playercount', ()=> socket.emit("update playercount", io.engine.clientsCount));

  // player tries to "login" and join / create a room
  socket.on('join room try', function(loginData){
    roomName = loginData.roomName;
    socket.name = loginData.userName;
    console.log(socket.name + " attempting to join " + roomName);
    if (!rooms[roomName]) {
      rooms[roomName] = new Room(roomName, 'classic');
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
      socket.left = false;
    }
    socket.leave(socket.room);
    socket.room = null;
  });


  // Make sure this isn't called redundantly a bunch by every function.
  // Only when prompted to by a single user
  socket.on('update room info', function () {
    if (rooms[socket.room].playing) {
      return;
    }
    io.in(socket.room).emit('update room info', rooms[socket.room].getInfo());
  });

  socket.on('chat message', function (message) {
    if (rooms[socket.room].playing) {
      return;
    }
    socket.broadcast.in(socket.room).emit('chat message', {text:message, sentBy:socket.name}); //FIXME: Use room code. not total broadcast
  });

  socket.on('start game', function() {
    if (rooms[socket.room].playing) {
      return;
    }

    rooms[socket.room].newGame(decks['classic'].cards);
    console.log(socket.room + " is starting a game");
    io.in(socket.room).emit('start game', rooms[socket.room].game.getInfo());
  });

  // in-Game socket events!
  socket.on('draw card', function() {
    if (!rooms[socket.room].game || rooms[socket.room].game.whoseTurn != socket || rooms[socket.room].matchup) {
      return;
    } else {
      let drawnCard = rooms[socket.room].game.drawCard();
      console.log(socket.name + " drew " + drawnCard.symbol + "  card '" + drawnCard.text + "'" );
      if (!rooms[socket.room].game.findMatchup()) {
        rooms[socket.room].game.advanceTurn();
      }
      if (!rooms[socket.room].game) {
        return;
      }
      io.in(socket.room).emit('update game info', rooms[socket.room].game.getInfo());
    }
  });

  socket.on('submit answer', function(answer) {
    if (!rooms[socket.room].playing || !rooms[socket.room].game.matchup || rooms[socket.room].game.voting){

      return;
    }


    if (_.includes(rooms[socket.room].game.matchup, socket)) {
      console.log(socket.name + " answered their matchup with " + answer);
      rooms[socket.room].game.voting = true;
      var otherPlayer;
      if (rooms[socket.room].game.matchup[0] === socket) {
        otherPlayer = rooms[socket.room].game.matchup[1];
      } else if (rooms[socket.room].game.matchup[1] === socket) {
        otherPlayer = rooms[socket.room].game.matchup[0];
      }
      var newAnswer = {playerName:socket.name, cardText: _.last(otherPlayer.cards).text, answerText: answer, type:"answer"};
      io.in(socket.room).emit('answer voting', newAnswer);
      _.delay(answerTimeout, 4000, [socket, answer]);

    }
  });


  socket.on('reject answer', function() {

    if (!rooms[socket.room] || !rooms[socket.room].playing || !rooms[socket.room].game.matchup || !rooms[socket.room].game.voting || socket.voted){
        return;
    }
    console.log(socket.name + " votes to reject");
    rooms[socket.room].game.rejectCount++;
    socket.voted = true;
  });


});

// Game helper functions
function answerTimeout(args) {
  var socket = args[0];
  var answer = args[1];
  if (rooms[socket.room].game.rejectCount >= (rooms[socket.room].game.players.length / 2)) {
    rooms[socket.room].game.rejectCount = 0;
    rooms[socket.room].game.voting = false;
    for (var player in rooms[socket.room].game.players) {
      player.voted = false;
    }
    console.log(socket.room + " rejects the answer");
    io.in(socket.room).emit('answer rejected');

    return;
  }
  rooms[socket.room].game.voting = false;
  var otherPlayer;
  if (rooms[socket.room].game.matchup[0] === socket) {
    otherPlayer = rooms[socket.room].game.matchup[1];
  } else if (rooms[socket.room].game.matchup[1] === socket) {
    otherPlayer = rooms[socket.room].game.matchup[0];
  }
  socket.cardsWon.push(otherPlayer.cards.pop());
  socket.points = socket.points + 1;
  if (!rooms[socket.room].game.findMatchup()) {
    rooms[socket.room].game.advanceTurn();
  }
  if (!rooms[socket.room].game) {
    return;
  }
  console.log(socket.room + " accepts the answer");
  // Answer to client .playerName, .cardText and .answerText
  var newAnswer = {playerName:socket.name, cardText: _.last(socket.cardsWon).text, answerText: answer};
  io.in(socket.room).emit('answer accepted', {answer:newAnswer, gameInfo:rooms[socket.room].game.getInfo()} );
}



// In-Game code

// The primary game object that represents present state





//TODO: MAKE UNIT TESTS
//TODO: when a room has zero players, delete it
//TODO: when the server is closed, send a message to all players so their client can handle it
//TODO: code for when the player disconnects but still has browser open (ie, internet cut out)
//FIXME: need to ignore socket signals from the waiting room when the game has started
