function SteamEventType(type)
{
    this.type = type;
}

SteamEventType.types = {
    EVENT_TYPE_CREATED: new SteamEventType("stream.created"),

    EVENT_TYPE_ENDED: new SteamEventType("stream.ended"),
}

module.exports = SteamEventType;