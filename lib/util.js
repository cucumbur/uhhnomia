module.exports = {
  evenlySplit: function (a, n) {
    console.log('hello')
    if (n < 2) {
      return [a]
    }

    var len = a.length
    var out = []
    var i = 0
    var size

    if (len % n === 0) {
      size = Math.floor(len / n)
      while (i < len) {
        out.push(a.slice(i, i += size))
      }
    } else {
      while (i < len) {
        size = Math.ceil((len - i) / n--)
        out.push(a.slice(i, i += size))
      }
    }

    return out
  }
}
