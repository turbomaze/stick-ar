class StickARUtils {
  static forceFullScreen() {
    const doc = window.document;
    const docEl = doc.documentElement;
    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  
    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      requestFullScreen.call(docEl);
    }
  }

  static registerVideoHandlers(
    width, height, streamCallback, errorCallback
  ) {
    navigator.getUserMedia = (navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia);
    if (navigator.getUserMedia) {
      navigator.getUserMedia(
				{
          video: {
            width: width,
            height: height,
            facingMode: {
              exact: 'environment'
            }
          },
          audio: false,
        },
        streamCallback,
        errorCallback
		  )
    } else {
      errorCallback({
        message: 'The browser you are using doesn\'t support getUserMedia'
      });
    }
  }
}
