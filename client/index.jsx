//TODO: Seperate each screen's set of components into a different file/module
//TODO: send initial roominfo to waitingscreen so theres no placeholders
//TODO: Make a modal to send message popups?
//TODO: Make playername a variable with global scope, not a component prop ( or use context)
//TODO: handle disconnect to the server by showing an alert and resetting to the login screen
// Socket
var socket = io();

// Game configuration
const STATE_JOIN = "join";
const STATE_WAITING = "waiting";
const STATE_PLAYING = "playing";
var globalPlayerName = '';

// Root component that handles switching between game screens/states

var Uhhnomia = React.createClass({
  getInitialState: function() {
    return {gameState:STATE_JOIN};
  },
  changeGameState: function (newGameState) {
    this.setState({gameState:newGameState});
  },
  handleJoinRoomSuccess: function(roomInfo) {
    this.setState({initialRoomInfo:roomInfo});
    this.changeGameState(STATE_WAITING);
  },
  handleLeaveRoom: function() {
    this.changeGameState(STATE_JOIN);
  },
  handleStartGameSuccess: function(gameInfo) {
    this.setState({initialGameInfo:gameInfo});
    this.changeGameState(STATE_PLAYING);
  },
  displayGameScreen: function () {
    switch (this.state.gameState) {
      case (STATE_JOIN):
        return (
          <SplashScreen
            onJoinRoomSuccess={this.handleJoinRoomSuccess}
          />
        );
        break;
      case (STATE_WAITING):
        return (
          <WaitingScreen
            initialRoomInfo={this.state.initialRoomInfo}
            onLeaveRoom={this.handleLeaveRoom}
            onStartGameSuccess={this.handleStartGameSuccess}
          />
        );
        break;
      case (STATE_PLAYING):
        return (
          <GameScreen
            initialGameInfo={this.state.initialGameInfo}
            onLeaveRoom={this.handleLeaveRoom}
          />
        );
        break;
      default:
    }
  },
  render: function() {
    return (
      <div className="uhhnomia">
        {this.displayGameScreen()}
      </div>
    );
  }
});


// Components for the Splash Screen and the join box

var SplashScreen = React.createClass({
  componentDidMount: function () {
    var onJoinRoomSuccess = this.props.onJoinRoomSuccess;
    socket.on('join room success', function (roomInfo) {
      onJoinRoomSuccess(roomInfo);
    });
    socket.on('join room fail', function () {
      // TODO: give visaul feedback that join room failed here
      alert("Join room failed (it's probably full)");
    });
  },
  componentWillUnmount: function() {
    socket.off('join room success');
    socket.off('join room fail');
  },
  render: function() {
    return (
      <div className="splashScreen">
        <img  src="/assets/images/logo_large.png" id="splashLogo" />
        <JoinBox />
      </div>
    );
  }
});

var JoinBox = React.createClass({
  handleJoinSubmit: function(joinData) {
    socket.emit('join room try', joinData);
  },
  render: function() {
    return (
      <div className="joinBox">
        <JoinForm onJoinSubmit={this.handleJoinSubmit}/>
      </div>
    );
  }
});

