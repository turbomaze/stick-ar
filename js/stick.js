class Stick {
  static init() {
    const stick = new Stick(
      600,
      420,
      25,
      document.querySelector('video'),
      document.querySelector('canvas')
    );
		stick.start();

    StickARUtils.registerVideoHandlers(
			stick.width,
			stick.height,
			stream => {
        stick.video.srcObject = stream;
        stick.video.onloadedmetadata = e => {
          stick.video.play();
        };
      }, err => {
		  	alert('Something went wrong. (error code ' + err.code + ')');
		  }
		);

    // start the process when they start full screen/landscape
    document.body.addEventListener('click', function() {
      if (!stick.isFullScreen) {
        StickARUtils.forceFullScreen();
        stick.isFullScreen = true; 
      }
    });
		if (document.location.hash !== '#desktop') {
    	screen.orientation.lock('landscape');
		}
  }

  constructor(width, height, framerate, video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.isFullScreen = false;
    this.isStreaming = false;
    this.width = width;
    this.height = height;
		this.framerate = framerate;
		this.brightPx = [];
	}

	start() {
		const self = this;

    // initialize the canvas for drawing
    this.video.addEventListener('canplay', function(e) {
      if (!self.isStreaming) {
        // videoWidth isn't always set correctly in all browsers
        if (self.video.videoWidth > 0) {
          const ratio = self.video.videoWidth / self.width;
          self.height = self.video.videoHeight / ratio;
        }
        self.canvas.setAttribute('width', self.width);
        self.canvas.setAttribute('height', self.height);
        // Reverse the canvas image
				if (document.location.hash === '#desktop') {
        	self.ctx.translate(self.width, 0);
        	self.ctx.scale(-1, 1);
				}
        self.isStreaming = true;
      }
    }, false);

    // set up the drawing loop
    this.video.addEventListener('play', function() {
      // Every n milliseconds copy the video image to the canvas
      setInterval(function() {
        if (self.video.paused || self.video.ended) return;
        const start = +new Date();

        self.ctx.fillRect(0, 0, self.width, self.height);
        self.ctx.drawImage(self.video, 0, 0, self.width, self.height);

        self.processFrame();

        const duration = +new Date() - start;
        self.ctx.fillText(duration + 'ms', 50, 50);
      }, 1000 / self.framerate);
    }, false);
  }

  processFrame() {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    if (Math.random() < 0.5) {
      this.brightPx = [];
      for (let i = 0; i < data.length; i += 4) {
        const bright = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
        if (bright > 220) { 
          this.brightPx.push(i);
        }
      }
    }
    for (let i = 0; i < this.brightPx.length; i++) {
      data[this.brightPx[i]] = 0;
      data[this.brightPx[i] + 1] = 0;
      data[this.brightPx[i] + 2] = 0;
    }
    this.ctx.putImageData(imageData, 0, 0);
  }
}

window.addEventListener('DOMContentLoaded', Stick.init);
