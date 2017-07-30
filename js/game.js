class Game {
  constructor(width, height, canvas, ctx) {
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = {
      // ball
      x: 0.5,
      y: 0.5,
      radius: 0.05,
      speed: 0.05,
      angle: Math.random(2 * Math.PI),

      // paddle 1
      paddle1x: 0.1,
      paddle1y: 0.5,
      paddle1vel: 0,

      // paddle 2
      paddle2x: 0.9,
      paddle2y: 0.5,
      paddle2vel: 0,
    };
  }

  start() {
    const self = this;
    function handleUserControlledPaddle(e) {
      const clickData = self.getClickSegments(e);
      if (clickData.segment.left) {
        self.updateState({paddle1vel: -0.07});
      } else if (clickData.segment.right) {
        self.updateState({paddle1vel: 0.07});
      }
    }
    function handleUserControlEnd(e) {
      const clickData = self.getClickSegments(e);
      self.updateState({paddle1vel: 0});
    }
    this.canvas.addEventListener('mousedown', handleUserControlledPaddle);
    this.canvas.addEventListener('touchstart', handleUserControlEnd);
    this.canvas.addEventListener('mouseup', handleUserControlEnd);
    this.canvas.addEventListener('touchend', handleUserControlEnd);
  }

  getClickSegments(e) {
    const rect = this.canvas.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const segment = {};
    if (pos.x < (rect.right - rect.left) / 2) {
      segment.left = true;
    } else {
      segment.right = true;
    }
    if (pos.y < (rect.bottom - rect.top) / 2) {
      segment.top = true;
    } else {
      segment.bottom = true;
    }
    return {pos, segment}
  }

  updateState(newState) {
    this.state = Object.assign({}, this.state, newState);
  }

  render(corners) {
    const self = this;
    this.advanceState();

    // draw the corner markers
    const cornerSize = 0.02 * (corners[3][0] - corners[0][0]);
    corners.forEach(c => {
      self.drawPoint(c[0], c[1], cornerSize, 'rgb(255, 0, 0)');
    });

    // draw the ball
    const ballSize = this.state.radius * (corners[3][0] - corners[0][0]);
    const p = this.project([this.state.x, this.state.y], corners);
    this.drawPoint(p[0], p[1], ballSize, 'rgb(90, 80, 88)');


    // draw the paddles
    this.drawFatSegment(
      corners,
      this.state.paddle1x, this.state.paddle1y, 0.05, 0.15, 'rgb(60, 60, 60)'
    );
    this.drawFatSegment(
      corners,
      this.state.paddle2x, this.state.paddle2y, 0.05, 0.15, 'rgb(60, 60, 60)'
    );
  }

  advanceState() {
    // move the balls
    const radius = this.state.radius;
    const newX = this.state.x + this.state.speed * Math.cos(this.state.angle);
    const newY = this.state.y + this.state.speed * Math.sin(this.state.angle);
    if (
      newX >= radius && newX < 1 - radius &&
      newY >= radius && newY < 1 - radius
    ) {
      this.updateState({
        x: newX,
        y: newY
      });
    } else if (newX < radius || newX >= 1 - radius) {
      this.updateState({
        angle: (3 * Math.PI - this.state.angle) % (2 * Math.PI)
      });
    } else {
      this.updateState({
        angle: (2 * Math.PI - this.state.angle) % (2 * Math.PI)
      });
    }

    // move the paddles
    const newPaddle1Y = this.state.paddle1y + this.state.paddle1vel;
    const newPaddle2Y = this.state.paddle2y + this.state.paddle2vel;
    this.updateState({
      paddle1y: Math.max(Math.min(newPaddle1Y, 1), 0),
      paddle2y: Math.max(Math.min(newPaddle2Y, 1), 0)
    });
  }

  project(point, corners) {
    const x0 = this.projectOnLine(point[0], corners[0], corners[3]);
    const x1 = this.projectOnLine(point[0], corners[1], corners[2]);
    const y0 = this.projectOnLine(point[1], corners[0], corners[1]);
    const y1 = this.projectOnLine(point[1], corners[3], corners[2]);
    return this.intersect([x0, x1], [y0, y1]);
  }

  projectOnLine(value, p, q) {
    return [
      value * q[0] + (1 - value) * p[0],
      value * q[1] + (1 - value) * p[1],
    ];
  }

  intersect(a, b) {
    const x1 = a[0][0], y1 = a[0][1], x2 = a[1][0], y2 = a[1][1];
    const x3 = b[0][0], y3 = b[0][1], x4 = b[1][0], y4 = b[1][1];
    const denom = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    const xNum = (x1*y2-y1*x2)*(x3-x4) - (x1-x2)*(x3*y4-y3*x4);
    const yNum = (x1*y2-y1*x2)*(y3-y4) - (y1-y2)*(x3*y4-y3*x4);
    return [xNum/denom, yNum/denom];
  }

  drawPoint(x, y, r, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, 2 * Math.PI, true);
    this.ctx.closePath();
    this.ctx.fill();
  }

  // x, y are the center
  drawFatSegment(corners, mathX, mathY, width, height, color) {
    const topLeft = this.project([
      mathX - width/2, mathY - height/2
    ], corners);
    const topRight = this.project([
      mathX + width/2, mathY - height/2
    ], corners);
    const bottomLeft = this.project([
      mathX - width/2, mathY + height/2
    ], corners);
    const bottomRight = this.project([
      mathX + width/2, mathY + height/2
    ], corners);
    this.drawPolygon([topLeft, topRight, bottomRight, bottomLeft], color)
  }

  drawPolygon(points, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo.apply(this.ctx, points[0]);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo.apply(this.ctx, points[i]);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }
}
