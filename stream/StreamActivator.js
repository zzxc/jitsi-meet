/**
 * Created by hristo on 8/20/14.
 */

var EventEmmiter = require("events");

function StreamActivator()
{
    var eventEmmiter = null;

    StreamActivator.addStreamListener = function(listener, eventType)
    {
        if(eventEmmiter == null)
        {
            eventEmmiter = new EventEmitter();
        }

        eventEmmiter.on(eventType, listener);
    }

    StreamActivator.addStreamListener = function(listener, eventType)
    {
        if(eventEmmiter == null)
            return;
        eventEmmiter.removeListener(eventType, listener);
    }

    StreamActivator.stop = function () {
        if(eventEmmiter)
        {
            eventEmmiter.removeAllListeners("statistics.audioLevel");
            eventEmmiter = null;
        }

    }

    StreamActivator.createStream = function(stream)
    {
        return new Stream(stream);
    }

    StreamActivator.start = function()
    {

    }
}

function Stream(stream, eventEmmiter)
{
    this.stream = stream;
    this.eventEmmiter = eventEmmiter;
    eventEmmiter.emit(StreamActivator.EVENT_TYPE_CREATED, this);
    var self = this;
    this.stream.onended = function()
    {
        self.streamEnded();
    }
}

Stream.prototype.streamEnded = function () {
    this.eventEmmiter.emit(StreamActivator.EVENT_TYPE_ENDED, this);
}

StreamActivator.EVENT_TYPE_CREATED = "stream.created";

StreamActivator.EVENT_TYPE_ENDED = "stream.ended";


module.exports = StreamActivator;