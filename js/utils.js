class StickARUtils {
  static forceFullScreen() {
    const doc = window.document;
    const docEl = doc.documentElement;
    const requestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;
    if (
      !doc.fullscreenElement &&
      !doc.mozFullScreenElement &&
      !doc.webkitFullscreenElement &&
      !doc.msFullscreenElement
    ) {
      requestFullScreen.call(docEl);
    }
  }

  static registerVideoHandlers(width, height, streamCallback, errorCallback) {
    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia(
        {
          video: {
            width: width,
            height: height,
            facingMode: {
              exact: "environment"
            }
          },
          audio: false
        },
        streamCallback,
        errorCallback
      );
    } else {
      errorCallback({
        message: "The browser you are using doesn't support getUserMedia"
      });
    }
  }

  // from https://github.com/turbomaze/reedr/blob/master/js/reedr.js
  // blobs on 0th channel !== 0
  static detectBlobs(imageData) {
    var labels = [];
    for (var i = 0; i < imageData.data.length; i += 4) {
      labels.push(0);
    }
    var val = 1;
    var counter = 0;
    for (var i = 0; i < imageData.data.length / 4; i++) {
      if (labels[i] != 0 || imageData.data[4 * i] === 0) {
        continue;
      } else {
        var q = [i];
        var ind = 0;
        while (ind < q.length) {
          var cur = q[ind];
          var row = Math.floor(cur / imageData.width);
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
      if (counts[value]) {
        counts[value].push(i);
      } else {
        counts[value] = [i];
      }
    }
    return counts;
  }

  static isSquare(width, height, indices, oldCorners) {
    const edges = StickARUtils.getEdgePoints(width, height, indices);
    if (edges.length > 0) {
      const corners = StickARUtils.getBestCorners(width, height, edges);
      const indicesSet = new Set(indices);
      const score = StickARUtils.getSquareScore(
        width,
        height,
        corners,
        indicesSet
      );
      if (oldCorners) {
        var oldScore = StickARUtils.getSquareScore(
          width,
          height,
          oldCorners,
          indicesSet
        );
      }
      const minArea = width * height * (1 / 50);
      if (indices.length > minArea) {
        if (oldCorners && oldScore > 0.8 && oldScore > score) {
          return {
            corners: oldCorners,
            score: oldScore
          };
        } else if (score > 0.8) {
          return { corners, score };
        }
      }
    }
    return false;
  }

  static getSquareScore(width, height, corners, indicesSet) {
    const indicesInRegion = new Set([]);
    const maxX = corners.reduce((a, b) => (b[0] > a ? b[0] : a), -1);
    const maxY = corners.reduce((a, b) => (b[1] > a ? b[1] : a), -1);
    const minX = corners.reduce((a, b) => (b[0] < a ? b[0] : a), Infinity);
    const minY = corners.reduce((a, b) => (b[1] < a ? b[1] : a), Infinity);
    const sampleEvery = 2;
    let numGoodInRegion = 0.000001;
    let numBad = 0;
    for (let x = minX; x <= maxX; x += sampleEvery) {
      for (let y = minY; y <= maxY; y += sampleEvery) {
        const index = y * width + x;
        if (StickARUtils.isInRegion([x, y], corners)) {
          if (indicesSet.has(index)) {
            numGoodInRegion++;
            indicesInRegion.add(index);
          } else {
            numBad++;
          }
        }
      }
    }

    // square because two dimensions
    const adjustedIndicesSize = indicesSet.size / Math.pow(sampleEvery, 2);
    numBad += adjustedIndicesSize - indicesInRegion.size;
    return (numGoodInRegion - numBad) / numGoodInRegion;
  }

  static getEdgePoints(width, height, indices) {
    const set = {};
    indices
      .map(i => {
        return [i % width, Math.floor(i / width)];
      })
      .forEach(pair => {
        set[pair[0]] = set[pair[0]] || {};
        set[pair[0]][pair[1]] = true;
      });
    return indices.length > 50
      ? indices.filter(i => {
          const pos = [i % width, Math.floor(i / width)];
          return (
            !!(set[pos[0] - 1] || {})[pos[1] + 0] +
              !!(set[pos[0] + 1] || {})[pos[1] + 0] +
              !!(set[pos[0]] || {})[pos[1] - 1] +
              !!(set[pos[0]] || {})[pos[1] + 1] <=
            2
          );
        })
      : [];
  }

  static getBestCorners(width, height, indices) {
    // init random 4 points
    const bestPoints = [0, 1, 2, 3].map(() => {
      return StickARUtils.randomPoint(width, height, indices);
    });
    let bestArea = StickARUtils.getArea.apply(null, bestPoints);

    const numRounds = 600;
    for (let i = 0; i < numRounds; i++) {
      // pick new points
      const candidate = StickARUtils.randomPoint(width, height, indices);

      // points to keep
      const keeperA = i % 4;
      const keeperB = (i + 1) % 4;
      const keeperC = (i + 2) % 4;

      // compare
      const candidateArea = StickARUtils.getArea(
        candidate,
        bestPoints[keeperA],
        bestPoints[keeperB],
        bestPoints[keeperC]
      );
      if (candidateArea > bestArea) {
        bestArea = candidateArea;
        bestPoints[(keeperC + 1) % 4] = candidate;
      }
    }
    return StickARUtils.sortCorners(bestPoints);
  }

  // corners sorted counter clockwise top left to top right
  static isInRegion(point, corners) {
    // from https://github.com/substack/point-in-polygon/blob/master/index.js
    var x = point[0],
      y = point[1];
    var inside = false;
    for (var i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      var xi = corners[i][0],
        yi = corners[i][1];
      var xj = corners[j][0],
        yj = corners[j][1];

      var intersect =
        yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  static isAboveLine(point, line) {
    if (line[0][0] === line[1][0]) return point[0] > line[0][0];

    const m = (line[1][1] - line[0][1]) / (line[1][0] - line[0][0]);
    const b = line[0][1] - line[0][0] * m;
    return point[1] > m * point[0] + b;
  }

  static randomPoint(width, height, indices) {
    const index = indices[Math.floor(indices.length * Math.random())];
    return [index % width, Math.floor(index / width)];
  }

  // requires 4 corners
  static sortCorners(corners) {
    const byX = corners.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    if (byX[0][1] > byX[1][1]) {
      const tmp = [byX[0][0], byX[0][1]];
      corners[0] = byX[1];
      corners[1] = tmp;
    }
    if (byX[2][1] < byX[3][1]) {
      const tmp = [byX[2][0], byX[2][1]];
      corners[2] = byX[3];
      corners[3] = tmp;
    }
    return corners;
  }

  static getArea(a, b, c, d) {
    return Math.abs(
      0.5 *
        (a[0] * b[1] +
          b[0] * c[1] +
          c[0] * d[1] +
          d[0] * a[1] -
          b[0] * a[1] -
          c[0] * b[1] -
          d[0] * c[1] -
          a[0] * d[1])
    );
  }
}
