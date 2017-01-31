/* global Audio */

// TODO: Seperate each screen's set of components into a different file/module
// TODO: Make a modal to send message popups?
// TODO: handle disconnect to the server by showing an alert and resetting to the login screen

// Socket
var io = require('socket.io-client')
var socket = io()
var React = require('react')
// var ReactDOM = require('react-dom')

// Components
import SplashScreen from './components/SplashScreen'
import WaitingScreen from './components/WaitingScreen'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'

// Game configuration
const STATE_JOIN = 'join'
const STATE_WAITING = 'waiting'
const STATE_PLAYING = 'playing'
const STATE_GAMEOVER = 'gameover'

// Audio clips
var audioClips = {
  soundDingGood: new Audio('assets/sounds/ding-good.mp3'),
  soundDingBad: new Audio('assets/sounds/ding-bad.mp3'),
  soundMatchup: new Audio('assets/sounds/matchup.mp3')
}

// Root component that handles switching between game screens/states

var App = React.createClass({
  getInitialState: function () {
    return {
      gameState: STATE_JOIN,
      playerName: ''
    }
  },
  changeGameState: function (newGameState) {
    this.setState({ gameState: newGameState })
  },
  handleJoinRoomSuccess: function (roomInfo) {
    this.setState({ initialRoomInfo: roomInfo })
    this.changeGameState(STATE_WAITING)
  },
  handleLeaveRoom: function () {
    this.changeGameState(STATE_JOIN)
  },
  handleStartGameSuccess: function (gameInfo) {
    this.setState({ initialGameInfo: gameInfo })
    this.changeGameState(STATE_PLAYING)
  },
  handleGameOver: function (winnerInfo) {
    this.setState({ winnerInfo: winnerInfo })
    this.changeGameState(STATE_GAMEOVER)
  },
  handlePlayerNameChange: function (name) {
    this.setState({ playerName: name })
  },
  displayGameScreen: function () {
    switch (this.state.gameState) {
      case (STATE_JOIN):
        return (
          <SplashScreen
            onJoinRoomSuccess={this.handleJoinRoomSuccess}
            socket={socket}
            setPlayerName={this.handlePlayerNameChange}
          />
        )
      case (STATE_WAITING):
        return (
          <WaitingScreen
            initialRoomInfo={this.state.initialRoomInfo}
            onLeaveRoom={this.handleLeaveRoom}
            onStartGameSuccess={this.handleStartGameSuccess}
            playerName={this.state.playerName}
            socket={socket}
          />
        )
      case (STATE_PLAYING):
        return (
          <GameScreen
            initialGameInfo={this.state.initialGameInfo}
            onLeaveRoom={this.handleLeaveRoom}
            onGameOver={this.handleGameOver}
            playerName={this.state.playerName}
            audioClips={audioClips}
            socket={socket}
          />
        )
      case (STATE_GAMEOVER):
        return (
          <GameOverScreen
            winnerInfo={this.state.winnerInfo}
            onPlayAgain={this.handleJoinRoomSuccess}
            onLeaveRoom={this.handleLeaveRoom}
            socket={socket}
          />
        )
      default:
    }
  },
  render: function () {
    return (
      <div className='uhhnomia'>
        {this.displayGameScreen()}
      </div>
    )
  }
})

export default App
