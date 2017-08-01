class Pong extends GameInterface {
  constructor(handler) {
    super(handler);
    this.state = {
      // ball
      x: 0.5,
      y: 0.5,
      radius: 0.03,
      speed: 0.05,
      angle: Math.random(2 * Math.PI),

      // paddle 1
      paddle1x: 0.1,
      paddle1y: 0.5,
      paddle1vel: 0,
      paddleWidth: 0.05,
      paddleHeight: 0.15,

      // paddle 2
      paddle2x: 0.9,
      paddle2y: 0.5,
      paddle2vel: 0
    };
  }

  onMouseDown(clickData) {
    if (clickData.segment.left) {
      this.updateState({ paddle1vel: -0.07 });
    } else if (clickData.segment.right) {
      this.updateState({ paddle1vel: 0.07 });
    }
  }

  onMouseUp(clickData) {
    this.updateState({ paddle1vel: 0 });
  }

  advanceState(corners) {
    // move the balls
    const radius = this.state.radius;
    const newX = this.state.x + this.state.speed * Math.cos(this.state.angle);
    const newY = this.state.y + this.state.speed * Math.sin(this.state.angle);
    if (
      newX >= radius &&
      newX < 1 - radius &&
      newY >= radius &&
      newY < 1 - radius
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

    // paddle 2 AI velocity
    const k = 0.4;
    this.updateState({
      paddle2vel: k * (this.state.y - this.state.paddle2y)
    });

    // move the paddles
    const newPaddle1Y = this.state.paddle1y + this.state.paddle1vel;
    const newPaddle2Y = this.state.paddle2y + this.state.paddle2vel;
    this.updateState({
      paddle1y: Math.max(
        Math.min(newPaddle1Y, 1 - this.state.paddleHeight / 2),
        this.state.paddleHeight / 2
      ),
      paddle2y: Math.max(
        Math.min(newPaddle2Y, 1 - this.state.paddleHeight / 2),
        this.state.paddleHeight / 2
      )
    });
  }

  render(corners, sprite) {
    const self = this;

    // draw the corner markers
    const cornerSize = 0.02 * (corners[3][0] - corners[0][0]);
    corners.forEach(c => {
      self.handler.drawPoint(c[0], c[1], cornerSize, "rgb(255, 0, 0)");
    });

    // draw the ball
    const ballSize = this.state.radius * (corners[3][0] - corners[0][0]);
    const p = Game.project([this.state.x, this.state.y], corners);
    this.handler.drawPoint(p[0], p[1], ballSize, "rgb(90, 80, 88)");

    // draw the paddles
    this.handler.drawFatSegment(
      corners,
      this.state.paddle1x,
      this.state.paddle1y,
      this.state.paddleWidth,
      this.state.paddleHeight,
      "rgb(60, 60, 60)"
    );
    this.handler.drawFatSegment(
      corners,
      this.state.paddle2x,
      this.state.paddle2y,
      this.state.paddleWidth,
      this.state.paddleHeight,
      0.05,
      0.15,
      "rgb(60, 60, 60)"
    );
  }
}
