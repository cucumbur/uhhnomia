/* global alert */

var React = require('react')

// Components for the Splash Screen and the join box
var SplashScreen = React.createClass({
  getInitialState: function () { return {playerCount: 0} },
  componentDidMount: function () {
    this.props.socket.emit('update playercount')
    var pcUpdate = setInterval(() => this.props.socket.emit('update playercount'), 2000)
    this.setState({ pcInterval: pcUpdate })

    var onJoinRoomSuccess = this.props.onJoinRoomSuccess
    this.props.socket.on('join room success', function (roomInfo) {
      onJoinRoomSuccess(roomInfo)
    })
    this.props.socket.on('join room fail', function () {
      // TODO: give visaul feedback that join room failed here
      alert('Join room failed (it\'s probably full)')
    })
    this.props.socket.on('update playercount', (playerCount) => this.setState({ playerCount: playerCount }))
  },
  componentWillUnmount: function () {
    this.props.socket.off('join room success')
    this.props.socket.off('join room fail')
    this.props.socket.off('update playercount')
    clearInterval(this.state.pcInterval)
  },
  render: function () {
    return (
      <div className='splashScreen'>
        <img src='/assets/images/logo_large.png' id='splashLogo' />
        <JoinBox setPlayerName={this.props.setPlayerName} socket={this.props.socket} />
        <span>{this.state.playerCount} players online</span>
      </div>
    )
  }
})

var JoinBox = React.createClass({
  handleJoinSubmit: function (joinData) {
    this.props.socket.emit('join room try', joinData)
  },
  render: function () {
    return (
      <div className='joinBox'>
        <JoinForm onJoinSubmit={this.handleJoinSubmit} setPlayerName={this.props.setPlayerName} />
      </div>
    )
  }
})

var JoinForm = React.createClass({
  getInitialState: function () {
    return { userName: '', roomName: '' }
  },
  handleUserNameChange: function (e) {
    this.setState({ userName: e.target.value })
  },
  handleRoomNameChange: function (e) {
    this.setState({ roomName: e.target.value })
  },
  handleSubmit: function (e) {
    e.preventDefault()
    var userName = this.state.userName.trim()
    var roomName = this.state.roomName.trim()
    if (!userName || !roomName) {
      return
    }
    this.props.setPlayerName(userName)
    this.props.onJoinSubmit({ userName: userName, roomName: roomName })
  },
  render: function () {
    return (
      <form className='joinForm' onSubmit={this.handleSubmit}>
        <input
          type='text'
          placeholder='Name'
          value={this.state.userName}
          onChange={this.handleUserNameChange}
        />
        <input
          type='text'
          placeholder='Room'
          value={this.state.roomName}
          onChange={this.handleRoomNameChange}
        />
        <input type='submit' value='Join' />
      </form>
    )
  }
})

export default SplashScreen
