var React = require('react')

// Component for GameOver screen
var GameOverScreen = React.createClass({
  getInitialState: function () {
    return { playAgain: false }
  },
  componentDidMount: function () {
    var gOS = this
    this.props.socket.on('update room info', function (roomInfo) {
      if (!gOS.playAgain) {
        return
      }
      gOS.props.onPlayAgain(roomInfo)
    })
  },
  componentWillUnmount: function () {
    this.props.socket.off('update room info')
  },
  leaveRoom: function () {
    this.props.socket.emit('leave room')
    this.props.onLeaveRoom()
  },
  playAgain: function () {
    this.state.playAgain = true
    this.props.socket.emit('update room info')
  },
  render: function () {
    return (
      <div className='gameOverScreen'>
        {this.props.winnerInfo.name + ' won the game with ' + this.props.winnerInfo.points + ' cards!'}
        <button className='pure-button' onClick={this.playAgain}>Play Again</button>
        <button className='pure-button' onClick={this.leaveRoom}>Leave Room</button>
      </div>
    )
  }
})

export default GameOverScreen