var JoinForm = React.createClass({
  getInitialState: function() {
    return {userName: '', roomName:''};
  },
  handleUserNameChange: function (e) {
    this.setState({userName:e.target.value});
  },
  handleRoomNameChange: function (e) {
    this.setState({roomName:e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var userName = this.state.userName.trim();
    var roomName = this.state.roomName.trim();
    if (!userName || !roomName) {
      return;
    }
    globalPlayerName = userName;
    this.props.onJoinSubmit({userName: userName, roomName: roomName});
  },
  render: function() {
    return (
      <form className="joinForm" onSubmit={this.handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={this.state.userName}
          onChange={this.handleUserNameChange}
        />
        <input
          type="text"
          placeholder="Room"
          value={this.state.roomName}
          onChange={this.handleRoomNameChange}
        />
        <input type="submit" value="Join" />
      </form>
    );
  }
});


// Components for the Waiting room screen

var WaitingScreen = React.createClass({
  getInitialState: function() {
    var initialRoomInfo = this.props.initialRoomInfo;
    return {roomName:initialRoomInfo.name,
            players:initialRoomInfo.players,
            deckName:initialRoomInfo.deck,
            maxPlayerCount: initialRoomInfo.maxPlayers,
            messages:[]
          };
  },
  componentDidMount: function () {
    var wS = this;
    socket.on('update room info', function(roomInfo) {
      wS.setState({roomName:roomInfo.name, players:roomInfo.players, deckName:roomInfo.deck, maxPlayerCount: roomInfo.maxPlayers});
    });
    socket.on('start game', function(gameInfo) {
      wS.props.onStartGameSuccess(gameInfo);
    });
    socket.on('player joined room', function(playerName) {
      wS.setState({messages:wS.state.messages.concat([playerName + " joined the room"])});
      socket.emit('update room info');
    });
    socket.on('player left room', function(playerName) {
      wS.setState({messages:wS.state.messages.concat([playerName + " left the room"])});
      socket.emit('update room info');
    });
    socket.on('chat message', function(message) {
      wS.addChatMessage(message);
    });
  },
  componentWillUnmount: function() {
    socket.off('update room info');
    socket.off('start game');
    socket.off('player joined room');
    socket.off('player left room');
    socket.off('chat message');
  },
  addChatMessage: function(message) {
    this.setState({messages:this.state.messages.concat([message.sentBy + ": " + message.text])});
  },
  handleLeaveRoom: function() {
    socket.emit('leave room');
    this.props.onLeaveRoom();
  },
  handleStartGame: function() {
    socket.emit('start game');
  },
  render: function() {
    return (
      <div className="waitingScreen">
        <WaitingTable
          players={this.state.players}
          maxPlayerCount={this.state.maxPlayerCount}
          roomName={this.state.roomName}
          deckName={this.state.deckName}
          messages={this.state.messages}
          onChatSubmit={this.addChatMessage}
          onLeaveRoom={this.handleLeaveRoom}
          onStartGame={this.handleStartGame}
        />
      </div>
    );
  }
});

var WaitingTable = React.createClass({
  render: function() {
    return (
      <table className="waitingTable">
        <tbody>
          <tr>
            <td colSpan="2" >Players (<span id="waitingRoomModal-playercount">{this.props.players.length}</span>/<span id="waitingRoomModal-maxplayers">{this.props.maxPlayerCount}</span>)</td>
            <td>Chat</td>
            <td>Deck: <span id="waitingRoomModal-deck">{this.props.deckName}</span></td>
            <td>Room: <span id="waitingRoomModal-room">{this.props.roomName}</span></td>
            <td>⚙</td>
          </tr>
          <tr id="waitingRoomModal-mainarea">
            <td colSpan="2" className="playerListTd">
              <PlayerList players={this.props.players}/>
            </td>
            <WaitingChat messages={this.props.messages} />
          </tr>
          <tr>
            <td><input type="submit" value="Leave" onClick={this.props.onLeaveRoom} /></td>
            <td><input type="submit" value="Start" onClick={this.props.onStartGame} /></td>
            <td colspan="4">
              <WaitingForm onChatSubmit={this.props.onChatSubmit}/>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
});

var PlayerList = React.createClass({
  render: function() {
    var playerNodes = this.props.players.map(function(player) {
      return (
        <li>{player}</li>
      );
    });
    return (
        <ul className="playerList">
          {playerNodes}
        </ul>
    );
  }
});

var WaitingChat = React.createClass({
  render: function() {
    return (
      <td colspan="4" id="waitingRoomModal-chatarea">
        <WaitingMessages messages={this.props.messages} />
      </td>
    );
  }
});

var WaitingMessages = React.createClass({
  render: function() {
    var messageNodes = this.props.messages.map(function(message) {
      return (
        <li>{message}</li>
      );
    });
    return (
        <ul className="waitingMessages">
          {messageNodes}
        </ul>
    );
  }
});

var WaitingForm = React.createClass({
  getInitialState: function() {
    return {messageText:''};
  },
  handleMessageTextChange: function(e) {
    this.setState({messageText:e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var messageText = this.state.messageText; // TODO: validate it?
    if (!messageText) {
      return;
    }
    this.setState({messageText:""});
    socket.emit('chat message', messageText);
    this.props.onChatSubmit({sentBy:globalPlayerName, text:messageText});
  },
  render: function() {
    return (
      <form className="waitingForm" onSubmit={this.handleSubmit}>
        <input
          type="text"
          placeholder="Type here..."
          value={this.state.messageText}
          onChange={this.handleMessageTextChange}
        />
        <input type="submit" value="Send" />
      </form>
    );
  }
});

// Components for game screen

var GameScreen = React.createClass({
  getInitialState: function() {
    var initialGameInfo = this.props.initialGameInfo;
    return {roomName:initialGameInfo.name,
            players:initialGameInfo.players,
            whoseTurn:initialGameInfo.whoseTurn,
            matchup:null
          };
  },
  componentDidMount: function () {
    var gS = this;
    socket.on('update game info', function(gameInfo) {
      gS.setState({players:gameInfo.players, whoseTurn:gameInfo.whoseTurn, matchup:gameInfo.matchup});
    });
  },
  componentWillUnmount: function() {
    socket.off('update game info');
  },
  getSortedPlayers: function() {
    var playerList = this.state.players;
    if (playerList.length == 1) {
      return playerList;
    }
    var sortedPlayers = [];

    var curPlayerIndex = playerList.findIndex(function(player){ return player.name == globalPlayerName; });
    sortedPlayers.push(playerList[curPlayerIndex]);

    playerList.splice(curPlayerIndex, 1);
    sortedPlayers = sortedPlayers.concat(playerList.sort());
    return sortedPlayers;
  },
  handleDrawCard: function () {
    if (! this.isMyTurn() ){
      return;
    }
    socket.emit('draw card');
  },
  isMyTurn: function() {
    return this.state.whoseTurn == globalPlayerName;
  },
  render: function() {
    return (
      <div className="gameScreen">
        <GameGrid
          roomName={this.state.roomName}
          sortedPlayers={this.getSortedPlayers()}
          onDrawCard={this.handleDrawCard}
          myTurn={this.isMyTurn()}
          matchup={this.state.matchup}
        />
      </div>
    );
  }
});

var GameGrid = React.createClass({
  getMatchupToGuess: function() {
    var opponentName = null;
    if (this.props.matchup && (this.props.matchup[0] == globalPlayerName) ) {
      opponentName = this.props.matchup[1]
    } else if (this.props.matchup && (this.props.matchup[1] == globalPlayerName) ) {
      opponentName = this.props.matchup[0]
    }
    if (!opponentName) {
      return null;
    }
    return this.props.sortedPlayers.find(function(p) {return p.name === opponentName;}).topCard.text;
  },
  render: function() {
    return (
      <div className="gameGrid">
          <div className="pure-g">
            <div className="pure-u-1-3">Uhhnomia</div>
            <div className="pure-u-1-6">Name: {globalPlayerName}</div>
            <div className="pure-u-1-6">Room: {this.props.roomName}</div>
            <div className="pure-u-1-6">Cards Won: 0</div>
            <div className="pure-u-1-6">Cards Left: 42</div>
          </div>
          <div className="pure-g">
            <div className="pure-u-1-3">
              {this.props.sortedPlayers.length > 1 ? this.props.sortedPlayers[1].name : ""}
              <GameCard
                text={this.props.sortedPlayers.length > 1 && this.props.sortedPlayers[1].topCard ? this.props.sortedPlayers[1].topCard.text : ""}
                symbol={this.props.sortedPlayers.length > 1 && this.props.sortedPlayers[1].topCard ? this.props.sortedPlayers[1].topCard.symbol : ""}
                matched={this.props.matchup && this.props.sortedPlayers.length > 1 && (this.props.matchup[0] == this.props.sortedPlayers[1].name || this.props.matchup[1] == this.props.sortedPlayers[1].name)}
              />
            </div>
            <div className="pure-u-1-3">
              {this.props.sortedPlayers.length > 2 ? this.props.sortedPlayers[2].name : ""}
              <GameCard
                text={this.props.sortedPlayers.length > 2 && this.props.sortedPlayers[2].topCard ? this.props.sortedPlayers[2].topCard.text : ""}
                symbol={this.props.sortedPlayers.length > 2 && this.props.sortedPlayers[2].topCard ? this.props.sortedPlayers[2].topCard.symbol : ""}
                matched={this.props.matchup && this.props.sortedPlayers.length > 2 && (this.props.matchup[0] == this.props.sortedPlayers[2].name || this.props.matchup[1] == this.props.sortedPlayers[2].name)}
              />
            </div>
            <div className="pure-u-1-3">
              {this.props.sortedPlayers.length > 3 ? this.props.sortedPlayers[3].name : ""}
              <GameCard
                text={this.props.sortedPlayers.length > 3 && this.props.sortedPlayers[3].topCard ? this.props.sortedPlayers[3].topCard.text : ""}
                symbol={this.props.sortedPlayers.length > 3 && this.props.sortedPlayers[3].topCard ? this.props.sortedPlayers[3].topCard.symbol : ""}
                matched={this.props.matchup && this.props.sortedPlayers.length > 3 && (this.props.matchup[0] == this.props.sortedPlayers[3].name || this.props.matchup[1] == this.props.sortedPlayers[3].name)}
              />
            </div>
          </div>
          <div className="pure-g">
            <div className="pure-u-1-3">Drawpile</div>
            <div className="pure-u-1-3">
              Your Card
              <GameCard
                text={this.props.sortedPlayers[0].topCard ? this.props.sortedPlayers[0].topCard.text : ""}
                symbol={this.props.sortedPlayers[0].topCard ? this.props.sortedPlayers[0].topCard.symbol : ""}
                matched={this.props.matchup && (this.props.matchup[0] == this.props.sortedPlayers[0].name || this.props.matchup[1] == this.props.sortedPlayers[0].name) }
              />
            </div>
            <div className="pure-u-1-3">Wildcard</div>
          </div>
          <div className="pure-g">
            <div className="pure-u-1-3">Chat Window</div>
            <div className="pure-u-1-3">
              <form className="pure-form">
                <input
                  type="text"
                  placeholder="Blurt your answer!"
                />
              <input className="pure-button" type="submit" value="Send" />
              </form><br />
            {this.getMatchupToGuess() ? this.getMatchupToGuess() : ""}
            </div>
            <div className="pure-u-1-3">
              <button className={this.props.myTurn && !this.props.matchup ? "pure-button" : "pure-button pure-button-disabled"} onClick={this.props.onDrawCard}>Draw</button><br/>
              <button className="pure-button pure-button-disabled">Approve</button><br/>
              <button className="pure-button pure-button-disabled">Reject</button>
            </div>
          </div>
      </div>
    );
  }
});

var GameCard = React.createClass({
  render: function() {
    return (
      <div className={this.props.matched ? "gameCard-match" : "gameCard"}>
        {this.props.text ? this.props.text : ""}
        <div className="symbol symbol-topLeft">{this.props.symbol ? this.props.symbol : ""}</div>
        <div className="symbol symbol-topRight">{this.props.symbol ? this.props.symbol : ""}</div>
        <div className="symbol symbol-bottomLeft">{this.props.symbol ? this.props.symbol : ""}</div>
        <div className="symbol symbol-bottomRight">{this.props.symbol ? this.props.symbol : ""}</div>
      </div>
    );
  }
});

ReactDOM.render(
  <Uhhnomia />,
  document.getElementById('container')
);
