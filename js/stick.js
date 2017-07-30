class OpticalFlow {
  constructor(options) {
    this.curr_img_pyr = new jsfeat.pyramid_t(3);
    this.prev_img_pyr = new jsfeat.pyramid_t(3);
    this.curr_img_pyr.allocate(640, 480, jsfeat.U8_t|jsfeat.C1_t);
    this.prev_img_pyr.allocate(640, 480, jsfeat.U8_t|jsfeat.C1_t);
    this.point_count = 0;
    this.point_status = new Uint8Array(100);
    this.prev_xy = new Float32Array(100*2);
    this.curr_xy = new Float32Array(100*2);
    this.options = options;
  }

  update(imageData) {
    const _pt_xy = this.prev_xy;
    this.prev_xy = this.curr_xy;
    this.curr_xy = _pt_xy;
    const _pyr = this.prev_img_pyr;
    this.prev_img_pyr = this.curr_img_pyr;
    this.curr_img_pyr = _pyr;

    jsfeat.imgproc.grayscale(
      imageData.data,
			imageData.width,
			imageData.height,
			this.curr_img_pyr.data[0]
    );
    this.curr_img_pyr.build(this.curr_img_pyr.data[0], true);

    jsfeat.optical_flow_lk.track(
      this.prev_img_pyr,
      this.curr_img_pyr,
      this.prev_xy,
      this.curr_xy,
      this.point_count,
      this.options.win_size|0,
      this.options.max_iterations|0,
      this.point_status,
      this.options.epsilon,
      this.options.min_eigen
    );
    this.prune_oflow_points();
  }

  prune_oflow_points() {
    const n = this.point_count;
    for (var i = 0, j = 0; i < n; ++i) {
      if (this.point_status[i] == 1) {
        if (j < i) {
          this.curr_xy[j<<1] = this.curr_xy[i<<1];
          this.curr_xy[(j<<1)+1] = this.curr_xy[(i<<1)+1];
        }
        ++j;
      }
    }
    this.point_count = j;
  }

  addPoint(x, y) {
    this.curr_xy[this.point_count<<1] = x;
    this.curr_xy[(this.point_count<<1)+1] = y;
    this.point_count++;
  }

	clearPoints() {
		this.point_count = 0;
	}
}

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
    this.flow = new OpticalFlow({
      win_size: 30,
      max_iterations: 20,
      epsilon: 0.05,
      min_eigen: 0.005
    });
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
        if (self.totalFrames % (5 * self.framerate) === 0) {
          console.log('Avg ' + (self.totalTime/self.totalFrames) + 'ms/frame');
        }
      }, 1000 / self.framerate);
    }, false);
  }

  processFrame() {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
		const haveEnoughFlowPoints = this.flow.point_count === 4;
		let didOflow = false;
    if (this.region && this.region.score > 0.95 && haveEnoughFlowPoints) {
			console.log('flow shaka gnarl bro');
      this.flow.update(imageData);
			if (this.flow.point_count === 4) {
				this.region.corners = [];
				for (let i = 0; i < this.flow.point_count; i++) {
					this.region.corners.push([
						this.flow.curr_xy[(i << 1)], this.flow.curr_xy[(i << 1) + 1]
					]);
				}
				this.region.corners = StickARUtils.sortCorners(this.region.corners);
				didOflow = true;
			}
    }

		if (!didOflow) {
			console.log('recompute fuck');
			const candidateRegion = this.getBestSquare(imageData);
			const maxStale = 3;
			if (candidateRegion) {
      	this.region = candidateRegion;
			} else if (this.region && (this.region.stale || 0) < maxStale) {
 				this.region.stale = (this.region.stale || 0) + 1;
			} else {
				this.region = false;
			}
			this.flow.clearPoints();
			if (this.region) {
				this.region.corners.forEach(this.flow.addPoint.bind(this.flow));
			}
    }
    this.renderRegion(imageData);
  }

  getBestSquare(imageData) {
    const self = this;
    const data = imageData.data;
    const threshold = 0.34 * 210 + 0.5 * 210 + 0.16 * 210;
    const newData = new ImageData(this.width, this.height);
    for (let i = 0; i < data.length; i += 4) {
      const bright = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
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
      if (!bestSquare || bestSquare.score < b.score) {
        bestSquare = b;
      }
    });

    return bestSquare;
  }

  renderRegion(imageData) {
    if (!this.region) return;

    const self = this;

    // annotate the image with corner information
    this.region.corners.forEach(c => {
      self.ctx.fillStyle = 'rgb(0, 255, 0)'
      self.ctx.beginPath()
      self.ctx.arc(c[0], c[1], 2, 0, 2 * Math.PI, true)
      self.ctx.closePath()
      self.ctx.fill()
    });

    this.region.dumbCorners.forEach(c => {
      self.ctx.fillStyle = 'rgb(0, 255, 0)'
      self.ctx.beginPath()
      self.ctx.arc(c[0], c[1], 2, 0, 2 * Math.PI, true)
      self.ctx.closePath()
      self.ctx.fill()
    });
  }
}

window.addEventListener('DOMContentLoaded', Stick.init);
