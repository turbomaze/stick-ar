class Game {
  constructor(width, height, canvas, ctx) {
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = {
      x: 0.5,
      y: 0.5,
      speed: 0.05,
      angle: Math.random(2 * Math.PI),
    };
  }

  updateState(newState) {
    this.state = Object.assign({}, this.state, newState);
  }

  render(corners) {
    const self = this;
    corners.forEach(c => {
      self.drawPoint(c[0], c[1], 10, 'rgb(255, 0, 0)');
    });
    this.advanceState();

    const x0 = this.project(this.state.x, corners[0], corners[3]);
    const x1 = this.project(this.state.x, corners[1], corners[2]);
    const y0 = this.project(this.state.y, corners[0], corners[1]);
    const y1 = this.project(this.state.y, corners[3], corners[2]);
    const p = this.intersect([x0, x1], [y0, y1]);
    this.drawPoint(p[0], p[1], 15, 'rgb(60, 50, 55)');
  }

  advanceState() {
    const newX = this.state.x + this.state.speed * Math.cos(this.state.angle);
    const newY = this.state.y + this.state.speed * Math.sin(this.state.angle);
    if (newX >= 0 && newX < 1 && newY >= 0 && newY < 1) {
      this.updateState({
        x: newX,
        y: newY
      });
    } else if (newX < 0 || newX >= 1) {
      this.updateState({
        angle: (3 * Math.PI - this.state.angle) % (2 * Math.PI)
      });
    } else {
      this.updateState({
        angle: (2 * Math.PI - this.state.angle) % (2 * Math.PI)
      });
    }
  }

  project(value, p, q) {
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
