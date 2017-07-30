class StickARUtils {
  static forceFullScreen() {
    const doc = window.document;
    const docEl = doc.documentElement;
    const requestFullScreen = docEl.requestFullscreen
      || docEl.mozRequestFullScreen
      || docEl.webkitRequestFullScreen
      || docEl.msRequestFullscreen;
    if (
      !doc.fullscreenElement &&
      !doc.mozFullScreenElement &&
      !doc.webkitFullscreenElement &&
      !doc.msFullscreenElement
    ) {
      requestFullScreen.call(docEl);
    }
  }

  static registerVideoHandlers(
    width, height, streamCallback, errorCallback
  ) {
    navigator.getUserMedia = navigator.getUserMedia
      || navigator.webkitGetUserMedia
      || navigator.mozGetUserMedia
      || navigator.msGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia(
        {
          video: {
            width: width,
            height: height,
            facingMode: {
              exact: 'environment'
            }
          },
          audio: false,
        },
        streamCallback,
        errorCallback
      )
    } else {
      errorCallback({
        message: 'The browser you are using doesn\'t support getUserMedia'
      });
    }
  }

  // blobs on 0th channel !== 0
  static detectBlobs(imageData) {
    var labels = [];
    for (var i = 0; i < imageData.data.length; i += 4) {
      labels.push(0);
    }
    var val = 1;
    var counter = 0;
    for (var i = 0; i < imageData.data.length/4; i++) {
      if (labels[i] != 0 || imageData.data[4*i] === 0) {
        continue;
      } else {
        var q = [i];
        var ind = 0;
        while (ind < q.length) {
          var cur = q[ind];
          var row = Math.floor(cur / imageData.width)
          var col = cur % imageData.width;
          if (row + 1 < imageData.height) {
            var el = (row + 1) * imageData.width + col;
            if (imageData.data[4 * el] > 0 && labels[el] === 0) {
              labels[el] = val;
              q.push(el);
            }
          }
          if (row - 1 >= 0) {
            var el = (row - 1) * imageData.width + col;
            if (imageData.data[4 * el] > 0 && labels[el] === 0) {
              labels[el] = val;
              q.push(el);
            }
          }
          if (col - 1 >= 0) {
            var el = row * imageData.width + col - 1;
            if (imageData.data[4 * el] > 0 && labels[el] === 0) {
              labels[el] = val;
              q.push(el);
            }
          }
          if (col + 1 < imageData.width) {
            var el = row * imageData.width + col + 1;
            if (imageData.data[4 * el] > 0 && labels[el] === 0) {
              labels[el] = val;
              q.push(el);
            }
          }
          ind++;
        }
        val++;
      }
    }

    return StickARUtils.unique(labels);
  }

  // from http://blog.acipo.com/blob-detection-js/
  static unique(arr) {
    const counts = {};
    for (let i = 0, value = arr[0]; i < arr.length; i++, value = arr[i]) {
      if (value === 0) continue;
      if (counts[value]){
        counts[value].push(i);
      } else {
        counts[value] = [i];
      }
    }
    return counts;
  }

  static isSquare(width, height, indices) {
    const edges = StickARUtils.getEdgePoints(width, height, indices);
    return edges;
  }

  static getEdgePoints(width, height, indices) {
    const set = {};
    indices.map(i => {
      return [i % width, Math.floor(i/width)]
    }).forEach(pair => {
      set[pair[0]] = set[pair[0]] || {};
      set[pair[0]][pair[1]] = true;
    });
    return indices.length > 100 && indices.filter(i => {
      const pos = [i % width, Math.floor(i/width)];
      let neighbors = 0;
      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
          if (x === 0 && y === 0) continue;
          if ((set[pos[0] + x] || {})[pos[1] + y]) neighbors++;
        }
      }
      return neighbors < 6;
    });
  }
}
