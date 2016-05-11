//TODO: Seperate each screen's set of components into a different file/module
//TODO: send initial roominfo to waitingscreen so theres no placeholders
//TODO: Make a modal to send message popups?
//TODO: Make playername a variable with global scope, not a component prop ( or use context)
// Socket
var socket = io();

// Game configuration
const STATE_JOIN = "join";
const STATE_WAITING = "waiting";
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
    socket.off('player joined room');
    socket.off('chat message');
  },
  addChatMessage: function(message) {
    this.setState({messages:this.state.messages.concat([message.sentBy + ": " + message.text])});
  },
  handleLeaveRoom: function() {
    socket.emit('leave room');
    this.props.onLeaveRoom();
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
            <td><input type="submit" value="Start" /></td>
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


ReactDOM.render(
  <Uhhnomia />,
  document.getElementById('container')
);
