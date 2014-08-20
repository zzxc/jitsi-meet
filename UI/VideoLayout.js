/**
 * Created by hristo on 8/19/14.
 */

var AudioLevels = require("./audiolevels/AudioLevels.js");

var VideoLayout = (function (my) {
    var preMuted = false;
    var currentDominantSpeaker = null;

    my.changeLocalAudio = function(stream) {
        connection.jingle.localAudio = stream;

        RTC.attachMediaStream($('#localAudio'), stream);
        document.getElementById('localAudio').autoplay = true;
        document.getElementById('localAudio').volume = 0;
        if (preMuted) {
            toggleAudio();
            preMuted = false;
        }
    };

    function createLocalVideoContainer(stream)
    {
        var localVideo = document.createElement('video');
        localVideo.id = 'localVideo_' + stream.id;
        localVideo.autoplay = true;
        localVideo.volume = 0; // is it required if audio is separated ?
        localVideo.oncontextmenu = function () { return false; };

        var localVideoContainer = document.getElementById('localVideoWrapper');
        localVideoContainer.appendChild(localVideo);

        var localVideoSelector = $('#' + localVideo.id);
        // Add click handler to both video and video wrapper elements in case
        // there's no video.
        localVideoSelector.click(function () {
            VideoLayout.handleVideoThumbClicked(localVideo.src);
        });
        $('#localVideoContainer').click(function () {
            VideoLayout.handleVideoThumbClicked(localVideo.src);
        });

        // Add hover handler
        $('#localVideoContainer').hover(
            function() {
                VideoLayout.showDisplayName('localVideoContainer', true);
            },
            function() {
                if (!VideoLayout.isLargeVideoVisible()
                    || localVideo.src !== $('#largeVideo').attr('src'))
                    VideoLayout.showDisplayName('localVideoContainer', false);
            }
        );

        // Flip video x axis if needed
        flipXLocalVideo = flipX;
        if (flipX) {
            localVideoSelector.addClass("flipVideoX");
        }
    }

    my.changeLocalVideo = function(stream, flipX) {

        //tiq raboti da ne sa tuk

        connection.jingle.localVideo = stream;

        createLocalVideoContainer();


        AudioLevels.updateAudioLevelCanvas();


        // Add stream ended handler
        stream.onended = function () {
            localVideoContainer.removeChild(localVideo);
            VideoLayout.checkChangeLargeVideo(localVideo.src);
        };

        // Attach WebRTC stream
        RTC.attachMediaStream(localVideoSelector, stream);

        localVideoSrc = localVideo.src;
        VideoLayout.updateLargeVideo(localVideoSrc, 0);
    };

    /**
     * Checks if removed video is currently displayed and tries to display
     * another one instead.
     * @param removedVideoSrc src stream identifier of the video.
     */
    my.checkChangeLargeVideo = function(removedVideoSrc) {
        if (removedVideoSrc === $('#largeVideo').attr('src')) {
            // this is currently displayed as large
            // pick the last visible video in the row
            // if nobody else is left, this picks the local video
            var pick
                = $('#remoteVideos>span[id!="mixedstream"]:visible:last>video')
                .get(0);

            if (!pick) {
                console.info("Last visible video no longer exists");
                pick = $('#remoteVideos>span[id!="mixedstream"]>video').get(0);
                if (!pick) {
                    // Try local video
                    console.info("Fallback to local video...");
                    pick = $('#remoteVideos>span>span>video').get(0);
                }
            }

            // mute if localvideo
            if (pick) {
                VideoLayout.updateLargeVideo(pick.src, pick.volume);
            } else {
                console.warn("Failed to elect large video");
            }
        }
    };


    /**
     * Updates the large video with the given new video source.
     */
    my.updateLargeVideo = function(newSrc, vol) {
        console.log('hover in', newSrc);

        if ($('#largeVideo').attr('src') != newSrc) {

            var isVisible = $('#largeVideo').is(':visible');

            $('#largeVideo').fadeOut(300, function () {
                var oldSrc = $(this).attr('src');

                $(this).attr('src', newSrc);

                // Screen stream is already rotated
                var flipX = (newSrc === localVideoSrc) && flipXLocalVideo;

                var videoTransform = document.getElementById('largeVideo')
                    .style.webkitTransform;

                if (flipX && videoTransform !== 'scaleX(-1)') {
                    document.getElementById('largeVideo').style.webkitTransform
                        = "scaleX(-1)";
                }
                else if (!flipX && videoTransform === 'scaleX(-1)') {
                    document.getElementById('largeVideo').style.webkitTransform
                        = "none";
                }

                // Change the way we'll be measuring and positioning large video
                var isDesktop = isVideoSrcDesktop(newSrc);
                getVideoSize = isDesktop
                    ? getDesktopVideoSize
                    : VideoLayout.getCameraVideoSize;
                getVideoPosition = isDesktop
                    ? getDesktopVideoPosition
                    : VideoLayout.getCameraVideoPosition;

                if (isVisible) {
                    // Only if the large video is currently visible.
                    // Disable previous dominant speaker video.
                    var oldJid = getJidFromVideoSrc(oldSrc);
                    if (oldJid) {
                        var oldResourceJid = Strophe.getResourceFromJid(oldJid);
                        VideoLayout.enableDominantSpeaker(oldResourceJid, false);
                    }

                    // Enable new dominant speaker in the remote videos section.
                    var userJid = getJidFromVideoSrc(newSrc);
                    if (userJid)
                    {
                        var resourceJid = Strophe.getResourceFromJid(userJid);
                        VideoLayout.enableDominantSpeaker(resourceJid, true);
                    }

                    $(this).fadeIn(300);
                }
            });
        }
    };

    /**
     * Returns an array of the video horizontal and vertical indents.
     * Centers horizontally and top aligns vertically.
     *
     * @return an array with 2 elements, the horizontal indent and the vertical
     * indent
     */
    function getDesktopVideoPosition(videoWidth,
                                     videoHeight,
                                     videoSpaceWidth,
                                     videoSpaceHeight) {

        var horizontalIndent = (videoSpaceWidth - videoWidth) / 2;

        var verticalIndent = 0;// Top aligned

        return [horizontalIndent, verticalIndent];
    }

    /**
     * Checks if video identified by given src is desktop stream.
     * @param videoSrc eg.
     * blob:https%3A//pawel.jitsi.net/9a46e0bd-131e-4d18-9c14-a9264e8db395
     * @returns {boolean}
     */
    function isVideoSrcDesktop(videoSrc) {
        // FIXME: fix this mapping mess...
        // figure out if large video is desktop stream or just a camera
        var isDesktop = false;
        if (localVideoSrc === videoSrc) {
            // local video
            isDesktop = isUsingScreenStream;
        } else {
            // Do we have associations...
            var videoSsrc = videoSrcToSsrc[videoSrc];
            if (videoSsrc) {
                var videoType = ssrc2videoType[videoSsrc];
                if (videoType) {
                    // Finally there...
                    isDesktop = videoType === 'screen';
                } else {
                    console.error("No video type for ssrc: " + videoSsrc);
                }
            } else {
                console.error("No ssrc for src: " + videoSrc);
            }
        }
        return isDesktop;
    }


    my.handleVideoThumbClicked = function(videoSrc) {
        // Restore style for previously focused video
        var focusJid = getJidFromVideoSrc(focusedVideoSrc);
        var oldContainer = getParticipantContainer(focusJid);

        if (oldContainer) {
            oldContainer.removeClass("videoContainerFocused");
        }

        // Unlock current focused.
        if (focusedVideoSrc === videoSrc)
        {
            focusedVideoSrc = null;
            var dominantSpeakerVideo = null;
            // Enable the currently set dominant speaker.
            return;

        }
        // Lock new video
        focusedVideoSrc = videoSrc;

        // Update focused/pinned interface.
        var userJid = getJidFromVideoSrc(videoSrc);

        if (userJid)
        {
            var container = getParticipantContainer(userJid);
            container.addClass("videoContainerFocused");
        }
        if (currentDominantSpeaker) {
            dominantSpeakerVideo
                = $('#participant_' + currentDominantSpeaker + '>video')
                .get(0);

            if (dominantSpeakerVideo)
                VideoLayout.updateLargeVideo(dominantSpeakerVideo.src, 1);
        }

        // Triggers a "video.selected" event. The "false" parameter indicates
        // this isn't a prezi.
        $(document).trigger("video.selected", [false]);

        VideoLayout.updateLargeVideo(videoSrc, 1);

        $('audio').each(function (idx, el) {
            if (el.id.indexOf('mixedmslabel') !== -1) {
                el.volume = 0;
                el.volume = 1;
            }
        });
    };

    /**
     * Positions the large video.
     *
     * @param videoWidth the stream video width
     * @param videoHeight the stream video height
     */
    my.positionLarge = function (videoWidth, videoHeight) {
        var videoSpaceWidth = $('#videospace').width();
        var videoSpaceHeight = window.innerHeight;

        var videoSize = getVideoSize(videoWidth,
            videoHeight,
            videoSpaceWidth,
            videoSpaceHeight);

        var largeVideoWidth = videoSize[0];
        var largeVideoHeight = videoSize[1];

        var videoPosition = getVideoPosition(largeVideoWidth,
            largeVideoHeight,
            videoSpaceWidth,
            videoSpaceHeight);

        var horizontalIndent = videoPosition[0];
        var verticalIndent = videoPosition[1];

        positionVideo($('#largeVideo'),
            largeVideoWidth,
            largeVideoHeight,
            horizontalIndent, verticalIndent);
    };

    /**
     * Shows/hides the large video.
     */
    my.setLargeVideoVisible = function(isVisible) {
        var largeVideoJid = getJidFromVideoSrc($('#largeVideo').attr('src'));
        var resourceJid = Strophe.getResourceFromJid(largeVideoJid);

        if (isVisible) {
            $('#largeVideo').css({visibility: 'visible'});
            $('.watermark').css({visibility: 'visible'});
            VideoLayout.enableDominantSpeaker(resourceJid, true);
        }
        else {
            $('#largeVideo').css({visibility: 'hidden'});
            $('.watermark').css({visibility: 'hidden'});
            VideoLayout.enableDominantSpeaker(resourceJid, false);
        }
    };

    /**
     * Indicates if the large video is currently visible.
     *
     * @return <tt>true</tt> if visible, <tt>false</tt> - otherwise
     */
    my.isLargeVideoVisible = function() {
        return $('#largeVideo').is(':visible');
    };

    /**
     * Checks if container for participant identified by given peerJid exists
     * in the document and creates it eventually.
     *
     * @param peerJid peer Jid to check.
     */
    my.ensurePeerContainerExists = function(peerJid) {
        var peerResource = Strophe.getResourceFromJid(peerJid);
        var videoSpanId = 'participant_' + peerResource;

        if ($('#' + videoSpanId).length > 0) {
            // If there's been a focus change, make sure we add focus related
            // interface!!
            if (focus && $('#remote_popupmenu_' + peerResource).length <= 0)
                addRemoteVideoMenu( peerJid,
                    document.getElementById(videoSpanId));
            return;
        }

        var container
            = VideoLayout.addRemoteVideoContainer(peerJid, videoSpanId);

        var nickfield = document.createElement('span');
        nickfield.className = "nick";
        nickfield.appendChild(document.createTextNode(peerResource));
        container.appendChild(nickfield);
        VideoLayout.resizeThumbnails();
    };

    my.addRemoteVideoContainer = function(peerJid, spanId) {
        var container = document.createElement('span');
        container.id = spanId;
        container.className = 'videocontainer';
        var remotes = document.getElementById('remoteVideos');

        // If the peerJid is null then this video span couldn't be directly
        // associated with a participant (this could happen in the case of prezi).
        if (focus && peerJid != null)
            addRemoteVideoMenu(peerJid, container);

        remotes.appendChild(container);
        UIActivator.getUIService().updateAudioLevelCanvas(peerJid);

        return container;
    };

    /**
     * Shows the display name for the given video.
     */
    my.setDisplayName = function(videoSpanId, displayName) {
        var nameSpan = $('#' + videoSpanId + '>span.displayname');
        var defaultLocalDisplayName = "Me";
        var defaultRemoteDisplayName = "Speaker";

        // If we already have a display name for this video.
        if (nameSpan.length > 0) {
            var nameSpanElement = nameSpan.get(0);

            if (nameSpanElement.id === 'localDisplayName' &&
                $('#localDisplayName').text() !== displayName) {
                if (displayName)
                    $('#localDisplayName').text(displayName + ' (me)');
                else
                    $('#localDisplayName').text(defaultLocalDisplayName);
            } else {
                if (displayName)
                    $('#' + videoSpanId + '_name').text(displayName);
                else
                    $('#' + videoSpanId + '_name').text(defaultRemoteDisplayName);
            }
        } else {
            var editButton = null;

            nameSpan = document.createElement('span');
            nameSpan.className = 'displayname';
            $('#' + videoSpanId)[0].appendChild(nameSpan);

            if (videoSpanId === 'localVideoContainer') {
                editButton = createEditDisplayNameButton();
                nameSpan.innerText = defaultLocalDisplayName;
            }
            else {
                nameSpan.innerText = defaultRemoteDisplayName;
            }

            if (displayName && displayName.length) {
                nameSpan.innerText = displayName;
            }

            if (!editButton) {
                nameSpan.id = videoSpanId + '_name';
            } else {
                nameSpan.id = 'localDisplayName';
                $('#' + videoSpanId)[0].appendChild(editButton);

                var editableText = document.createElement('input');
                editableText.className = 'displayname';
                editableText.id = 'editDisplayName';

                if (displayName.length) {
                    editableText.value
                        = displayName.substring(0, displayName.indexOf(' (me)'));
                }

                editableText.setAttribute('style', 'display:none;');
                editableText.setAttribute('placeholder', 'ex. Jane Pink');
                $('#' + videoSpanId)[0].appendChild(editableText);

                $('#localVideoContainer .displayname')
                    .bind("click", function (e) {

                        e.preventDefault();
                        $('#localDisplayName').hide();
                        $('#editDisplayName').show();
                        $('#editDisplayName').focus();
                        $('#editDisplayName').select();

                        var inputDisplayNameHandler = function (name) {
                            if (nickname !== name) {
                                nickname = name;
                                window.localStorage.displayname = nickname;
                                connection.emuc.addDisplayNameToPresence(nickname);
                                connection.emuc.sendPresence();

                                Chat.setChatConversationMode(true);
                            }

                            if (!$('#localDisplayName').is(":visible")) {
                                if (nickname)
                                    $('#localDisplayName').text(nickname + " (me)");
                                else
                                    $('#localDisplayName')
                                        .text(defaultLocalDisplayName);
                                $('#localDisplayName').show();
                            }

                            $('#editDisplayName').hide();
                        };

                        $('#editDisplayName').one("focusout", function (e) {
                            inputDisplayNameHandler(this.value);
                        });

                        $('#editDisplayName').on('keydown', function (e) {
                            if (e.keyCode === 13) {
                                e.preventDefault();
                                inputDisplayNameHandler(this.value);
                            }
                        });
                    });
            }
        }
    };

    /**
     * Shows/hides the display name on the remote video.
     * @param videoSpanId the identifier of the video span element
     * @param isShow indicates if the display name should be shown or hidden
     */
    my.showDisplayName = function(videoSpanId, isShow) {
        // FIX: need to use noConflict of jquery, because apparently we're
        // using another library that uses $, which conflics with jquery and
        // sometimes objects are null because of that!!!!!!!!!
        // http://api.jquery.com/jQuery.noConflict/
        var nameSpan = jQuery('#' + videoSpanId + '>span.displayname').get(0);
        if (isShow) {
            if (nameSpan && nameSpan.innerHTML && nameSpan.innerHTML.length)
                nameSpan.setAttribute("style", "display:inline-block;");
        }
        else {
            if (nameSpan)
                nameSpan.setAttribute("style", "display:none;");
        }
    };

    /**
     * Shows a visual indicator for the focus of the conference.
     * Currently if we're not the owner of the conference we obtain the focus
     * from the connection.jingle.sessions.
     */
    my.showFocusIndicator = function() {
        if (focus !== null) {
            var indicatorSpan = $('#localVideoContainer .focusindicator');

            if (indicatorSpan.children().length === 0)
            {
                createFocusIndicatorElement(indicatorSpan[0]);
            }
        }
        else if (Object.keys(connection.jingle.sessions).length > 0) {
            // If we're only a participant the focus will be the only session we have.
            var session
                = connection.jingle.sessions
                [Object.keys(connection.jingle.sessions)[0]];
            var focusId
                = 'participant_' + Strophe.getResourceFromJid(session.peerjid);

            var focusContainer = document.getElementById(focusId);
            if (!focusContainer) {
                console.error("No focus container!");
                return;
            }
            var indicatorSpan = $('#' + focusId + ' .focusindicator');

            if (!indicatorSpan || indicatorSpan.length === 0) {
                indicatorSpan = document.createElement('span');
                indicatorSpan.className = 'focusindicator';

                focusContainer.appendChild(indicatorSpan);

                createFocusIndicatorElement(indicatorSpan);
            }
        }
    };

    /**
     * Shows video muted indicator over small videos.
     */
    my.showVideoIndicator = function(videoSpanId, isMuted) {
        var videoMutedSpan = $('#' + videoSpanId + '>span.videoMuted');

        if (isMuted === 'false') {
            if (videoMutedSpan.length > 0) {
                videoMutedSpan.remove();
            }
        }
        else {
            var audioMutedSpan = $('#' + videoSpanId + '>span.audioMuted');

            videoMutedSpan = document.createElement('span');
            videoMutedSpan.className = 'videoMuted';
            if (audioMutedSpan) {
                videoMutedSpan.right = '30px';
            }
            $('#' + videoSpanId)[0].appendChild(videoMutedSpan);

            var mutedIndicator = document.createElement('i');
            mutedIndicator.className = 'icon-camera-disabled';
            Util.setTooltip(mutedIndicator,
                "Participant has<br/>stopped the camera.",
                "top");
            videoMutedSpan.appendChild(mutedIndicator);
        }
    };

    /**
     * Shows audio muted indicator over small videos.
     */
    my.showAudioIndicator = function(videoSpanId, isMuted) {
        var audioMutedSpan = $('#' + videoSpanId + '>span.audioMuted');

        if (isMuted === 'false') {
            if (audioMutedSpan.length > 0) {
                audioMutedSpan.remove();
            }
        }
        else {
            var videoMutedSpan = $('#' + videoSpanId + '>span.videoMuted');

            audioMutedSpan = document.createElement('span');
            audioMutedSpan.className = 'audioMuted';
            Util.setTooltip(audioMutedSpan,
                "Participant is muted",
                "top");

            if (videoMutedSpan) {
                audioMutedSpan.right = '30px';
            }
            $('#' + videoSpanId)[0].appendChild(audioMutedSpan);

            var mutedIndicator = document.createElement('i');
            mutedIndicator.className = 'icon-mic-disabled';
            audioMutedSpan.appendChild(mutedIndicator);
        }
    };

    /**
     * Resizes the large video container.
     */
    my.resizeLargeVideoContainer = function () {
        Chat.resizeChat();
        var availableHeight = window.innerHeight;
        var availableWidth = Util.getAvailableVideoWidth();

        if (availableWidth < 0 || availableHeight < 0) return;

        $('#videospace').width(availableWidth);
        $('#videospace').height(availableHeight);
        $('#largeVideoContainer').width(availableWidth);
        $('#largeVideoContainer').height(availableHeight);

        VideoLayout.resizeThumbnails();
    };

    /**
     * Resizes thumbnails.
     */
    my.resizeThumbnails = function() {
        var videoSpaceWidth = $('#remoteVideos').width();

        var thumbnailSize = VideoLayout.calculateThumbnailSize(videoSpaceWidth);
        var width = thumbnailSize[0];
        var height = thumbnailSize[1];

        // size videos so that while keeping AR and max height, we have a
        // nice fit
        $('#remoteVideos').height(height);
        $('#remoteVideos>span').width(width);
        $('#remoteVideos>span').height(height);

        $(document).trigger("remotevideo.resized", [width, height]);
    };

    /**
     * Enables the dominant speaker UI.
     *
     * @param resourceJid the jid indicating the video element to
     * activate/deactivate
     * @param isEnable indicates if the dominant speaker should be enabled or
     * disabled
     */
    my.enableDominantSpeaker = function(resourceJid, isEnable) {
        var displayName = resourceJid;
        var nameSpan = $('#participant_' + resourceJid + '>span.displayname');
        if (nameSpan.length > 0)
            displayName = nameSpan.text();

        console.log("UI enable dominant speaker",
            displayName,
            resourceJid,
            isEnable);

        var videoSpanId = null;
        var videoContainerId = null;
        if (resourceJid
            === Strophe.getResourceFromJid(connection.emuc.myroomjid)) {
            videoSpanId = 'localVideoWrapper';
            videoContainerId = 'localVideoContainer';
        }
        else {
            videoSpanId = 'participant_' + resourceJid;
            videoContainerId = videoSpanId;
        }

        videoSpan = document.getElementById(videoContainerId);

        if (!videoSpan) {
            console.error("No video element for jid", resourceJid);
            return;
        }

        var video = $('#' + videoSpanId + '>video');

        if (video && video.length > 0) {
            if (isEnable) {
                VideoLayout.showDisplayName(videoContainerId, true);

                if (!videoSpan.classList.contains("dominantspeaker"))
                    videoSpan.classList.add("dominantspeaker");

                video.css({visibility: 'hidden'});
            }
            else {
                VideoLayout.showDisplayName(videoContainerId, false);

                if (videoSpan.classList.contains("dominantspeaker"))
                    videoSpan.classList.remove("dominantspeaker");

                video.css({visibility: 'visible'});
            }
        }
    };

    /**
     * Gets the selector of video thumbnail container for the user identified by
     * given <tt>userJid</tt>
     * @param userJid user's Jid for whom we want to get the video container.
     */
    function getParticipantContainer(userJid)
    {
        if (!userJid)
            return null;

        if (userJid === connection.emuc.myroomjid)
            return $("#localVideoContainer");
        else
            return $("#participant_" + Strophe.getResourceFromJid(userJid));
    }

    /**
     * Sets the size and position of the given video element.
     *
     * @param video the video element to position
     * @param width the desired video width
     * @param height the desired video height
     * @param horizontalIndent the left and right indent
     * @param verticalIndent the top and bottom indent
     */
    function positionVideo(video,
                           width,
                           height,
                           horizontalIndent,
                           verticalIndent) {
        video.width(width);
        video.height(height);
        video.css({  top: verticalIndent + 'px',
            bottom: verticalIndent + 'px',
            left: horizontalIndent + 'px',
            right: horizontalIndent + 'px'});
    }

    /**
     * Calculates the thumbnail size.
     */
    my.calculateThumbnailSize = function (videoSpaceWidth) {
        // Calculate the available height, which is the inner window height minus
        // 39px for the header minus 2px for the delimiter lines on the top and
        // bottom of the large video, minus the 36px space inside the remoteVideos
        // container used for highlighting shadow.
        var availableHeight = 100;

        var numvids = $('#remoteVideos>span:visible').length;

        // Remove the 3px borders arround videos and border around the remote
        // videos area
        var availableWinWidth = videoSpaceWidth - 2 * 3 * numvids - 50;

        var availableWidth = availableWinWidth / numvids;
        var aspectRatio = 16.0 / 9.0;
        var maxHeight = Math.min(160, availableHeight);
        availableHeight = Math.min(maxHeight, availableWidth / aspectRatio);
        if (availableHeight < availableWidth / aspectRatio) {
            availableWidth = Math.floor(availableHeight * aspectRatio);
        }

        return [availableWidth, availableHeight];
    };

    /**
     * Returns an array of the video dimensions, so that it keeps it's aspect
     * ratio and fits available area with it's larger dimension. This method
     * ensures that whole video will be visible and can leave empty areas.
     *
     * @return an array with 2 elements, the video width and the video height
     */
    function getDesktopVideoSize(videoWidth,
                                 videoHeight,
                                 videoSpaceWidth,
                                 videoSpaceHeight) {
        if (!videoWidth)
            videoWidth = currentVideoWidth;
        if (!videoHeight)
            videoHeight = currentVideoHeight;

        var aspectRatio = videoWidth / videoHeight;

        var availableWidth = Math.max(videoWidth, videoSpaceWidth);
        var availableHeight = Math.max(videoHeight, videoSpaceHeight);

        videoSpaceHeight -= $('#remoteVideos').outerHeight();

        if (availableWidth / aspectRatio >= videoSpaceHeight)
        {
            availableHeight = videoSpaceHeight;
            availableWidth = availableHeight * aspectRatio;
        }

        if (availableHeight * aspectRatio >= videoSpaceWidth)
        {
            availableWidth = videoSpaceWidth;
            availableHeight = availableWidth / aspectRatio;
        }

        return [availableWidth, availableHeight];
    }

    /**
     * Returns an array of the video dimensions, so that it covers the screen.
     * It leaves no empty areas, but some parts of the video might not be visible.
     *
     * @return an array with 2 elements, the video width and the video height
     */
    my.getCameraVideoSize = function(videoWidth,
                                videoHeight,
                                videoSpaceWidth,
                                videoSpaceHeight) {
        if (!videoWidth)
            videoWidth = currentVideoWidth;
        if (!videoHeight)
            videoHeight = currentVideoHeight;

        var aspectRatio = videoWidth / videoHeight;

        var availableWidth = Math.max(videoWidth, videoSpaceWidth);
        var availableHeight = Math.max(videoHeight, videoSpaceHeight);

        if (availableWidth / aspectRatio < videoSpaceHeight) {
            availableHeight = videoSpaceHeight;
            availableWidth = availableHeight * aspectRatio;
        }

        if (availableHeight * aspectRatio < videoSpaceWidth) {
            availableWidth = videoSpaceWidth;
            availableHeight = availableWidth / aspectRatio;
        }

        return [availableWidth, availableHeight];
    }


    /**
     * Returns an array of the video horizontal and vertical indents,
     * so that if fits its parent.
     *
     * @return an array with 2 elements, the horizontal indent and the vertical
     * indent
     */
    my.getCameraVideoPosition = function(videoWidth,
                                    videoHeight,
                                    videoSpaceWidth,
                                    videoSpaceHeight) {
        // Parent height isn't completely calculated when we position the video in
        // full screen mode and this is why we use the screen height in this case.
        // Need to think it further at some point and implement it properly.
        var isFullScreen = document.fullScreen ||
            document.mozFullScreen ||
            document.webkitIsFullScreen;
        if (isFullScreen)
            videoSpaceHeight = window.innerHeight;

        var horizontalIndent = (videoSpaceWidth - videoWidth) / 2;
        var verticalIndent = (videoSpaceHeight - videoHeight) / 2;

        return [horizontalIndent, verticalIndent];
    }

    /**
     * Creates the edit display name button.
     *
     * @returns the edit button
     */
    function createEditDisplayNameButton() {
        var editButton = document.createElement('a');
        editButton.className = 'displayname';
        Util.setTooltip(editButton,
            'Click to edit your<br/>display name',
            "top");
        editButton.innerHTML = '<i class="fa fa-pencil"></i>';

        return editButton;
    }

    /**
     * Creates the element indicating the focus of the conference.
     *
     * @param parentElement the parent element where the focus indicator will
     * be added
     */
    function createFocusIndicatorElement(parentElement) {
        var focusIndicator = document.createElement('i');
        focusIndicator.className = 'fa fa-star';
        parentElement.appendChild(focusIndicator);

        Util.setTooltip(parentElement,
            "The owner of<br/>this conference",
            "top");
    }

    /**
     * Updates the remote video menu.
     *
     * @param jid the jid indicating the video for which we're adding a menu.
     * @param isMuted indicates the current mute state
     */
    my.updateRemoteVideoMenu = function(jid, isMuted) {
        var muteMenuItem
            = $('#remote_popupmenu_'
            + Strophe.getResourceFromJid(jid)
            + '>li>a.mutelink');

        var mutedIndicator = "<i class='icon-mic-disabled'></i>";

        if (muteMenuItem.length) {
            var muteLink = muteMenuItem.get(0);

            if (isMuted === 'true') {
                muteLink.innerHTML = mutedIndicator + ' Muted';
                muteLink.className = 'mutelink disabled';
            }
            else {
                muteLink.innerHTML = mutedIndicator + ' Mute';
                muteLink.className = 'mutelink';
            }
        }
    };

    /**
     * Returns the current dominant speaker resource jid.
     */
    my.getDominantSpeakerResourceJid = function () {
        return currentDominantSpeaker;
    };

    /**
     * Adds the remote video menu element for the given <tt>jid</tt> in the
     * given <tt>parentElement</tt>.
     *
     * @param jid the jid indicating the video for which we're adding a menu.
     * @param parentElement the parent element where this menu will be added
     */
    function addRemoteVideoMenu(jid, parentElement) {
        var spanElement = document.createElement('span');
        spanElement.className = 'remotevideomenu';

        parentElement.appendChild(spanElement);

        var menuElement = document.createElement('i');
        menuElement.className = 'fa fa-angle-down';
        menuElement.title = 'Remote user controls';
        spanElement.appendChild(menuElement);

//        <ul class="popupmenu">
//        <li><a href="#">Mute</a></li>
//        <li><a href="#">Eject</a></li>
//        </ul>
        var popupmenuElement = document.createElement('ul');
        popupmenuElement.className = 'popupmenu';
        popupmenuElement.id
            = 'remote_popupmenu_' + Strophe.getResourceFromJid(jid);
        spanElement.appendChild(popupmenuElement);

        var muteMenuItem = document.createElement('li');
        var muteLinkItem = document.createElement('a');

        var mutedIndicator = "<i class='icon-mic-disabled'></i>";

        if (!mutedAudios[jid]) {
            muteLinkItem.innerHTML = mutedIndicator + 'Mute';
            muteLinkItem.className = 'mutelink';
        }
        else {
            muteLinkItem.innerHTML = mutedIndicator + ' Muted';
            muteLinkItem.className = 'mutelink disabled';
        }

        muteLinkItem.onclick = function(){
            if ($(this).attr('disabled') != undefined) {
                event.preventDefault();
            }
            var isMute = !mutedAudios[jid];
            connection.moderate.setMute(jid, isMute);
            popupmenuElement.setAttribute('style', 'display:none;');

            if (isMute) {
                this.innerHTML = mutedIndicator + ' Muted';
                this.className = 'mutelink disabled';
            }
            else {
                this.innerHTML = mutedIndicator + ' Mute';
                this.className = 'mutelink';
            }
        };

        muteMenuItem.appendChild(muteLinkItem);
        popupmenuElement.appendChild(muteMenuItem);

        var ejectIndicator = "<i class='fa fa-eject'></i>";

        var ejectMenuItem = document.createElement('li');
        var ejectLinkItem = document.createElement('a');
        ejectLinkItem.innerHTML = ejectIndicator + ' Kick out';
        ejectLinkItem.onclick = function(){
            connection.moderate.eject(jid);
            popupmenuElement.setAttribute('style', 'display:none;');
        };

        ejectMenuItem.appendChild(ejectLinkItem);
        popupmenuElement.appendChild(ejectMenuItem);
    }

    /**
     * On audio muted event.
     */
    $(document).bind('audiomuted.muc', function (event, jid, isMuted) {
        var videoSpanId = null;
        if (jid === connection.emuc.myroomjid) {
            videoSpanId = 'localVideoContainer';
        } else {
            VideoLayout.ensurePeerContainerExists(jid);
            videoSpanId = 'participant_' + Strophe.getResourceFromJid(jid);
        }

        if (focus) {
            mutedAudios[jid] = isMuted;
            VideoLayout.updateRemoteVideoMenu(jid, isMuted);
        }

        if (videoSpanId)
            VideoLayout.showAudioIndicator(videoSpanId, isMuted);
    });

    /**
     * On video muted event.
     */
    $(document).bind('videomuted.muc', function (event, jid, isMuted) {
        var videoSpanId = null;
        if (jid === connection.emuc.myroomjid) {
            videoSpanId = 'localVideoContainer';
        } else {
            VideoLayout.ensurePeerContainerExists(jid);
            videoSpanId = 'participant_' + Strophe.getResourceFromJid(jid);
        }

        if (videoSpanId)
            VideoLayout.showVideoIndicator(videoSpanId, isMuted);
    });

    /**
     * On dominant speaker changed event.
     */
    $(document).bind('dominantspeakerchanged', function (event, resourceJid) {
        // We ignore local user events.
        if (resourceJid
            === Strophe.getResourceFromJid(connection.emuc.myroomjid))
            return;

        // Obtain container for new dominant speaker.
        var container  = document.getElementById(
                'participant_' + resourceJid);

        // Update the current dominant speaker.
        if (resourceJid !== currentDominantSpeaker)
            currentDominantSpeaker = resourceJid;
        else
            return;

        // Local video will not have container found, but that's ok
        // since we don't want to switch to local video.
        if (container && !focusedVideoSrc)
        {
            var video = container.getElementsByTagName("video");
            if (video.length)
            {
                VideoLayout.updateLargeVideo(video[0].src);
            }
        }
    });

    return my;
}(VideoLayout || {}));

module.exports = VideoLayout;
