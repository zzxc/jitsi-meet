function RTCBrowserType(type)
{
    this.type = type;
}

module.exports = {
    RTC_BROWSER_CHROME: new RTCBrowserType("chrome"),

    RTC_BROWSER_FIREFOX: new RTCBrowserType("firefox")
}