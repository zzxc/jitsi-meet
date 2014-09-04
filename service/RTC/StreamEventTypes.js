function SteamEventType(type)
{
    this.type = type;
}

SteamEventType.types = {
    EVENT_TYPE_AUDIO_CREATED: new SteamEventType("stream.audio_created"),

    EVENT_TYPE_AUDIO_ENDED: new SteamEventType("stream.audio_ended"),

    EVENT_TYPE_VIDEO_CREATED: new SteamEventType("stream.video_created"),

    EVENT_TYPE_VIDEO_ENDED: new SteamEventType("stream.video_ended")
}

module.exports = SteamEventType;