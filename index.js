var ReedSolomonEncoder = require('./rs.js')
var messageBuilder = require('./messagebuilder.js')
var FSK = require('./fsk.js')

module.exports = function (message) {
  var highspeed = false
  var baud = highspeed ? 300 : 150
  var reedSolomon = ReedSolomonEncoder()
  var fsk = new FSK(44100, highspeed)
  var builder = new messageBuilder(fsk, highspeed ? 2 : 1, reedSolomon)

  fsk.clear()
  builder.clear()

  var bytes = builder.setBytesFromText(message)
  if (bytes.length > reedSolomon.getDataLength()) {
  	return
  }

  builder.build()
  return fsk.generateSamples(true)
}
