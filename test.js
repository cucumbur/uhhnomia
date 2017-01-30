/* eslint-env mocha */

var assert = require('chai').assert
// Mock user class fills in for socket

var mockIn = {
  emit: function (a, b) {
    return true
  }
}
var mockBroadcast = {
  in: function (a) {
    return mockIn
  }
}
class User {
  constructor (name) {
    this.name = name
    this.left = false
    this.broadcast = mockBroadcast
  }
  join () { return true }
}

var Room = require('./lib/room.js')
describe('Room', function () {
  var testRoom
  beforeEach('creates an empty room', function () {
    testRoom = new Room('4Walls', 'fun-deck')
  })

  describe('#constructor()', function () {
    it('should return a default room when initialized', function () {
      assert.equal(testRoom.name, '4Walls')
      assert.equal(testRoom.maxPlayers, 4)
      assert.equal(testRoom.deck, 'fun-deck')
      assert.deepEqual(testRoom.players, [])
      assert.equal(testRoom.playing, false)
      assert.isNull(testRoom.game)
    })
  })

  describe('#addUser()', function () {
    var testRoom = new Room('4Walls', 'fun-deck')
    testRoom.maxPlayers = 3

    it('should add a user to an empty room', function () {
      assert.equal(testRoom.players.length, 0)
      var marvin = new User('marvin')
      assert.isTrue(testRoom.addUser(marvin))
      assert.equal(testRoom.players.length, 1)
      assert.equal(testRoom.players[0], marvin)
    })

    it('should add a user to a non-full room with another user', function () {
      assert.equal(testRoom.players.length, 1)
      var krista = new User('krista')
      assert.isTrue(testRoom.addUser(krista))
      assert.equal(testRoom.players.length, 2)
      assert.equal(testRoom.players[1], krista)
    })

    it('should not add a user to a full room', function () {
      testRoom.addUser(new User('yumi'))
      assert.equal(testRoom.players.length, 3)
      var muhammad = new User('muhammad')
      assert.isFalse(testRoom.addUser(muhammad))
      assert.equal(testRoom.players.length, 3)
      assert.notInclude(testRoom.players, muhammad)
    })

    it('should not add a user to a room that is playing a game', function () {
      testRoom.playing = true
      var janelle = new User('janelle')
      assert.isFalse(testRoom.addUser(janelle))
      assert.equal(testRoom.players.length, 3)
      assert.notInclude(testRoom.players, janelle)
    })
  })

  describe('#clearLeftPlayers()', function () {
    var testRoom = new Room('4Walls', 'fun-deck')
    testRoom.addUser(new User('chad'))
    var jill = new User('jill')
    testRoom.addUser(jill)
    testRoom.addUser(new User('artiom'))

    it('should not remove players who have not left', function () {
      assert.equal(testRoom.players.length, 3)
      testRoom.clearLeftPlayers()
      assert.equal(testRoom.players.length, 3)
    })

    it('should remove players who have left', function () {
      assert.equal(testRoom.players.length, 3)
      var player = testRoom.players[1]
      testRoom.players[1].left = true
      testRoom.clearLeftPlayers()
      assert.equal(testRoom.players.length, 2)
      assert.notInclude(testRoom.players, player)
    })
  })
})
