class Stick {
  static init() {
    const stick = new Stick(
      1280,
      720,
      15,
      document.querySelector("video"),
      document.getElementById("compute"),
      document.getElementById("game")
    );
    document.getElementById("game").style.display = "none";

    // start the process when they start full screen/landscape
    document.body.addEventListener("click", function() {
      if (!stick.isFullScreen) {
        if (!document.location.hash.startsWith("#desktop")) {
          StickARUtils.forceFullScreen();
        }
        stick.isFullScreen = true;

        // begin the animation sequence that introduces the video
        document.getElementById("welcome").className = "clicked";
        stick.start();
        stick.gameHandler.start();
        document.getElementById("game").style.display = "block";
        setTimeout(() => {
          document.getElementById("welcome").style.display = "none";
        }, 1000);
      } else if (!stick.loadedSprite) {
        // load the sprite
        stick.loadSprite();
      }
    });
    if (!document.location.hash.startsWith("#desktop")) {
      try {
        screen.orientation.lock("landscape");
      } catch (e) {
        console.log("Encountered screen orientation lock error.");
        console.log(e);
      }
    }
  }

  constructor(width, height, framerate, video, computeCanvas, gameCanvas) {
    this.sampleRate = 0.125;
    this.video = video;
    this.computeCanvas = computeCanvas;
    this.gameCanvas = gameCanvas;
    this.computeCtx = this.computeCanvas.getContext("2d");
    this.gameCtx = this.gameCanvas.getContext("2d");
    this.isFullScreen = false;
    this.isStreaming = false;
    this.loadedSprite = false;
    this.width = width;
    this.height = height;
    this.framerate = framerate;
    this.region = false;
    this.totalTime = 0;
    this.totalFrames = 0;
    this.sprite = null;
    this.gameHandler = new Game(
      this.width,
      this.height,
      this.gameCanvas,
      this.gameCtx,
      Platformer
    );
  }

  start() {
    const self = this;

    // initialize the canvas for drawing
    this.video.addEventListener(
      "canplay",
      function(e) {
        if (!self.isStreaming) {
          // videoWidth isn't always set correctly in all browsers
          if (self.video.videoWidth > 0) {
            const ratio = self.video.videoWidth / self.width;
            // this maintains aspect ratio, but messes up full-screen-ness
            // self.height = self.video.videoHeight / ratio;
          }
          self.computeCanvas.setAttribute(
            "width",
            self.width * self.sampleRate
          );
          self.computeCanvas.setAttribute(
            "height",
            self.height * self.sampleRate
          );
          self.gameCanvas.setAttribute("width", self.width);
          self.gameCanvas.setAttribute("height", self.height);
          self.isStreaming = true;
        }
      },
      false
    );

    // set up the drawing loop
    this.video.addEventListener(
      "play",
      function() {
        // Every n milliseconds copy the video image to the canvas
        setInterval(function() {
          if (self.video.paused || self.video.ended) return;
          const start = +new Date();

          self.computeCtx.fillRect(
            0,
            0,
            self.width / self.sampleRate,
            self.height
          );
          self.computeCtx.drawImage(
            self.video,
            0,
            0,
            self.width * self.sampleRate,
            self.height * self.sampleRate
          );
          self.gameCtx.fillRect(0, 0, self.width, self.height);
          self.gameCtx.drawImage(self.video, 0, 0, self.width, self.height);

          self.processFrame();

          const duration = +new Date() - start;
          const fontSize = 32;
          self.gameCtx.font = fontSize + "px Arial";
          self.gameCtx.fillStyle = "black";
          self.gameCtx.fillText(duration + "ms", 10, fontSize);
          self.totalTime += duration;
          self.totalFrames += 1;
          if (self.totalFrames % (5 * self.framerate) === 0) {
            console.log(
              "Avg " + self.totalTime / self.totalFrames + "ms/frame"
            );
          }
        }, 1000 / self.framerate);
      },
      false
    );

    // register all the handlers
    StickARUtils.registerVideoHandlers(
      this.width,
      this.height,
      stream => {
        self.video.srcObject = stream;
        self.video.onloadedmetadata = e => {
          self.video.play();
        };
      },
      err => {
        alert("Something went wrong. (error code " + err.code + ")");
      }
    );
  }

