//TODO: Seperate each screen's set of components into a different file/module
//TODO: Make a modal to send message popups?
//TODO: handle disconnect to the server by showing an alert and resetting to the login screen

// Socket
var io = require('socket.io-client');
var socket = io();
var React = require('react');
var ReactDOM = require('react-dom');

// Game configuration
const STATE_JOIN = "join";
const STATE_WAITING = "waiting";
const STATE_PLAYING = "playing";
const STATE_GAMEOVER = "gameover";
var globalPlayerName = '';

// Audio clips
var sound_dingGood = new Audio("assets/sounds/ding-good.mp3");
var sound_dingBad = new Audio("assets/sounds/ding-bad.mp3");
var sound_matchup = new Audio("assets/sounds/matchup.mp3");

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
  handleGameOver: function(winnerInfo) {
    this.setState({winnerInfo:winnerInfo});
    this.changeGameState(STATE_GAMEOVER);
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
            onGameOver={this.handleGameOver}
          />
        );
        break;
      case (STATE_GAMEOVER):
        return (
          <GameOverScreen
            winnerInfo={this.state.winnerInfo}
            onPlayAgain={this.handleJoinRoomSuccess}
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
  getInitialState: function () {return {playerCount: 0};},
  componentDidMount: function () {
    socket.emit('update playercount');
    var pcUpdate = setInterval(() => socket.emit('update playercount'), 2000);
    this.setState({pcInterval:pcUpdate});

    var onJoinRoomSuccess = this.props.onJoinRoomSuccess;
    socket.on('join room success', function (roomInfo) {
      onJoinRoomSuccess(roomInfo);
    });
    socket.on('join room fail', function () {
      // TODO: give visaul feedback that join room failed here
      alert("Join room failed (it's probably full)");
    });
    socket.on('update playercount', (playerCount) => this.setState({playerCount:playerCount}));

  },
  componentWillUnmount: function() {
    socket.off('join room success');
    socket.off('join room fail');
    socket.off('update playercount');
    clearInterval(this.state.pcInterval);
  },
  render: function() {
    return (
      <div className="splashScreen">
        <img  src="/assets/images/logo_large.png" id="splashLogo" />
        <JoinBox />
        <span>{this.state.playerCount} players online</span>
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
            <td colSpan="4">
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
      <td colSpan="4" id="waitingRoomModal-chatarea">
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
    var sortedPlayers = this.sortPlayers(initialGameInfo.players);
    return {roomName:initialGameInfo.name,
            players:sortedPlayers,
            whoseTurn:initialGameInfo.whoseTurn,
            matchup:null,
            cardsLeft:initialGameInfo.cardsLeft,
            lastMatchup:null,
            audioMatchup:null,
            answers:[],
            voting:false
          };
  },
  componentDidMount: function () {
    console.log("mounted");
    var gS = this;

    socket.on('update game info', function(gameInfo) {
      console.log('SR update game info');
      if (gameInfo.matchup && (gameInfo.lastMatchup != gS.state.audioMatchup)) {
        gS.setState({audioMatchup:gameInfo.lastMatchup});
        sound_matchup.play();
      }
      console.log("update game info setting state");
      var sortedPlayers = gS.sortPlayers(gameInfo.players);
      gS.setState({players:sortedPlayers, whoseTurn:gameInfo.whoseTurn, matchup:gameInfo.matchup, lastMatchup:gameInfo.lastMatchup, cardsLeft:gameInfo.cardsLeft});

    });

    socket.on('answer voting', function(answer) {
      console.log(answer);
      console.log('SR answer voting');
      var answer2 = {type:"rejected"};
      var newAnswerList = gS.state.answers.concat([answer]);
      gS.setState({answers:newAnswerList, voting:true});
    });

    socket.on('answer rejected', function() {
      console.log('SR answer rejected');
      var answer = {type:"rejected"};
      var newAnswerList = gS.state.answers.concat([answer]);
      gS.setState({answers:newAnswerList, voting:false});
    });


    socket.on('answer accepted', function(aG) {
      console.log("SR answer accepted");
      let answer = aG.answer;
      answer.type = "accepted";
      let gameInfo = aG.gameInfo;
      if (gameInfo.matchup && (gameInfo.lastMatchup != gS.state.audioMatchup)) {
        gS.setState({audioMatchup:gameInfo.lastMatchup});
        sound_matchup.play();
      }
      var newAnswerList = gS.state.answers.concat([answer]);
      var sortedPlayers = gS.sortPlayers(gameInfo.players);
      gS.setState({players:sortedPlayers, whoseTurn:gameInfo.whoseTurn, matchup:gameInfo.matchup, lastMatchup:gameInfo.lastMatchup, cardsLeft:gameInfo.cardsLeft, answers:newAnswerList, voting:false});
    });

    socket.on('game over', function(winner) {
      //setTimeout( function() {gS.props.onGameOver(winner);}, 2000 );
      gS.props.onGameOver(winner);
    });

  },
  componentWillUnmount: function() {
    socket.off('update game info');
    socket.off('answer voting');
    socket.off('answer rejected');
    socket.off('matchup answer');
    socket.off('game over');
  },
  sortPlayers: function(playerList) {
    if (playerList.length == 1) {
      return playerList;
    }
    var sortedPlayers = [];

    var curPlayerIndex = playerList.findIndex(function(player){ return player.name == globalPlayerName; });
    sortedPlayers.push(playerList[curPlayerIndex]);

    playerList.splice(curPlayerIndex, 1);
    sortedPlayers = sortedPlayers.concat(playerList.sort());
    console.log("==== sortedPlayers ===");
    console.log(sortedPlayers);
    return sortedPlayers;
  },
  handleDrawCard: function () {
    if (! this.isMyTurn() ){
      return;
    }
    socket.emit('draw card');
  },
  handleAnswerSubmit: function(answer) {
    socket.emit('submit answer', answer);
  },
  handleReject: function() {
    socket.emit('reject answer');
  },
  isMyTurn: function() {
    return (this.state.whoseTurn == globalPlayerName);
  },
  render: function() {
    console.log("gamescreen rerender");
    return (
      <div className="gameScreen">
        <GameGrid
          roomName={this.state.roomName}
          sortedPlayers={this.state.players}
          onDrawCard={this.handleDrawCard}
          myTurn={this.isMyTurn()}
          matchup={this.state.matchup}
          cardsLeft={this.state.cardsLeft}
          onAnswerSubmit={this.handleAnswerSubmit}
          answers={this.state.answers}
          voting={this.state.voting}
          onReject={this.handleReject}
        />
      </div>
    );
  }
});

