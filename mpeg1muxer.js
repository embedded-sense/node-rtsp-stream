var Mpeg1Muxer, child_process, events, util

child_process = require('child_process')

util = require('util')

events = require('events')

Mpeg1Muxer = function(options) {
  var key
  this.url = options.url
  this.ffmpegOptions = options.ffmpegOptions
  this.reconnect = options.reconnect
  this.reconnectInt = options.reconnectInterval
  this.reconnectTimeout = options.reconnectTimeout || 100
  this.exitCode = undefined
  this.additionalFlags = []
  if (this.ffmpegOptions) {
    for (key in this.ffmpegOptions) {
      this.additionalFlags.push(key)
      if (String(this.ffmpegOptions[key]) !== '') {
        this.additionalFlags.push(String(this.ffmpegOptions[key]))
      }
    }
  }
  this.spawnOptions = [
    "-i",
    this.url,
    '-f',
    'mpegts',
    '-codec:v',
    'mpeg1video',
    // additional ffmpeg options go here
    ...this.additionalFlags,
    '-'
  ]
  startStream = () => {
    this.stream = child_process.spawn("ffmpeg", this.spawnOptions, {
      detached: false
    })
    this.inputStreamStarted = true
    this.stream.stdout.on('data', (data) => {
      return this.emit('mpeg1data', data)
    })
    this.stream.stderr.on('data', (data) => {
      return this.emit('ffmpegStderr', data)
    })
    this.stream.on('exit', (code, signal) => {
      this.inputStreamStarted = false
      if(this.reconnect || this.reconnecting){
        console.log('RTSP stream exited, reconnecting...')
        setTimeout(startStream, this.reconnectTimeout);
      } else if (code === 1) {
        console.error('RTSP stream exited with error')
        this.exitCode = 1
        return this.emit('exitWithError')
      }
    })
    if(!this.reconnecting && this.reconnectInt && this.reconnectInt > 1000){
      setInterval(() => {
        this.reconnecting = true;
        console.log('RTSP stream is currently reconnecting according to the reconnect interval option...')
        this.stream.kill();
      }, this.reconnectInt);
    }
    this.reconnecting = false
  }
  startStream();
  return this
}

util.inherits(Mpeg1Muxer, events.EventEmitter)

module.exports = Mpeg1Muxer
