class GameInterface {
  constructor(handler) {
    this.handler = handler;
    this.state = {};
  }

  updateState(newState) {
    this.state = Object.assign({}, this.state, newState);
  }

  onMouseDown(clickData) {}
  onMouseUp(clickData) {}
  advanceState(corners) {}
  render(corners) {}
}