  processFrame() {
    const computeData = this.computeCtx.getImageData(
      0,
      0,
      this.width * this.sampleRate,
      this.height * this.sampleRate
    );

    const candidateRegion = this.getBestSquare(computeData);
    const maxStale = 16;
    if (candidateRegion) {
      this.region = candidateRegion;
    } else if (this.region && (this.region.stale || 0) < maxStale) {
      this.region.stale = (this.region.stale || 0) + 1;
    } else {
      this.region = false;
    }

    const spriteInfo = this.findSprite();
    if (spriteInfo) {
      this.gameCtx.lineWidth = 4;
      this.gameCtx.strokeStyle = "green";
      this.gameCtx.strokeRect(
        spriteInfo.topLeftX,
        spriteInfo.topLeftY,
        spriteInfo.width,
        spriteInfo.height
      );
    }

    if (document.location.hash.indexOf("debug") !== -1) {
      // compute edges
      const gray = new ImageData(computeData.width, computeData.height);
      const xGradient = new ImageData(computeData.width, computeData.height);
      const yGradient = new ImageData(computeData.width, computeData.height);
      const gradient = new ImageData(computeData.width, computeData.height);
      const xKernel = [[1, 0, -1], [2, 0, -2], [1, 0, -1]];
      const yKernel = [[1, 2, 1], [0, 0, 0], [-1, -2, -1]];
      for (let y = 1; y < xGradient.height - 1; y++) {
        for (let x = 1; x < xGradient.width - 1; x++) {
          const index = 4 * (y * xGradient.width + x);
          const brightness = Math.floor(
            0.34 * computeData.data[index] +
              0.5 * computeData.data[index] +
              0.16 * computeData.data[index]
          );
          gray.data[index] = brightness;
          gray.data[index + 1] = brightness;
          gray.data[index + 2] = brightness;
          gray.data[index + 3] = 255;
          xGradient.data[index] = 0;
          yGradient.data[index] = 0;
          let sumX = 0;
          let sumY = 0;
          for (let ny = -1; ny <= 1; ny++) {
            for (let nx = -1; nx <= 1; nx++) {
              const indexGrad = 4 * ((y + ny) * xGradient.width + x + nx);
              sumX += xKernel[ny + 1][nx + 1] * computeData.data[indexGrad];
              sumY += yKernel[ny + 1][nx + 1] * computeData.data[indexGrad];
            }
          }
          const shiftedX = Math.floor(256 * Math.abs(sumX) / 1024);
          const shiftedY = Math.floor(256 * Math.abs(sumY) / 1024);
          xGradient.data[index] = shiftedX;
          xGradient.data[index + 1] = xGradient.data[index];
          xGradient.data[index + 2] = xGradient.data[index];
          xGradient.data[index + 3] = 255;
          yGradient.data[index] = shiftedY;
          yGradient.data[index + 1] = yGradient.data[index];
          yGradient.data[index + 2] = yGradient.data[index];
          yGradient.data[index + 3] = 255;
          gradient.data[index] = xGradient.data[index];
          gradient.data[index + 1] = yGradient.data[index];
          gradient.data[index + 3] = 255;
        }
      }
      this.logComputeDataToCanvas(gray, 1);
      this.logComputeDataToCanvas(xGradient, 2);
      this.logComputeDataToCanvas(yGradient, 3);
      this.logComputeDataToCanvas(gradient, 4);
    }

    this.renderGame();
  }

  logComputeDataToCanvas(imageData, index) {
    this.gameCtx.putImageData(imageData, index * this.computeCanvas.width, 0);
  }

  getBestSquare(imageData) {
    const self = this;
    const data = imageData.data;
    const threshold = 580;
    const newData = new ImageData(imageData.width, imageData.height);
    const doIt = document.location.hash.indexOf("debug") !== -1;
    for (let i = 0; i < data.length; i += 4) {
      const bright = data[i] + data[i + 1] + data[i + 2];
      if (bright > threshold) {
        newData.data[i] = 255;
        newData.data[i + 1] = 255;
        newData.data[i + 2] = 255;
      }
      newData.data[i + 3] = 255;
    }
    if (document.location.hash.indexOf("debug") !== -1) {
      this.logComputeDataToCanvas(newData, 5);
    }

    // get all the square blobs
    const blobs = StickARUtils.detectBlobs(newData);
    const squareBlobs = Object.keys(blobs)
      .map(key => {
        return StickARUtils.isSquare(
          self.width * self.sampleRate,
          self.height * self.sampleRate,
          blobs[key],
          (this.region || {}).corners
        );
      })
      .filter(a => a);

    // find the best square blob
    let bestSquare = false;
    squareBlobs.forEach(b => {
      if (!bestSquare || bestSquare.score < b.score) {
        bestSquare = b;
      }
    });

    return bestSquare;
  }

