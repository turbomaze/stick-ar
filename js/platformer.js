class Platformer extends GameInterface {
  constructor(handler) {
    super(handler);
    this.state = {
      offset: 0.3,
      speed: 0.03,
      jumpSpeed: 0.15,
      x: 0,
      height: 0,
      vel: 0,
      platformWidth: 0.35,
      platformSpacing: 0.25,
      platformHeight: 0.017,
      platforms: [0, 1, 2, 3, 4, 5].map(this.getPlatformHeight)
    };
  }

  getPlatformHeight() {
    return 0.1 + 0.7 * Math.random();
  }

  onMouseDown(clickData) {
    this.updateState({
      vel: this.state.jumpSpeed,
      jumping: true
    });
  }

  advanceState(corners) {
    const g = 0.03;
    const platformCost = this.state.platformWidth + this.state.platformSpacing;
    const platformReach = this.state.platforms.length * platformCost;
    const beginningIndex = Math.ceil(this.state.x/platformCost);
    const numToCheck = Math.ceil(1 / platformCost) + 1;
    let isOverPlatform = false;
    for (let i = beginningIndex; i < beginningIndex + numToCheck; i++) {
      const platformStart = i * platformCost - this.state.platformWidth/2;
      const playerPosition = this.state.x + this.state.offset;
      if (
        playerPosition > platformStart &&
        playerPosition < platformStart + this.state.platformWidth
      ) {
        isOverPlatform = i;
      }
    }
    const radius = 0.05
    let newHeight = this.state.height + this.state.vel;
    let newVel = newHeight < 0 ? 0 : (newHeight > 1 ? 0 : this.state.vel - g);
    if (isOverPlatform) {
      const bottom = this.state.height - radius;
      const newBottom = newHeight - radius;
      if (
        bottom > 1 - this.state.platforms[isOverPlatform] &&
        newBottom < 1 - this.state.platforms[isOverPlatform] &&
        !this.state.jumping
      ) {
        newHeight = 1 - this.state.platforms[isOverPlatform] + 2.01 * radius
        newVel = 0;
      }
    }
    this.updateState({
      x: this.state.x + this.state.speed,
      height: Math.max(Math.min(newHeight, 1), radius),
      vel: newVel,
      jumping: newVel > 0,
    });
    const addNewPlatform = this.state.x + 1 > platformReach;
    if (addNewPlatform) {
      this.updateState({
        platforms: this.state.platforms.concat([this.getPlatformHeight()])
      });
    }
  }

  render(corners, sprite) {
    const self = this;

    // draw the corner markers
    if (!sprite) {
      const cornerSize = 0.02 * (corners[3][0] - corners[0][0]);
      corners.forEach(c => {
        self.handler.drawPoint(c[0], c[1], cornerSize, 'rgb(255, 0, 0)');
      });
    } else {
      // white out the background
      this.handler.drawPolygon(corners, 'rgb(240, 230, 230)');
    }

    // draw the player
    if (sprite) {
      const desiredRatio = 0.2;
      const newSpriteHeight = (corners[0][1] - corners[1][1]) * desiredRatio;
      const p = Game.project([
        this.state.offset,
        1 - this.state.height - desiredRatio
      ], corners);
      this.handler.ctx.putImageData(sprite, p[0], p[1]);
    } else {
      const ballRadius = 0.05;
      this.handler.projectCircle(
        corners,
        this.state.offset, 1 - this.state.height + ballRadius,
        ballRadius, 'rgb(90, 80, 88)'
      );
    }

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
