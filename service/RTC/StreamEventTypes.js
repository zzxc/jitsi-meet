function SteamEventType(type)
{
    this.type = type;
}

SteamEventType.types = {
    EVENT_TYPE_LOCAL_CREATED: new SteamEventType("stream.local_created"),

    EVENT_TYPE_LOCAL_ENDED: new SteamEventType("stream.local_ended"),

    EVENT_TYPE_REMOTE_CREATED: new SteamEventType("stream.remote_created"),

    EVENT_TYPE_REMOTE_ENDED: new SteamEventType("stream.remote_ended")
}

module.exports = SteamEventType;