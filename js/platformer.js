class Platformer extends GameInterface {
  constructor(handler) {
    super(handler);
    this.state = {
      offset: 0.4,
      speed: 0.03,
      x: 0,
      height: 0,
      vel: 0,
      platformWidth: 0.15,
      platformSpacing: 0.2,
      platformHeight: 0.01,
      platforms: [0, 1, 2, 3, 4, 5].map(this.getPlatformHeight)
    };
  }

  getPlatformHeight() {
    return 0.1 + 0.7 * Math.random();
  }

  onMouseDown(clickData) {
    this.updateState({vel: 0.1});
  }

  advanceState(corners) {
    const newHeight = this.state.height + this.state.vel;
    const g = 0.03;
    this.updateState({
      x: this.state.x + this.state.speed,
      height: Math.max(Math.min(newHeight, 1), 0),
      vel: newHeight < 0 ? 0 : (newHeight > 1 ? 0 : this.state.vel - g)
    });
    const platformCost = this.state.platformWidth + this.state.platformSpacing;
    const platformReach = this.state.platforms.length * platformCost;
    const addNewPlatform = this.state.x + 1 > platformReach;
    if (addNewPlatform) {
      this.updateState({
        platforms: this.state.platforms.concat([this.getPlatformHeight()])
      });
    }
  }

  render(corners) {
    const self = this;

    // draw the corner markers
    const cornerSize = 0.02 * (corners[3][0] - corners[0][0]);
    corners.forEach(c => {
      self.handler.drawPoint(c[0], c[1], cornerSize, 'rgb(255, 0, 0)');
    });

    // draw the player
    const radius = 0.05;
    const ballSize = radius * (corners[3][0] - corners[0][0]);
    const p = Game.project([
      this.state.offset,
      1 - this.state.height + radius
    ], corners);
    this.handler.drawPoint(p[0], p[1], ballSize, 'rgb(90, 80, 88)');

    // draw the platforms
    const platformCost = this.state.platformWidth + this.state.platformSpacing;
    const beginningIndex = Math.ceil(this.state.x/platformCost);
    const numToDraw = Math.ceil(1 / platformCost) + 1;
    for (let i = beginningIndex; i < beginningIndex + numToDraw; i++) {
      const offset = (platformCost * i) - this.state.x;
      this.drawPlatform(offset, this.state.platforms[i], corners);
    }
  }

  drawPlatform(offsetX, offsetY, corners) {
    this.handler.drawFatSegment(
      corners,
      offsetX, offsetY,
      this.state.platformWidth, this.state.platformHeight,
      'rgb(60, 60, 60)'
    );
  }
}
