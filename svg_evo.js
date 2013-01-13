var paintingBaseSize, testScale, weightMin, radialSort, costScoreRatio, alphaMin, alphaMax, pointsMin, generationKeep, generationMutate, generationCross, generationNumber, cumulativeTime, storageKey, imageSource, target, targetData, weightMap, showIndex, lastShownIndex, paintingWidth, paintingHeight, paintings, survivorBoxes, mutantBoxes, crossBoxes, attempts, successes, onSvgImproved, onGenerationComplete, onScalePaintings, attempted, attempt, failure, success, between, betweenHigh, randomByte, randomPainting, randomSign, clamp, plusOrMinus, setText, diffPoint, stringifier, reviver, Point, Color, Painting, Shape, Path, mutate, crossover, breed, generateWeightMap, generateEdgeMap, generateHistoMap, resetStats, restart, createBox, scaleBox, scalePaintings;
paintingBaseSize = 100;
testScale = 1;
weightMin = 0.02;
radialSort = true;
costScoreRatio = 200;
alphaMin = 30;
alphaMax = 60;
pointsMin = 6;
generationKeep = 4;
generationMutate = 16;
generationCross = 1;
generationNumber = 0;
cumulativeTime = 0;
storageKey = 'paintings';
imageSource = null;
target = null;
targetData = null;
weightMap = null;
showIndex = 0;
lastShownIndex = -1;
paintingWidth = paintingBaseSize;
paintingHeight = paintingBaseSize;
paintings = [];
survivorBoxes = [];
mutantBoxes = [];
crossBoxes = [];
attempts = {};
successes = {};
onSvgImproved = function(){};
onGenerationComplete = function(){};
onScalePaintings = function(){};
attempted = [];
attempt = function(type){
  attempts[type] = (attempts[type] || 0) + 1;
  attempted.push(type);
};
failure = function(){
  attempted = [];
};
success = function(){
  var i$, ref$, len$, type;
  for (i$ = 0, len$ = (ref$ = attempted).length; i$ < len$; ++i$) {
    type = ref$[i$];
    successes[type] = (successes[type] || 0) + 1;
  }
  attempted = [];
};
between = function(min, max){
  return Math.floor(Math.random() * (max - min + 1) + min);
};
betweenHigh = function(min, max){
  return Math.floor(Math.sin(Math.random() * Math.PI / 2) * (max - min + 1) + min);
};
randomByte = function(){
  return between(0, 255);
};
randomPainting = function(){
  return between(0, paintings.length - 1);
};
randomSign = function(){
  if (Math.random() < 0.5) {
    return -1;
  } else {
    return 1;
  }
};
clamp = function(min, n, max){
  if (n < min) {
    return min;
  } else if (n > max) {
    return max;
  } else {
    return n;
  }
};
plusOrMinus = function(min, max){
  return randomSign() * between(max, min);
};
setText = function(element, text){
  return element.innerText = element.textContent = text;
};
diffPoint = function(d, x1, y1, x2, y2){
  var b1, b2, dr, dg, db;
  b1 = (x1 + y1 * target.width) * 4;
  b2 = (x2 + y2 * target.width) * 4;
  dr = d[b1++] - d[b2++];
  dg = d[b1++] - d[b2++];
  db = d[b1++] - d[b2++];
  return Math.sqrt((dr * dr + dg * dg + db * db) / 0x30000);
};
stringifier = function(key, val){
  if (val && typeof val === 'object') {
    val._ = val.constructor.name;
  }
  if (key === 'canvas') {
    return void 8;
  }
  return val;
};
reviver = function(key, val){
  if (val && val._) {
    val.constructor = window[val._];
    val.__proto__ = val.constructor.prototype;
  }
  return val;
};
Point = (function(){
  Point.displayName = 'Point';
  var prototype = Point.prototype, constructor = Point;
  function Point(x, y){
    this.x = x != null
      ? x
      : between(0, paintingWidth - 1);
    this.y = y != null
      ? y
      : between(0, paintingHeight - 1);
  }
  prototype.mutate = function(){
    var dx, dy;
    dx = between(-2, +2);
    dy = between(-2, +2);
    return new Point(this.x + dx, this.y + dy);
  };
  prototype.angle = function(p){
    return (Math.atan2(this.y - p.y, this.x - p.x) + 2 * Math.PI) % (2 * Math.PI);
  };
  prototype.svg = function(){
    return this.x + ',' + this.y;
  };
  return Point;
}());
Color = (function(){
  Color.displayName = 'Color';
  var prototype = Color.prototype, constructor = Color;
  function Color(r, g, b, a){
    this.r = r != null
      ? r
      : randomByte();
    this.g = g != null
      ? g
      : randomByte();
    this.b = b != null
      ? b
      : randomByte();
    this.a = a != null
      ? a
      : between(alphaMin, alphaMax);
    this.setFillStyle();
  }
  prototype.setFillStyle = function(){
    return this.fillStyle = 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a / 100 + ')';
  };
  prototype.mutate = function(){
    var child;
    child = new Color(this.r, this.g, this.b, this.a);
    switch (between(1, 4)) {
    case 1:
      child.r = clamp(0, this.r + plusOrMinus(1, 16), 255);
      attempt('rgb');
      break;
    case 2:
      child.g = clamp(0, this.g + plusOrMinus(1, 16), 255);
      attempt('rgb');
      break;
    case 3:
      child.b = clamp(0, this.b + plusOrMinus(1, 16), 255);
      attempt('rgb');
      break;
    case 4:
      child.a = clamp(alphaMin, this.a + plusOrMinus(1, 5), alphaMax);
      attempt('alpha');
    }
    child.setFillStyle();
    return child;
  };
  return Color;
}());
Painting = (function(){
  Painting.displayName = 'Painting';
  var prototype = Painting.prototype, constructor = Painting;
  function Painting(shapes){
    this.shapes = shapes != null
      ? shapes
      : [new Shape()];
    this.score = 1 / 0;
  }
  prototype.paint = function(canvas, opaque){
    var ctx, i$, ref$, len$, shape;
    ctx = canvas.getContext('2d');
    if (opaque) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, paintingWidth, paintingHeight);
    } else {
      ctx.clearRect(0, 0, paintingWidth, paintingHeight);
    }
    for (i$ = 0, len$ = (ref$ = this.shapes).length; i$ < len$; ++i$) {
      shape = ref$[i$];
      shape.paint(ctx);
    }
  };
  prototype.show = function(box){
    var canvas, label;
    canvas = box.children[0];
    if (this.canvas !== canvas) {
      this.paint(canvas, true);
      this.diffScore(canvas);
      this.canvas = canvas;
    }
    if (this.age) {
      label = 'Score: ' + Math.floor(this.score) + ' Age: ' + this.age;
      return setText(box.children[1], label);
    }
  };
  prototype.diffScore = function(canvas){
    var ctx, score, data, w, i, db, dg, dr;
    ctx = canvas.getContext('2d');
    score = 0;
    data = ctx.getImageData(0, 0, target.width, target.height).data;
    w = weightMap.length;
    i = data.length;
    while (i) {
      --i;
      db = data[--i] - targetData[i];
      dg = data[--i] - targetData[i];
      dr = data[--i] - targetData[i];
      score += (dr * dr + dg * dg + db * db) * weightMap[--w];
    }
    return this.score = (score + this.cost() * costScoreRatio) / (target.width * target.height);
  };
  prototype.paintDiffMap = function(canvas){
    var ctx, testData, diffData, ddd, i;
    this.paint(canvas);
    ctx = canvas.getContext('2d');
    testData = ctx.getImageData(0, 0, target.width, target.height).data;
    diffData = ctx.createImageData(target.width, target.height);
    ddd = diffData.data;
    i = ddd.length;
    while (i) {
      ddd[--i] = 255;
      ddd[--i] = Math.abs(testData[i] - targetData[i]);
      ddd[--i] = Math.abs(testData[i] - targetData[i]);
      ddd[--i] = Math.abs(testData[i] - targetData[i]);
    }
    return ctx.putImageData(diffData, 0, 0);
  };
  prototype.mutate = function(){
    var child, roll, i, tmp;
    child = new Painting(this.shapes.slice(0));
    roll = between(0, 99);
    if (roll < 1 && this.shapes.length > 1) {
      attempt('remove-shape');
      i = betweenHigh(0, this.shapes.length - 1);
      child.shapes.splice(i, 1);
    } else if (roll < 2) {
      attempt('add-shape');
      child.shapes.push(new Shape());
    } else if (roll < 5 && this.shapes.length >= 2) {
      attempt('reorder-shapes');
      i = betweenHigh(0, this.shapes.length - 2);
      tmp = this.shapes[i];
      child.shapes[i] = this.shapes[i + 1];
      child.shapes[i + 1] = tmp;
    } else {
      i = betweenHigh(0, this.shapes.length - 1);
      child.shapes[i] = this.shapes[i].mutate();
    }
    return child;
  };
  prototype.cross = function(other){
    var len, i, j, shapes;
    len = Math.min(this.shapes.length, other.shapes.length);
    i = between(1, len - 2);
    j = between(i + 1, len - 1);
    shapes = this.shapes.slice(0, i).concat(other.shapes.slice(i, j)).concat(this.shapes.slice(j));
    attempt('crossover');
    return new Painting(shapes);
  };
  prototype.svg = function(){
    var w, h, i, shape;
    w = paintingWidth;
    h = paintingHeight;
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + w * 10 + "px' height='" + h * 10 + "px' " + "viewBox='0 0 " + w + " " + paintingHeight + "'>" + "<title>" + "Generated by SVG Evo at http://svachalek.github.com/svg_evo" + "</title>" + "<desc>" + "Original image: " + storageKey + "</desc>" + "<defs>" + "<clipPath id='clip'>" + "<path d='M-1,-1L" + (w + 1) + ",-1L" + (w + 1) + "," + (h + 1) + "L-1," + (h + 1) + "Z'/>" + "</clipPath>" + "</defs>" + "<g clip-path='url(#clip)'>" + (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = this.shapes).length; i$ < len$; ++i$) {
        i = i$;
        shape = ref$[i$];
        results$.push(shape.svg(i));
      }
      return results$;
    }.call(this)).join('') + "</g>" + "</svg>";
  };
  prototype.cost = function(){
    var shape;
    return (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = this.shapes).length; i$ < len$; ++i$) {
        shape = ref$[i$];
        results$.push(shape.cost());
      }
      return results$;
    }.call(this)).reduce(function(a, b){
      return a + b;
    });
  };
  return Painting;
}());
Shape = (function(){
  Shape.displayName = 'Shape';
  var prototype = Shape.prototype, constructor = Shape;
  function Shape(color, path){
    this.color = color != null
      ? color
      : new Color();
    this.path = path != null
      ? path
      : new Path();
  }
  prototype.paint = function(ctx){
    ctx.fillStyle = this.color.fillStyle;
    ctx.beginPath();
    this.path.paint(ctx);
    ctx.fill();
  };
  prototype.mutate = function(){
    var roll, child;
    roll = between(0, 5);
    child = new Shape(this.color, this.path);
    if (roll > 0) {
      child.path = this.path.mutate();
    } else {
      child.color = this.color.mutate();
    }
    return child;
  };
  prototype.svg = function(gradientId){
    return "<path fill='" + this.color.fillStyle + "' d='" + this.path.svg() + "'/>";
  };
  prototype.cost = function(){
    return this.path.cost() + 4;
  };
  return Shape;
}());
Path = (function(){
  Path.displayName = 'Path';
  var prototype = Path.prototype, constructor = Path;
  function Path(points, center){
    this.points = points != null
      ? points
      : [];
    this.center = center != null
      ? center
      : new Point();
    if (this.points.length < pointsMin) {
      while (this.points.length < pointsMin) {
        this.points.push(this.center.mutate());
      }
      this.sort();
    }
  }
  prototype.paint = function(ctx){
    var first, i, len, control, point;
    first = this.points[0];
    ctx.moveTo(first.x, first.y);
    i = 1;
    len = this.points.length;
    while (i <= len) {
      control = this.points[i++];
      point = this.points[i++ % len];
      ctx.quadraticCurveTo(control.x, control.y, point.x, point.y);
    }
  };
  prototype.sort = function(){
    var this$ = this;
    if (radialSort) {
      this.points.sort(function(a, b){
        return a.angle(this$.center) - b.angle(this$.center);
      });
    }
  };
  prototype.mutate = function(){
    var roll, child, i, p;
    roll = between(0, 9);
    child = new Path(this.points.slice(0), this.center);
    if (roll < 7) {
      i = between(0, child.points.length - 1);
      child.points[i] = child.points[i].mutate();
      child.sort();
      attempt('move-point');
    } else if (roll < 8 && this.points.length >= pointsMin + 2) {
      i = between(0, child.points.length / 2 - 1);
      child.points.splice(i * 2, 1);
      if (i === 0) {
        child.points.pop();
      } else {
        child.points.splice(i * 2 - 1, 1);
      }
      attempt('remove-point');
    } else if (roll < 9) {
      child.center = child.center.mutate();
      child.sort();
      attempt('move-center');
    } else {
      p = new Point();
      child.points.push(p);
      child.points.push(p.mutate());
      child.sort();
      attempt('add-point');
    }
    return child;
  };
  prototype.svg = function(){
    var first, svg, i, len, control, point;
    first = this.points[0];
    svg = 'M' + first.svg();
    i = 1;
    len = this.points.length;
    while (i <= len) {
      control = this.points[i++];
      point = this.points[i++ % len];
      svg += 'Q' + control.svg() + ' ' + point.svg();
    }
    return svg;
  };
  prototype.cost = function(){
    return this.points.length * 2;
  };
  return Path;
}());
mutate = function(){
  var mutationRate, i$, ref$, len$, i, n, child, mom, j;
  mutationRate = Math.max(1, 5 - Math.floor(Math.log(generationNumber) / Math.LN10));
  for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
    i = ref$[i$];
    n = i % paintings.length;
    child = mom = paintings[n];
    j = mutationRate;
    while (j--) {
      child = child.mutate();
    }
    child.show(mutantBoxes[i]);
    if (child.score < mom.score) {
      paintings[n] = child;
      success();
    } else {
      failure();
    }
  }
  function fn$(){
    var i$, to$, results$ = [];
    for (i$ = 0, to$ = generationMutate - 1; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
};
crossover = function(){
  var i$, ref$, len$, i, m, d, mom, dad, child;
  for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
    i = ref$[i$];
    m = randomPainting();
    d = randomPainting();
    while (m === d) {
      d = randomPainting();
    }
    mom = paintings[m];
    dad = paintings[d];
    child = mom.cross(dad);
    child.show(crossBoxes[i]);
    if (child.score < mom.score && child.score < dad.score) {
      paintings[mom.score < dad.score ? d : m] = child;
      success();
    } else {
      failure();
    }
  }
  function fn$(){
    var i$, to$, results$ = [];
    for (i$ = 0, to$ = generationCross - 1; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
};
breed = function(){
  var startTime, previousPaintings;
  startTime = Date.now();
  ++generationNumber;
  previousPaintings = paintings.slice(0);
  mutate();
  crossover();
  cumulativeTime = cumulativeTime + Date.now() - startTime;
  if (showIndex !== lastShownIndex || paintings[showIndex] !== previousPaintings[showIndex]) {
    lastShownIndex = showIndex;
    onSvgImproved();
  }
  onGenerationComplete();
  if (generationNumber % 100 === 0) {
    sessionStorage.setItem(storageKey, JSON.stringify(paintings, stringifier));
  }
  setTimeout(breed, 0);
};
generateWeightMap = function(){
  var edgeMap, histoMap, i;
  edgeMap = generateEdgeMap();
  histoMap = generateHistoMap();
  i = edgeMap.length;
  weightMap = new Array(i);
  while (i--) {
    weightMap[i] = clamp(weightMin, edgeMap[i] + histoMap[i], 1);
  }
};
generateEdgeMap = function(){
  var edgeMap, i, y, x, u, l, r, d, edge;
  edgeMap = new Array(target.height * target.width);
  i = edgeMap.length;
  y = target.height;
  while (y--) {
    x = target.width;
    while (x--) {
      u = Math.max(y - 1, 0);
      l = Math.max(x - 1, 0);
      r = Math.min(x + 1, target.width - 1);
      d = Math.min(y + 1, target.height - 1);
      edge = diffPoint(targetData, x, y, l, u) + diffPoint(targetData, x, y, x, u) + diffPoint(targetData, x, y, r, u) + diffPoint(targetData, x, y, l, y) + diffPoint(targetData, x, y, r, y) + diffPoint(targetData, x, y, l, d) + diffPoint(targetData, x, y, x, d) + diffPoint(targetData, x, y, r, d);
      edgeMap[--i] = clamp(0, edge / 4, 1);
    }
  }
  return edgeMap;
};
generateHistoMap = function(){
  var histogram, i, max, a, b, g, r, color, histoMap, rarity;
  histogram = [];
  i = targetData.length;
  max = 0;
  while (i) {
    a = targetData[--i];
    b = targetData[--i];
    g = targetData[--i];
    r = targetData[--i];
    color = (r >> 5) << 6 | (g >> 5) << 3 | b >> 5;
    histogram[color] = (histogram[color] || 0) + 1;
    if (histogram[color] > max) {
      max = histogram[color];
    }
  }
  histoMap = new Array(targetData.length / 4);
  i = targetData.length;
  while (i) {
    a = targetData[--i];
    b = targetData[--i];
    g = targetData[--i];
    r = targetData[--i];
    color = (r >> 5) << 6 | (g >> 5) << 3 | b >> 5;
    rarity = histogram[color] / (target.width * target.height) * histogram.length;
    histoMap[i / 4] = clamp(0, 1 - rarity, 1);
  }
  return histoMap;
};
resetStats = function(){
  cumulativeTime = 0;
  generationNumber = 0;
  attempts = {};
  return successes = {};
};
restart = function(){
  var n;
  resetStats();
  return paintings = (function(){
    var i$, ref$, len$, results$ = [];
    for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
      n = ref$[i$];
      results$.push(new Painting());
    }
    return results$;
    function fn$(){
      var i$, to$, results$ = [];
      for (i$ = 1, to$ = generationKeep; i$ <= to$; ++i$) {
        results$.push(i$);
      }
      return results$;
    }
  }());
};
createBox = function(cls, text){
  var canvas, box, label;
  canvas = document.createElement('canvas');
  box = document.createElement('div');
  label = document.createElement('p');
  box.className = 'box ' + cls;
  box.appendChild(canvas);
  box.appendChild(label);
  setText(label, text);
  return box;
};
scaleBox = function(box){
  var canvas;
  canvas = box.children[0];
  canvas.width = target.width;
  canvas.height = target.height;
  return canvas.getContext('2d').setTransform(canvas.width / paintingWidth, 0, 0, canvas.height / paintingHeight, 0, 0);
};
scalePaintings = function(){
  var ctx, i$, ref$, len$, box;
  if (imageSource.width > imageSource.height) {
    paintingWidth = Math.floor(imageSource.width / imageSource.height * paintingBaseSize);
    paintingHeight = paintingBaseSize;
  } else {
    paintingHeight = Math.floor(imageSource.height / imageSource.width * paintingBaseSize);
    paintingWidth = paintingBaseSize;
  }
  target.width = paintingWidth * testScale;
  target.height = paintingHeight * testScale;
  ctx = target.getContext('2d');
  ctx.drawImage(imageSource, 0, 0, target.width, target.height);
  targetData = ctx.getImageData(0, 0, target.width, target.height).data;
  generateWeightMap();
  for (i$ = 0, len$ = (ref$ = survivorBoxes.concat(mutantBoxes).concat(crossBoxes)).length; i$ < len$; ++i$) {
    box = ref$[i$];
    scaleBox(box);
  }
  return onScalePaintings();
};
window.addEventListener('load', function(){
  var boxesElement, i, i$, ref$, len$, n, box;
  boxesElement = document.getElementById('boxes');
  target = document.getElementById('target');
  i = 0;
  for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    box = createBox('survivor', 'Survivor');
    boxesElement.appendChild(box);
    survivorBoxes.push(box);
    box.dataIndex = n - 1;
    box.addEventListener('click', fn1$);
  }
  for (i$ = 0, len$ = (ref$ = (fn2$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    box = createBox('mutant', 'Mutation');
    boxesElement.appendChild(box);
    mutantBoxes.push(box);
  }
  for (i$ = 0, len$ = (ref$ = (fn3$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    box = createBox('crossover', 'Crossover');
    boxesElement.appendChild(box);
    crossBoxes.push(box);
  }
  imageSource = new Image();
  imageSource.addEventListener('load', function(){
    scalePaintings();
    if (window.__proto__ && sessionStorage.getItem(storageKey)) {
      paintings = JSON.parse(sessionStorage.getItem(storageKey), reviver).concat(paintings).slice(0, generationKeep);
      resetStats();
    } else {
      restart();
    }
    setTimeout(breed, 0);
  });
  function fn$(){
    var i$, to$, results$ = [];
    for (i$ = 1, to$ = generationKeep; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
  function fn1$(){
    showIndex = this.dataIndex;
  }
  function fn2$(){
    var i$, to$, results$ = [];
    for (i$ = 1, to$ = generationMutate; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
  function fn3$(){
    var i$, to$, results$ = [];
    for (i$ = 1, to$ = generationCross; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
});