var GameGrid = React.createClass({
  getInitialState: function() {
    return {answer:''};
  },
  getMatchupToGuess: function() {
    var opponentName = null;
    if (this.props.matchup && (this.props.matchup[0] == globalPlayerName) ) {
      opponentName = this.props.matchup[1];
    } else if (this.props.matchup && (this.props.matchup[1] == globalPlayerName) ) {
      opponentName = this.props.matchup[0];
    }
    if (!opponentName) {
      return null;
    }
    var cText = this.props.sortedPlayers.find(function(p) {return p.name === opponentName;}).topCard.text;
    return cText;
  },
  handleAnswerChange: function (e) {
    this.setState({answer:e.target.value});
  },
  handleAnswerSubmit: function(e) {
    e.preventDefault();
    this.setState({answer:""});
    var answer = this.state.answer;
    if (!answer || !this.isMatched(0)) {
      return;
    }
    sound_dingGood.play();
    this.props.onAnswerSubmit(answer);
  },
  isMatched: function(i) {
    if (this.props.sortedPlayers.length <= i) {
      return false;
    }
    return this.props.matchup && (this.props.matchup[0] == this.props.sortedPlayers[i].name || this.props.matchup[1] == this.props.sortedPlayers[i].name);
  },
  render: function() {
    console.log(this.props.sortedPlayers);
    return (
      <div className="gameGrid">
          <div className="pure-g">
            <div className="pure-u-1-3">Uhhnomia</div>
            <div className="pure-u-1-6">Name: {globalPlayerName}</div>
            <div className="pure-u-1-6">Room: {this.props.roomName}</div>
            <div className="pure-u-1-6">Cards Won: {this.props.sortedPlayers[0].points}</div>
            <div className="pure-u-1-6">Cards Left: {this.props.cardsLeft}</div>
          </div>
          <div className="pure-g">
            <div className="pure-u-1-3">
              {this.props.sortedPlayers.length > 1 ? this.props.sortedPlayers[1].name + "  " + this.props.sortedPlayers[1].points : ""}
              <GameCard
                text={this.props.sortedPlayers.length > 1 && this.props.sortedPlayers[1].topCard ? this.props.sortedPlayers[1].topCard.text : ""}
                symbol={this.props.sortedPlayers.length > 1 && this.props.sortedPlayers[1].topCard ? this.props.sortedPlayers[1].topCard.symbol : ""}
                matched={this.isMatched(1)}
              />
            </div>
            <div className="pure-u-1-3">
              {this.props.sortedPlayers.length > 2 ? this.props.sortedPlayers[2].name + "  " + this.props.sortedPlayers[2].points  : ""}
              <GameCard
                text={this.props.sortedPlayers.length > 2 && this.props.sortedPlayers[2].topCard ? this.props.sortedPlayers[2].topCard.text : ""}
                symbol={this.props.sortedPlayers.length > 2 && this.props.sortedPlayers[2].topCard ? this.props.sortedPlayers[2].topCard.symbol : ""}
                matched={this.isMatched(2)}
              />
            </div>
            <div className="pure-u-1-3">
              {this.props.sortedPlayers.length > 3 ? this.props.sortedPlayers[3].name + "  " + this.props.sortedPlayers[3].points  : ""}
              <GameCard
                text={this.props.sortedPlayers.length > 3 && this.props.sortedPlayers[3].topCard ? this.props.sortedPlayers[3].topCard.text : ""}
                symbol={this.props.sortedPlayers.length > 3 && this.props.sortedPlayers[3].topCard ? this.props.sortedPlayers[3].topCard.symbol : ""}
                matched={this.isMatched(3)}
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
                matched={this.isMatched(0)}
              />
            </div>
            <div className="pure-u-1-3">Wildcard</div>
          </div>
          <div className="pure-g">
            <div className="pure-u-1-3">Answers
              <div className="answersContainer"><GameAnswers answers={this.props.answers} /></div>
            </div>
            <div className="pure-u-1-3">
              <form className="pure-form" onSubmit={this.handleAnswerSubmit}>
                <input
                  type="text"
                  placeholder="Blurt your answer!"
                  value={this.state.answer}
                  onChange={this.handleAnswerChange}
                />
              <input className="pure-button" type="submit" value="Send" />
              </form><br />
            {this.getMatchupToGuess() ? this.getMatchupToGuess() : ""}
            </div>
            <div className="pure-u-1-3">
              <button className={this.props.myTurn && !this.props.matchup ? "pure-button" : "pure-button pure-button-disabled"} onClick={this.props.onDrawCard}>Draw</button><br/>
              <button className={this.props.voting ? "pure-button" : "pure-button pure-button-disabled"} onClick={this.props.onReject}>Reject</button><br/>
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

var GameAnswers = React.createClass({
  render: function() {
    var answerNodes = this.props.answers.map(function(answer) {
      if (answer.type == "answer") {
        return (
          <li>{answer.playerName} answered {answer.cardText} with {answer.answerText}</li>
        );
      } else if (answer.type == "accepted") {
          return (
            <li>{answer.playerName}s answer was accepted</li>
          );
      } else if (answer.type == "rejected") {
          return (
            <li>Answer rejected.</li>
          );
      }
    });
    return (
        <ul className="gameAnswers">
          {answerNodes}
        </ul>
    );
  }
});


// Component for GameOver screen

var GameOverScreen = React.createClass({
  getInitialState: function() {
    return {playAgain:false};
  },
  componentDidMount: function () {
    var gOS = this;
    socket.on('update room info', function(roomInfo) {
      if (!gOS.playAgain) {
        return;
      }
      gOS.props.onPlayAgain(roomInfo);
    });
  },
  componentWillUnmount: function() {
    socket.off('update room info');
  },
  leaveRoom: function() {
    socket.emit('leave room');
    this.props.onLeaveRoom();
  },
  playAgain: function() {
    this.state.playAgain = true;
    socket.emit('update room info');
  },
  render: function () {
    return (
      <div className="gameOverScreen">
        {this.props.winnerInfo.name + " won the game with " + this.props.winnerInfo.points + " cards!"}
        <button className="pure-button" onClick={this.playAgain}>Play Again</button>
        <button className="pure-button" onClick={this.leaveRoom}>Leave Room</button>
      </div>
    );
  }
});


ReactDOM.render(
  <Uhhnomia />,
  document.getElementById('container')
);
