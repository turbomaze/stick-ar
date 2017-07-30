class Game {
  constructor(width, height, canvas, ctx) {
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = {
      x: 0.5,
      y: 0.5,
      radius: 0.05,
      speed: 0.05,
      angle: Math.random(2 * Math.PI),
    };
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
  }

  advanceState() {
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
}