  findSprite() {
    if (!this.region) return;

    function getSmallerCorners(corners) {
      const total = corners.reduce(
        (a, b) => {
          return [a[0] + b[0], a[1] + b[1]];
        },
        [0, 0]
      );
      const average = [total[0] / 4, total[1] / 4];
      return corners.map(c => {
        return [
          0.9 * c[0] + 0.1 * (average[0] - c[0]),
          0.9 * c[1] + 0.1 * (average[1] - c[1])
        ];
      });
    }

    const self = this;

    // get bounding rectangle of the quadrilateral
    const corners = this.region.corners;
    const maxX = corners.reduce((a, b) => (b[0] > a ? b[0] : a), -1);
    const maxY = corners.reduce((a, b) => (b[1] > a ? b[1] : a), -1);
    const minX = corners.reduce((a, b) => (b[0] < a ? b[0] : a), Infinity);
    const minY = corners.reduce((a, b) => (b[1] < a ? b[1] : a), Infinity);

    // threshold all pixels in the region, omitting those not in region
    const computeData = this.computeCtx.getImageData(
      minX,
      minY,
      maxX - minX,
      maxY - minY
    );
    const data = computeData.data;
    const smallCorners = getSmallerCorners(corners);
    let spriteMaxX = -1;
    let spriteMinX = Infinity;
    let spriteMaxY = -1;
    let spriteMinY = Infinity;
    for (let x = 0; x < computeData.width; x++) {
      for (let y = 0; y < computeData.height; y++) {
        const index = 4 * (y * computeData.width + x);
        if (
          StickARUtils.isInRegion(
            [x, y],
            StickARUtils.sortCorners(smallCorners)
          )
        ) {
          const dist = Math.sqrt(
            Math.pow(data[index] - 96, 2) +
              Math.pow(data[index + 1] - 130, 2) +
              Math.pow(data[index + 2] - 180, 2)
          );
          if (dist < 50) {
            if (x > spriteMaxX) spriteMaxX = x;
            if (x < spriteMinX) spriteMinX = x;
            if (y > spriteMaxY) spriteMaxY = y;
            if (y < spriteMinY) spriteMinY = y;
          } else {
            data[index + 0] = 255;
            data[index + 1] = 255;
            data[index + 2] = 255;
            data[index + 3] = 0;
          }
        } else {
          data[index + 0] = 255;
          data[index + 1] = 255;
          data[index + 2] = 255;
          data[index + 3] = 0;
        }
      }
    }

    return {
      topLeftX: (minX + spriteMinX) / this.sampleRate,
      topLeftY: (minY + spriteMinY) / this.sampleRate,
      width: (spriteMaxX - spriteMinX) / this.sampleRate,
      height: (spriteMaxY - spriteMinY) / this.sampleRate
    };
  }

  loadSprite() {
    if (!this.region) return;

    const spriteInfo = this.findSprite();

    // save this as a sprite to draw later
    if (spriteInfo.topLeftX !== Infinity) {
      this.sprite = this.gameCtx.getImageData(
        spriteInfo.topLeftX,
        spriteInfo.topLeftY,
        spriteInfo.width,
        spriteInfo.height
      );
      for (let x = 0; x < this.sprite.width; x++) {
        for (let y = 0; y < this.sprite.height; y++) {
          const index = 4 * (y * this.sprite.width + x);
          for (let k = 0; k < 3; k++) {
            this.sprite.data[index + k] = Math.min(
              this.sprite.data[index + k] + 13,
              255
            );
          }
        }
      }
    } else {
      this.sprite = false;
    }
    this.loadedSprite = true;
  }

  renderGame() {
    if (!this.region) return;

    const self = this;

    this.gameHandler.step(
      this.region.corners.map(c => {
        const x = c[0] / self.sampleRate;
        const y = c[1] / self.sampleRate;
        return [x, y];
      }),
      this.sprite
    );
  }
}

window.addEventListener("DOMContentLoaded", Stick.init);
