class Stick {
  static init() {
    const stick = new Stick(
      600,
      420,
      15,
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
        if (document.location.hash !== '#desktop') {
          StickARUtils.forceFullScreen();
        }
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
    this.region = false;
    this.totalTime = 0;
    this.totalFrames = 0;
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
        self.ctx.fillStyle = 'black';
        self.ctx.fillText(duration + 'ms', 10, 10);
        self.totalTime += duration;
        self.totalFrames += 1;
        if (self.totalFrames % self.framerate === 0) {
          console.log('Avg ' + (self.totalTime/self.totalFrames) + 'ms/frame');
        }
      }, 1000 / self.framerate);
    }, false);
  }

  processFrame() {
    const self = this;
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    const threshold = 0.34 * 210 + 0.5 * 210 + 0.16 * 210;
    if (Math.random() < 0.5) {
      this.region = false;
      const newData = new ImageData(this.width, this.height);
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 0];
        const b = data[i + 1];
        const c = data[i + 2];
        const bright = 0.34 * a + 0.5 * b + 0.16 * c;
        if (bright > threshold) { 
          newData.data[i + 0] = 255;
        } else {
          newData.data[i + 0] = 0;
        }
      }

      // get all the square blobs
      const blobs = StickARUtils.detectBlobs(newData);
      const squareBlobs = Object.keys(blobs).map(key => {
        return StickARUtils.isSquare(self.width, self.height, blobs[key]);
      }).filter(a => a);

      // find the best square blob
      let bestSquare = false;
      squareBlobs.forEach(b => {
        if (!bestSquare || bestSquare.indices.length < b.indices.length) {
          bestSquare = b;
        }
      });

      if (bestSquare) {
        this.region = bestSquare;
      }
    }

    if (this.region) {
      // draw the special pixels
      this.region.indices.forEach(i => {
        data[4 * i] = 255;
        data[4 * i + 1] = 0;
        data[4 * i + 2] = 0;
      });
      this.ctx.putImageData(imageData, 0, 0);

      // annotate the image with corner and edge information
      this.region.corners.forEach(c => {
        self.ctx.fillStyle = 'rgb(0, 255, 0)'
        self.ctx.beginPath()
        self.ctx.arc(c[0], c[1], 4, 0, 2 * Math.PI, true)
        self.ctx.closePath()
        self.ctx.fill()
      });
      this.region.edges.forEach(i => {
        const x = i % self.width;
        const y = Math.floor(i / self.width);
        self.ctx.fillStyle = 'rgb(0, 255, 255)'
        self.ctx.beginPath()
        self.ctx.arc(x, y, 2, 0, 2 * Math.PI, true)
        self.ctx.closePath()
        self.ctx.fill()
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', Stick.init);
