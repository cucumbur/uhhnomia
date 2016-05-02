var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var program = require('commander');
var port = 3012
var rooms = [];
var testdeck = require('./testdeck.json');
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
  res.sendFile(__dirname + '/index.html')
});

// Production route /uhhnomia/
app.get('/uhhnomia/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
});

// Serve asset folders and main game js
app.use('/assets', express.static(__dirname + '/assets'));
app.get('/main.js', function (req, res) {
  res.sendFile(__dirname + '/main.js')
});

// Server listening
http.listen(port, function () {
  console.log('Uhhnomia server listening on ' + port);
});

// Socket.IO connection logic
io.on('connection', function(socket){
  // Log sockets upon connection and disconnection
  console.log('Sock ' + socket.id + " connected");
  socket.on('disconnect', function(){
    console.log('Sock  ' + socket.id + " disconnected");
  });

  socket.on('join room', function(joinData){
    console.log(joinData.name + " is joining room " + joinData.room);
  });

});

// Game helper functions and logic
var Room = function Room() {
  this.maxPlayers = 6;
  this.deck = testdeck;
  this.players = [];
}
