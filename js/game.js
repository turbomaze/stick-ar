class Game {
  constructor(width, height, canvas, ctx, GameType) {
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.ctx = ctx;
    this.game = new GameType(this)
  }

  start() {
    const self = this;
    function onMouseDown(e) {
      const clickData = self.getClickSegments(e);
      self.game.onMouseDown(clickData);
    }
    function onMouseUp(e) {
      const clickData = self.getClickSegments(e);
      self.game.onMouseUp(clickData);
    }
    this.canvas.addEventListener('mousedown', onMouseDown);
    this.canvas.addEventListener('touchstart', (e) => {
      onMouseDown(e.changedTouches[0]);
    });
    this.canvas.addEventListener('mouseup', onMouseUp);
    this.canvas.addEventListener('touchend', (e) => {
      onMouseUp(e.changedTouches[0]);
    });
  }

  step(corners, sprite) {
    this.game.advanceState(corners);
    this.game.render(corners, sprite);
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

  static project(point, corners) {
    const x0 = Game.projectOnLine(point[0], corners[0], corners[3]);
    const x1 = Game.projectOnLine(point[0], corners[1], corners[2]);
    const y0 = Game.projectOnLine(point[1], corners[0], corners[1]);
    const y1 = Game.projectOnLine(point[1], corners[3], corners[2]);
    return Game.intersect([x0, x1], [y0, y1]);
  }

  static projectOnLine(value, p, q) {
    return [
      value * q[0] + (1 - value) * p[0],
      value * q[1] + (1 - value) * p[1],
    ];
  }

  static intersect(a, b) {
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

  projectCircle(corners, x, y, r, color) {
    const p = Game.project([x, y], corners);
    const topPoint = Game.project([x, y - r], corners);
    const rightPoint = Game.project([x + r, y], corners);
    const bottomPoint = Game.project([x, y + r], corners);
    const leftPoint = Game.project([x - r, y], corners);
    const angle = Math.atan2(
      bottomPoint[1] - topPoint[1],
      bottomPoint[0] - topPoint[0]
    );
    const rMin = 2 * Math.sqrt(
      Math.pow(bottomPoint[0] - topPoint[0], 2) +
      Math.pow(bottomPoint[1] - topPoint[1], 2)
    ) / 2;
    const rMax = Math.sqrt(
      Math.pow(rightPoint[0] - leftPoint[0], 2) +
      Math.pow(rightPoint[1] - leftPoint[1], 2)
    ) / 2;
    this.drawEllipse(p[0], p[1], rMin, rMax, angle, color);
  }

  drawEllipse(x, y, rMin, rMax, rotation, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, rMin, rMax, rotation, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  // x, y are the center
  drawFatSegment(corners, mathX, mathY, width, height, color) {
    const topLeft = Game.project([
      mathX - width/2, mathY - height/2
    ], corners);
    const topRight = Game.project([
      mathX + width/2, mathY - height/2
    ], corners);
    const bottomLeft = Game.project([
      mathX - width/2, mathY + height/2
    ], corners);
    const bottomRight = Game.project([
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
