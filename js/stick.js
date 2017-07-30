class Stick {
  static init() {
    const stick = new Stick(
      1280,
      720,
      15,
      document.querySelector('video'),
      document.getElementById('compute'),
      document.getElementById('game')
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
        stick.game.start();
      }
    });
    if (document.location.hash !== '#desktop') {
      screen.orientation.lock('landscape');
    }
  }

  constructor(width, height, framerate, video, computeCanvas, gameCanvas) {
    this.sampleRate = 0.25;
    this.video = video;
    this.computeCanvas = computeCanvas;
    this.gameCanvas = gameCanvas;
    this.computeCtx = this.computeCanvas.getContext('2d');
    this.gameCtx = this.gameCanvas.getContext('2d');
    this.isFullScreen = false;
    this.isStreaming = false;
    this.width = width;
    this.height = height;
    this.framerate = framerate;
    this.region = false;
    this.totalTime = 0;
    this.totalFrames = 0;
    this.game = new Game(
      this.width, this.height,
      this.gameCanvas, this.gameCtx
    );
  }

  start() {
    const self = this;

    // initialize the canvas for drawing
    this.video.addEventListener('canplay', function(e) {
      if (!self.isStreaming) {
        // videoWidth isn't always set correctly in all browsers
        if (self.video.videoWidth > 0) {
          const ratio = self.video.videoWidth / self.width;
          // self.height = self.video.videoHeight / ratio;
        }
        self.computeCanvas.setAttribute('width', self.width*self.sampleRate);
        self.computeCanvas.setAttribute('height', self.height*self.sampleRate);
        self.gameCanvas.setAttribute('width', self.width);
        self.gameCanvas.setAttribute('height', self.height);
        self.isStreaming = true;
      }
    }, false);

    // set up the drawing loop
    this.video.addEventListener('play', function() {
      // Every n milliseconds copy the video image to the canvas
      setInterval(function() {
        if (self.video.paused || self.video.ended) return;
        const start = +new Date();

        self.computeCtx.fillRect(
          0, 0,
          self.width/self.sampleRate, self.height
        );
        self.computeCtx.drawImage(
          self.video, 0, 0,
          self.width*self.sampleRate, self.height*self.sampleRate
        );
        self.gameCtx.fillRect(0, 0, self.width, self.height);
        self.gameCtx.drawImage(self.video, 0, 0, self.width, self.height);

        self.processFrame();

        const duration = +new Date() - start;
        const fontSize = 32;
        self.gameCtx.font = fontSize + 'px Arial';
        self.gameCtx.fillStyle = 'black';
        self.gameCtx.fillText(duration + 'ms', 10, fontSize);
        self.totalTime += duration;
        self.totalFrames += 1;
        if (self.totalFrames % (5 * self.framerate) === 0) {
          console.log('Avg ' + (self.totalTime/self.totalFrames) + 'ms/frame');
        }
      }, 1000 / self.framerate);
    }, false);
  }

  processFrame() {
    const computeData = this.computeCtx.getImageData(
      0, 0,
      this.width*this.sampleRate, this.height*this.sampleRate
    );

    const candidateRegion = this.getBestSquare(computeData);
    const maxStale = 2;
    if (candidateRegion) {
      this.region = candidateRegion;
    } else if (this.region && (this.region.stale || 0) < maxStale) {
       this.region.stale = (this.region.stale || 0) + 1;
    } else {
      this.region = false;
    }
    
    this.renderGame();
  }

  getBestSquare(imageData) {
    const self = this;
    const data = imageData.data;
    const threshold = 530;
    const newData = new ImageData(imageData.width, imageData.height);
    for (let i = 0; i < data.length; i += 4) {
      const bright = data[i] + data[i + 1] + data[i + 2];
      if (bright > threshold) {
        newData.data[i] = 255;
      } else {
        newData.data[i] = 0;
      }
    }

    // get all the square blobs
    const blobs = StickARUtils.detectBlobs(newData);
    const squareBlobs = Object.keys(blobs).map(key => {
      return StickARUtils.isSquare(
        self.width * self.sampleRate,
        self.height * self.sampleRate,
        blobs[key], 
        (this.region || {}).corners
      );
    }).filter(a => a);

    // find the best square blob
    let bestSquare = false;
    squareBlobs.forEach(b => {
      if (!bestSquare || bestSquare.score < b.score) {
        bestSquare = b;
      }
    });

    return bestSquare;
  }

  renderGame() {
    if (!this.region) return;

    const self = this;

    this.game.render(this.region.corners.map(c => {
      const x = c[0] / self.sampleRate;
      const y = c[1] / self.sampleRate;
      return [x, y];
    }));
  }
}

window.addEventListener('DOMContentLoaded', Stick.init);
