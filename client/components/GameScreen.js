var React = require('react')

// Components for game screen
var GameScreen = React.createClass({
  getInitialState: function () {
    var initialGameInfo = this.props.initialGameInfo
    var sortedPlayers = this.sortPlayers(initialGameInfo.players)
    return {
      roomName: initialGameInfo.name,
      players: sortedPlayers,
      whoseTurn: initialGameInfo.whoseTurn,
      matchup: null,
      cardsLeft: initialGameInfo.cardsLeft,
      lastMatchup: null,
      audioMatchup: null,
      answers: [],
      voting: false
    }
  },
  componentDidMount: function () {
    console.log('mounted')
    var gS = this

    this.props.socket.on('update game info', function (gameInfo) {
      console.log('SR update game info')
      if (gameInfo.matchup && (gameInfo.lastMatchup !== gS.state.audioMatchup)) {
        gS.setState({ audioMatchup: gameInfo.lastMatchup })
        gS.props.audioClips['soundMatchup'].play()
      }
      console.log('update game info setting state')
      var sortedPlayers = gS.sortPlayers(gameInfo.players)
      gS.setState({ players: sortedPlayers, whoseTurn: gameInfo.whoseTurn, matchup: gameInfo.matchup, lastMatchup: gameInfo.lastMatchup, cardsLeft: gameInfo.cardsLeft })
    })

    this.props.socket.on('answer voting', function (answer) {
      console.log(answer)
      console.log('SR answer voting')
      // var answer2 = { type: 'rejected' }
      var newAnswerList = gS.state.answers.concat([answer])
      gS.setState({ answers: newAnswerList, voting: true })
    })

    this.props.socket.on('answer rejected', function () {
      console.log('SR answer rejected')
      var answer = { type: 'rejected' }
      var newAnswerList = gS.state.answers.concat([answer])
      gS.setState({ answers: newAnswerList, voting: false })
    })

    this.props.socket.on('answer accepted', function (aG) {
      console.log('SR answer accepted')
      let answer = aG.answer
      answer.type = 'accepted'
      let gameInfo = aG.gameInfo
      if (gameInfo.matchup && (gameInfo.lastMatchup !== gS.state.audioMatchup)) {
        gS.setState({ audioMatchup: gameInfo.lastMatchup })
        gS.props.audioClips['soundMatchup'].play()
      }
      var newAnswerList = gS.state.answers.concat([answer])
      var sortedPlayers = gS.sortPlayers(gameInfo.players)
      gS.setState({ players: sortedPlayers, whoseTurn: gameInfo.whoseTurn, matchup: gameInfo.matchup, lastMatchup: gameInfo.lastMatchup, cardsLeft: gameInfo.cardsLeft, answers: newAnswerList, voting: false })
    })

    this.props.socket.on('game over', function (winner) {
      // setTimeout( function() {gS.props.onGameOver(winner)}, 2000 )
      gS.props.onGameOver(winner)
    })
  },
  componentWillUnmount: function () {
    this.props.socket.off('update game info')
    this.props.socket.off('answer voting')
    this.props.socket.off('answer rejected')
    this.props.socket.off('matchup answer')
    this.props.socket.off('game over')
  },
  sortPlayers: function (playerList) {
    let that = this
    if (playerList.length === 1) {
      return playerList
    }
    var sortedPlayers = []

    var curPlayerIndex = playerList.findIndex(function (player) { return player.name === that.props.playerName })
    sortedPlayers.push(playerList[curPlayerIndex])

    playerList.splice(curPlayerIndex, 1)
    sortedPlayers = sortedPlayers.concat(playerList.sort())
    console.log('==== sortedPlayers ===')
    console.log(sortedPlayers)
    return sortedPlayers
  },
  handleDrawCard: function () {
    if (!this.isMyTurn()) {
      return
    }
    this.props.socket.emit('draw card')
  },
  handleAnswerSubmit: function (answer) {
    this.props.socket.emit('submit answer', answer)
  },
  handleReject: function () {
    this.props.socket.emit('reject answer')
  },
  isMyTurn: function () {
    return (this.state.whoseTurn === this.props.playerName)
  },
  render: function () {
    console.log('gamescreen rerender')
    return (
      <div className='gameScreen'>
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
          playerName={this.props.playerName}
        />
      </div>
    )
  }
})

