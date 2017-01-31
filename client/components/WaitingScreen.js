var React = require('react')

// Components for the Waiting room screen
var WaitingScreen = React.createClass({
  getInitialState: function () {
    var initialRoomInfo = this.props.initialRoomInfo
    return {
      roomName: initialRoomInfo.name,
      players: initialRoomInfo.players,
      deckName: initialRoomInfo.deck,
      maxPlayerCount: initialRoomInfo.maxPlayers,
      messages: []
    }
  },
  componentDidMount: function () {
    // alert(this.props.playerName)
    var wS = this
    this.props.socket.on('update room info', function (roomInfo) {
      wS.setState({ roomName: roomInfo.name, players: roomInfo.players, deckName: roomInfo.deck, maxPlayerCount: roomInfo.maxPlayers })
    })
    this.props.socket.on('start game', function (gameInfo) {
      wS.props.onStartGameSuccess(gameInfo)
    })
    this.props.socket.on('player joined room', function (playerName) {
      wS.setState({ messages: wS.state.messages.concat([playerName + ' joined the room']) })
      wS.props.socket.emit('update room info')
    })
    this.props.socket.on('player left room', function (playerName) {
      wS.setState({ messages: wS.state.messages.concat([playerName + ' left the room']) })
      wS.props.socket.emit('update room info')
    })
    this.props.socket.on('chat message', function (message) {
      wS.addChatMessage(message)
    })
  },
  componentWillUnmount: function () {
    this.props.socket.off('update room info')
    this.props.socket.off('start game')
    this.props.socket.off('player joined room')
    this.props.socket.off('player left room')
    this.props.socket.off('chat message')
  },
  addChatMessage: function (message) {
    this.setState({ messages: this.state.messages.concat([message.sentBy + ': ' + message.text]) })
  },
  handleLeaveRoom: function () {
    this.props.socket.emit('leave room')
    this.props.onLeaveRoom()
  },
  handleStartGame: function () {
    this.props.socket.emit('start game')
  },
  render: function () {
    return (
      <div className='waitingScreen'>
        <WaitingTable
          players={this.state.players}
          maxPlayerCount={this.state.maxPlayerCount}
          roomName={this.state.roomName}
          deckName={this.state.deckName}
          messages={this.state.messages}
          onChatSubmit={this.addChatMessage}
          onLeaveRoom={this.handleLeaveRoom}
          onStartGame={this.handleStartGame}
          socket={this.props.socket}
          playerName={this.props.playerName}
        />
      </div>
    )
  }
})

var WaitingTable = React.createClass({
  render: function () {
    return (
      <table className='waitingTable'>
        <tbody>
          <tr>
            <td colSpan='2' >Players (<span id='waitingRoomModal-playercount'>{this.props.players.length}</span>/<span id='waitingRoomModal-maxplayers'>{this.props.maxPlayerCount}</span>)</td>
            <td>Chat</td>
            <td>Deck: <span id='waitingRoomModal-deck'>{this.props.deckName}</span></td>
            <td>Room: <span id='waitingRoomModal-room'>{this.props.roomName}</span></td>
            <td>⚙</td>
          </tr>
          <tr id='waitingRoomModal-mainarea'>
            <td colSpan='2' className='playerListTd'>
              <PlayerList players={this.props.players} />
            </td>
            <WaitingChat messages={this.props.messages} />
          </tr>
          <tr>
            <td><input type='submit' value='Leave' onClick={this.props.onLeaveRoom} /></td>
            <td><input type='submit' value='Start' onClick={this.props.onStartGame} /></td>
            <td colSpan='4'>
              <WaitingForm onChatSubmit={this.props.onChatSubmit} socket={this.props.socket} playerName={this.props.playerName} />
            </td>
          </tr>
        </tbody>
      </table>
    )
  }
})

var PlayerList = React.createClass({
  render: function () {
    var playerNodes = this.props.players.map(function (player) {
      return (
        <li>{player}</li>
      )
    })
    return (
      <ul className='playerList'>
        {playerNodes}
      </ul>
    )
  }
})

var WaitingChat = React.createClass({
  render: function () {
    return (
      <td colSpan='4' id='waitingRoomModal-chatarea'>
        <WaitingMessages messages={this.props.messages} />
      </td>
    )
  }
})

var WaitingMessages = React.createClass({
  render: function () {
    var messageNodes = this.props.messages.map(function (message) {
      return (
        <li>{message}</li>
      )
    })
    return (
      <ul className='waitingMessages'>
        {messageNodes}
      </ul>
    )
  }
})

var WaitingForm = React.createClass({
  getInitialState: function () {
    return { messageText: '' }
  },
  handleMessageTextChange: function (e) {
    this.setState({ messageText: e.target.value })
  },
  handleSubmit: function (e) {
    let that = this
    e.preventDefault()
    var messageText = this.state.messageText // TODO: validate it?
    if (!messageText) {
      return
    }
    this.setState({ messageText: '' })
    this.props.socket.emit('chat message', messageText)
    console.log('player name is ')
    console.log(this.props.playerName)
    this.props.onChatSubmit({ sentBy: that.props.playerName, text: messageText })
  },
  render: function () {
    return (
      <form className='waitingForm' onSubmit={this.handleSubmit}>
        <input
          type='text'
          placeholder='Type here...'
          value={this.state.messageText}
          onChange={this.handleMessageTextChange}
        />
        <input type='submit' value='Send' />
      </form>
    )
  }
})

export default WaitingScreen