var GameGrid = React.createClass({
  getInitialState: function () {
    return { answer: '' }
  },
  getMatchupToGuess: function () {
    var opponentName = null
    if (this.props.matchup && (this.props.matchup[0] === this.props.playerName)) {
      opponentName = this.props.matchup[1]
    } else if (this.props.matchup && (this.props.matchup[1] === this.props.playerName)) {
      opponentName = this.props.matchup[0]
    }
    if (!opponentName) {
      return null
    }
    var cText = this.props.sortedPlayers.find(function (p) { return p.name === opponentName }).topCard.text
    return cText
  },
  handleAnswerChange: function (e) {
    this.setState({ answer: e.target.value })
  },
  handleAnswerSubmit: function (e) {
    e.preventDefault()
    this.setState({ answer: '' })
    var answer = this.state.answer
    if (!answer || !this.isMatched(0)) {
      return
    }
    this.props.audioClips['soundMatchup'].play()
    this.props.onAnswerSubmit(answer)
  },
  isMatched: function (i) {
    if (this.props.sortedPlayers.length <= i) {
      return false
    }
    return this.props.matchup && (this.props.matchup[0] === this.props.sortedPlayers[i].name || this.props.matchup[1] === this.props.sortedPlayers[i].name)
  },
  render: function () {
    console.log(this.props.sortedPlayers)
    return (
      <div className='gameGrid'>
        <div className='pure-g'>
          <div className='pure-u-1-3'>Uhhnomia</div>
          <div className='pure-u-1-6'>Name: {this.props.playerName}</div>
          <div className='pure-u-1-6'>Room: {this.props.roomName}</div>
          <div className='pure-u-1-6'>Cards Won: {this.props.sortedPlayers[0].points}</div>
          <div className='pure-u-1-6'>Cards Left: {this.props.cardsLeft}</div>
        </div>
        <div className='pure-g'>
          <div className='pure-u-1-3'>
            {this.props.sortedPlayers.length > 1 ? this.props.sortedPlayers[1].name + '  ' + this.props.sortedPlayers[1].points : ''}
            <GameCard
              text={this.props.sortedPlayers.length > 1 && this.props.sortedPlayers[1].topCard ? this.props.sortedPlayers[1].topCard.text : ''}
              symbol={this.props.sortedPlayers.length > 1 && this.props.sortedPlayers[1].topCard ? this.props.sortedPlayers[1].topCard.symbol : ''}
              matched={this.isMatched(1)}
              />
          </div>
          <div className='pure-u-1-3'>
            {this.props.sortedPlayers.length > 2 ? this.props.sortedPlayers[2].name + '  ' + this.props.sortedPlayers[2].points : ''}
            <GameCard
              text={this.props.sortedPlayers.length > 2 && this.props.sortedPlayers[2].topCard ? this.props.sortedPlayers[2].topCard.text : ''}
              symbol={this.props.sortedPlayers.length > 2 && this.props.sortedPlayers[2].topCard ? this.props.sortedPlayers[2].topCard.symbol : ''}
              matched={this.isMatched(2)}
            />
          </div>
          <div className='pure-u-1-3'>
            {this.props.sortedPlayers.length > 3 ? this.props.sortedPlayers[3].name + '  ' + this.props.sortedPlayers[3].points : ''}
            <GameCard
              text={this.props.sortedPlayers.length > 3 && this.props.sortedPlayers[3].topCard ? this.props.sortedPlayers[3].topCard.text : ''}
              symbol={this.props.sortedPlayers.length > 3 && this.props.sortedPlayers[3].topCard ? this.props.sortedPlayers[3].topCard.symbol : ''}
              matched={this.isMatched(3)}
              />
          </div>
        </div>
        <div className='pure-g'>
          <div className='pure-u-1-3'>Drawpile</div>
          <div className='pure-u-1-3'>
            Your Card
            <GameCard
              text={this.props.sortedPlayers[0].topCard ? this.props.sortedPlayers[0].topCard.text : ''}
              symbol={this.props.sortedPlayers[0].topCard ? this.props.sortedPlayers[0].topCard.symbol : ''}
              matched={this.isMatched(0)}
            />
          </div>
          <div className='pure-u-1-3'>Wildcard</div>
        </div>
        <div className='pure-g'>
          <div className='pure-u-1-3'>Answers
            <div className='answersContainer'><GameAnswers answers={this.props.answers} /></div>
          </div>
          <div className='pure-u-1-3'>
            <form className='pure-form' onSubmit={this.handleAnswerSubmit}>
              <input
                type='text'
                placeholder='Blurt your answer!'
                value={this.state.answer}
                onChange={this.handleAnswerChange}
              />
              <input className='pure-button' type='submit' value='Send' />
            </form><br />
            {this.getMatchupToGuess() ? this.getMatchupToGuess() : ''}
          </div>
          <div className='pure-u-1-3'>
            <button className={this.props.myTurn && !this.props.matchup ? 'pure-button' : 'pure-button pure-button-disabled'} onClick={this.props.onDrawCard}>Draw</button><br />
            <button className={this.props.voting ? 'pure-button' : 'pure-button pure-button-disabled'} onClick={this.props.onReject}>Reject</button><br />
          </div>
        </div>
      </div>
    )
  }
})

var GameCard = React.createClass({
  render: function () {
    return (
      <div className={this.props.matched ? 'gameCard-match' : 'gameCard'}>
        {this.props.text ? this.props.text : ''}
        <div className='symbol symbol-topLeft'>{this.props.symbol ? this.props.symbol : ''}</div>
        <div className='symbol symbol-topRight'>{this.props.symbol ? this.props.symbol : ''}</div>
        <div className='symbol symbol-bottomLeft'>{this.props.symbol ? this.props.symbol : ''}</div>
        <div className='symbol symbol-bottomRight'>{this.props.symbol ? this.props.symbol : ''}</div>
      </div>
    )
  }
})

var GameAnswers = React.createClass({
  render: function () {
    var answerNodes = this.props.answers.map(function (answer) {
      if (answer.type === 'answer') {
        return (
          <li>{answer.playerName} answered {answer.cardText} with {answer.answerText}</li>
        )
      } else if (answer.type === 'accepted') {
        return (
          <li>{answer.playerName}s answer was accepted</li>
        )
      } else if (answer.type === 'rejected') {
        return (
          <li>Answer rejected.</li>
        )
      }
    })
    return (
      <ul className='gameAnswers'>
        {answerNodes}
      </ul>
    )
  }
})

export default GameScreen
