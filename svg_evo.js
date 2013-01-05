var paintingBaseSize, costScoreRatio, diffMapSensitivity, weightMin, radialSort, alphaMin, alphaMax, pointsMin, generationKeep, generationMutate, generationCross, generationNumber, cumulativeTime, storageKey, svgId, showIndex, lastShownIndex, paintingWidth, paintingHeight, paintings, survivorBoxes, mutantBoxes, crossBoxes, attempts, successes, attempt, between, betweenHigh, randomByte, randomPainting, randomSign, clamp, plusOrMinus, setText, diffPoint, stringifier, reviver, Point, Color, Painting, Shape, Path, targetData, bestData, mutate, crossover, breed, weightMap, generateWeightMap, generateEdgeMap, generateHistoMap, paintWeightMap, resetStats, restart, createBox;
paintingBaseSize = 100;
costScoreRatio = 0.002;
diffMapSensitivity = 0x4000;
weightMin = 0.02;
radialSort = true;
alphaMin = 30;
alphaMax = 60;
pointsMin = 6;
generationKeep = 4;
generationMutate = 15;
generationCross = 1;
generationNumber = 0;
cumulativeTime = 0;
storageKey = null;
svgId = 0;
showIndex = 0;
lastShownIndex = 0;
paintingWidth = paintingBaseSize;
paintingHeight = paintingBaseSize;
paintings = [];
survivorBoxes = [];
mutantBoxes = [];
crossBoxes = [];
attempts = {};
successes = {};
attempt = function(types, success){
  var i$, len$, type, results$ = [];
  for (i$ = 0, len$ = types.length; i$ < len$; ++i$) {
    type = types[i$];
    attempts[type] = (attempts[type] || 0) + 1;
    if (success) {
      results$.push(successes[type] = (successes[type] || 0) + 1);
    }
  }
  return results$;
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
  b1 = (x1 + y1 * paintingWidth) * 4;
  b2 = (x2 + y2 * paintingWidth) * 4;
  dr = d[b1++] - d[b2++];
  dg = d[b1++] - d[b2++];
  db = d[b1++] - d[b2++];
  return Math.sqrt((dr * dr + dg * dg + db * db) / 0x30000);
};
stringifier = function(key, val){
  if (val && typeof val === 'object') {
    val._ = val.constructor.name;
  }
  if (key === 'diffMap' || key === 'canvas') {
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
    this.x = x;
    this.y = y;
    if (x == null) {
      this.randomize();
    }
  }
  prototype.randomize = function(){
    this.x = between(0, paintingWidth - 1);
    this.y = between(0, paintingHeight - 1);
    return this;
  };
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
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    if (this.r == null) {
      this.randomize();
    }
  }
  prototype.randomize = function(){
    this.r = randomByte();
    this.g = randomByte();
    this.b = randomByte();
    this.a = between(alphaMin, alphaMax);
    return this;
  };
  prototype.fillStyle = function(){
    return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a / 100 + ')';
  };
  prototype.mutate = function(){
    var child;
    child = new Color(this.r, this.g, this.b, this.a);
    switch (between(1, 4)) {
    case 1:
      child.r = clamp(0, this.r + plusOrMinus(1, 16), 255);
      break;
    case 2:
      child.g = clamp(0, this.g + plusOrMinus(1, 16), 255);
      break;
    case 3:
      child.b = clamp(0, this.b + plusOrMinus(1, 16), 255);
      break;
    case 4:
      child.a = clamp(alphaMin, this.a + plusOrMinus(1, 5), alphaMax);
    }
    return child;
  };
  return Color;
}());
Painting = (function(){
  Painting.displayName = 'Painting';
  var prototype = Painting.prototype, constructor = Painting;
  function Painting(shapes, origin){
    this.origin = origin != null
      ? origin
      : [];
    if (shapes) {
      this.shapes = shapes.slice(0);
    } else {
      this.randomize();
    }
  }
  prototype.randomize = function(){
    this.shapes = [new Shape()];
    this.origin = ['random'];
    return this;
  };
  prototype.paint = function(canvas, scale, opaque){
    var ctx, i$, ref$, len$, shape;
    canvas.width = paintingWidth * scale;
    canvas.height = paintingHeight * scale;
    ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(scale, scale);
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
    ctx.restore();
  };
  prototype.show = function(box){
    var canvas, label;
    canvas = box.children[0];
    if (this.canvas !== canvas) {
      this.paint(canvas, 1, true);
      this.diffScore(canvas);
      this.canvas = canvas;
    }
    label = 'Score: ' + Math.floor(this.score) + (this.age ? ' Age: ' + this.age : '');
    return setText(box.children[1], label);
  };
  prototype.diffScore = function(canvas){
    var ctx, score, diffMap, data, i, w, l, dr, dg, db, diff;
    ctx = canvas.getContext('2d');
    score = 0;
    diffMap = new Array(weightMap.length);
    data = ctx.getImageData(0, 0, paintingWidth, paintingHeight).data;
    i = w = 0;
    l = data.length;
    while (i < l) {
      dr = data[i] - targetData[i++];
      dg = data[i] - targetData[i++];
      db = data[i] - targetData[i++];
      i++;
      diff = dr * dr + dg * dg + db * db;
      diffMap[w] = diff;
      score += diff * weightMap[w++];
    }
    this.score = score / (paintingWidth * paintingHeight) + this.cost() * costScoreRatio;
    return this.diffMap = diffMap;
  };
  prototype.paintDiffMap = function(canvas){
    var ctx, diffData, data, i, i$, ref$, len$, point, color;
    if (!this.diffMap) {
      this.paint(canvas);
      this.diffScore(canvas);
    }
    canvas.width = paintingWidth;
    canvas.height = paintingHeight;
    ctx = canvas.getContext('2d');
    diffData = ctx.createImageData(paintingWidth, paintingHeight);
    data = diffData.data;
    i = 0;
    for (i$ = 0, len$ = (ref$ = this.diffMap).length; i$ < len$; ++i$) {
      point = ref$[i$];
      color = 255 * (1 - point / diffMapSensitivity);
      data[i++] = color;
      data[i++] = color;
      data[i++] = color;
      data[i++] = 255;
    }
    return ctx.putImageData(diffData, 0, 0);
  };
  prototype.mutate = function(){
    var child, roll, i, tmp;
    child = new Painting(this.shapes);
    roll = between(0, 99);
    if (roll < 1 && this.shapes.length > 1) {
      child.origin.push('remove');
      i = betweenHigh(0, this.shapes.length - 1);
      child.shapes.splice(i, 1);
    } else if (roll < 2) {
      child.origin.push('add');
      child.shapes.push(new Shape());
    } else if (roll < 5 && this.shapes.length >= 2) {
      child.origin.push('order');
      i = betweenHigh(0, this.shapes.length - 2);
      tmp = this.shapes[i];
      child.shapes[i] = this.shapes[i + 1];
      child.shapes[i + 1] = tmp;
    } else {
      i = betweenHigh(0, this.shapes.length - 1);
      child.shapes[i] = this.shapes[i].mutate();
      child.origin.push(child.shapes[i].origin);
    }
    return child;
  };
  prototype.cross = function(other){
    var len, i, j, shapes;
    len = Math.min(this.shapes.length, other.shapes.length);
    i = between(Math.round(len / 4), len);
    j = i + between(Math.round(len / 4), len * 3 / 4);
    shapes = this.shapes.slice(0, i).concat(other.shapes.slice(i, j)).concat(this.shapes.slice(j));
    return new Painting(shapes, ['cross']);
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
        results$.push(shape.svgPath(i));
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
  function Shape(source){
    var key, val;
    if (source) {
      for (key in source) {
        val = source[key];
        this[key] = val;
      }
    } else {
      this.randomize();
    }
  }
  prototype.randomize = function(){
    this.color = new Color();
    this.path = new Path();
  };
  prototype.paint = function(ctx){
    ctx.save();
    ctx.fillStyle = this.color.fillStyle();
    ctx.beginPath();
    this.path.paint(ctx);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  prototype.mutate = function(){
    var roll, child;
    roll = between(0, 5);
    child = new Shape(this);
    if (roll > 0) {
      child.path = this.path.mutate();
      child.origin = 'shape';
    } else {
      child.color = this.color.mutate();
      child.origin = 'color';
    }
    return child;
  };
  prototype.svgGradient = function(gradientId){
    return "<linearGradient id='" + gradientId + "' gradientUnits='userSpaceOnUse'>" + "<stop offset='0%' " + this.color1.svg() + "/>" + "<stop offset='100%' " + this.color2.svg() + "/>" + "</linearGradient>";
  };
  prototype.svgPath = function(gradientId){
    return "<path fill='" + this.color.fillStyle() + "' d='" + this.path.svg() + "'/>";
  };
  prototype.cost = function(){
    return this.path.cost() + 5;
  };
  return Shape;
}());
Path = (function(){
  Path.displayName = 'Path';
  var prototype = Path.prototype, constructor = Path;
  function Path(source){
    if (source) {
      this.points = source.points.slice(0);
      this.center = source.center;
    } else {
      this.randomize();
    }
  }
  prototype.randomize = function(){
    this.center = new Point();
    this.points = [];
    while (this.points.length < pointsMin) {
      this.points.push(this.center.mutate());
    }
    this.sort();
  };
  prototype.paint = function(ctx){
    var first, i, control, point;
    first = this.points[0];
    ctx.moveTo(first.x, first.y);
    i = 1;
    while (i <= this.points.length) {
      control = this.points[i % this.points.length];
      point = this.points[(i + 1) % this.points.length];
      i += 2;
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
    child = new Path(this);
    if (roll < 7) {
      i = between(0, child.points.length - 1);
      child.points[i] = child.points[i].mutate();
      child.sort();
    } else if (roll < 8 && this.points.length >= pointsMin + 2) {
      i = between(0, child.points.length / 2 - 1);
      child.points.splice(i * 2, 1);
      if (i === 0) {
        child.points.pop();
      } else {
        child.points.splice(i * 2 - 1, 1);
      }
    } else if (roll < 9) {
      child.center = child.center.mutate();
      child.sort();
    } else {
      p = new Point();
      child.points.push(p);
      child.points.push(p.mutate());
      child.sort();
    }
    return child;
  };
  prototype.svg = function(){
    var first, svg, i, control, point;
    first = this.points[0];
    svg = 'M' + first.svg();
    i = 1;
    while (i <= this.points.length) {
      control = this.points[i % this.points.length];
      point = this.points[(i + 1) % this.points.length];
      i += 2;
      svg += 'Q' + control.svg() + ' ' + point.svg();
    }
    return svg;
  };
  prototype.cost = function(){
    return this.points.length;
  };
  return Path;
}());
targetData = null;
bestData = null;
mutate = function(){
  var mutationRate, i$, ref$, len$, i, n, child, mom, j;
  mutationRate = Math.max(1, 5 - Math.floor(Math.log(generationNumber) / Math.LN10));
  for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
    i = ref$[i$];
    n = randomPainting();
    child = mom = paintings[n];
    j = 0;
    while (j++ < mutationRate) {
      child = child.mutate();
    }
    child.show(mutantBoxes[i]);
    if (child.score < mom.score) {
      paintings[n] = child;
      attempt(child.origin, true);
    } else {
      attempt(child.origin, false);
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
      attempt(child.origin, true);
    } else {
      attempt(child.origin, false);
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
  var startTime, previousPaintings, lastShownIndex, best, i$, ref$, len$, i, painting, key, val, percent, fraction;
  startTime = Date.now();
  ++generationNumber;
  previousPaintings = paintings.slice(0);
  mutate();
  crossover();
  if (showIndex !== lastShownIndex || paintings[showIndex] !== previousPaintings[showIndex]) {
    lastShownIndex = showIndex;
    document.getElementById('best-large').src = 'data:image/svg+xml;base64,' + base64.encode(paintings[showIndex].svg());
    paintings[showIndex].paintDiffMap(document.getElementById('diff'));
  }
  best = paintings[0];
  for (i$ = 0, len$ = (ref$ = paintings).length; i$ < len$; ++i$) {
    i = i$;
    painting = ref$[i$];
    painting.age = (painting.age || 0) + 1;
    painting.show(survivorBoxes[i]);
  }
  cumulativeTime += Date.now() - startTime;
  setText(document.getElementById('generation'), generationNumber);
  setText(document.getElementById('time'), Math.floor(cumulativeTime / 1000) + 's');
  setText(document.getElementById('speed'), Math.floor(generationNumber / (cumulativeTime / 1000)));
  for (key in ref$ = attempts) {
    val = ref$[key];
    percent = Math.floor((successes[key] || 0) / val * 100) + '%';
    fraction = (successes[key] || 0) + '/' + val;
    setText(document.getElementById('success-' + key), fraction + ' (' + percent + ')');
  }
  if (generationNumber % 100 === 0) {
    localStorage.setItem(storageKey, JSON.stringify(paintings, stringifier));
  }
  setTimeout(breed, 0);
};
weightMap = null;
generateWeightMap = function(){
  var edgeMap, histoMap, i;
  edgeMap = generateEdgeMap();
  histoMap = generateHistoMap();
  i = 0;
  weightMap = [];
  while (i < edgeMap.length) {
    weightMap.push(clamp(weightMin, edgeMap[i] + histoMap[i], 1));
    i++;
  }
  return paintWeightMap();
};
generateEdgeMap = function(){
  var edgeMap, y, x, u, l, r, d, edge;
  edgeMap = [];
  y = 0;
  while (y < paintingHeight) {
    x = 0;
    while (x < paintingWidth) {
      u = Math.max(y - 1, 0);
      l = Math.max(x - 1, 0);
      r = Math.min(x + 1, paintingWidth - 1);
      d = Math.min(y + 1, paintingHeight - 1);
      edge = diffPoint(targetData, x, y, l, u) + diffPoint(targetData, x, y, x, u) + diffPoint(targetData, x, y, r, u) + diffPoint(targetData, x, y, l, y) + diffPoint(targetData, x, y, r, y) + diffPoint(targetData, x, y, l, d) + diffPoint(targetData, x, y, x, d) + diffPoint(targetData, x, y, r, d);
      edgeMap.push(clamp(0, edge / 4, 1));
      ++x;
    }
    ++y;
  }
  return edgeMap;
};
generateHistoMap = function(){
  var histogram, i, max, r, g, b, a, color, histoMap, rarity;
  histogram = [];
  i = 0;
  max = 0;
  while (i < targetData.length) {
    r = targetData[i++];
    g = targetData[i++];
    b = targetData[i++];
    a = targetData[i++];
    color = (r >> 5) << 6 | (g >> 5) << 3 | b >> 5;
    histogram[color] = (histogram[color] || 0) + 1;
    if (histogram[color] > max) {
      max = histogram[color];
    }
  }
  histoMap = [];
  i = 0;
  while (i < targetData.length) {
    r = targetData[i++];
    g = targetData[i++];
    b = targetData[i++];
    a = targetData[i++];
    color = (r >> 5) << 6 | (g >> 5) << 3 | b >> 5;
    rarity = histogram[color] / (paintingWidth * paintingHeight) * histogram.length;
    histoMap.push(clamp(0, 1 - rarity, 1));
  }
  return histoMap;
};
paintWeightMap = function(){
  var weights, ctx, imageData, data, i, i$, ref$, len$, weight, color;
  weights = document.getElementById('weights');
  weights.width = paintingWidth;
  weights.height = paintingHeight;
  ctx = weights.getContext('2d');
  imageData = ctx.createImageData(paintingWidth, paintingHeight);
  data = imageData.data;
  i = 0;
  for (i$ = 0, len$ = (ref$ = weightMap).length; i$ < len$; ++i$) {
    weight = ref$[i$];
    color = Math.floor((1 - weight) * 255);
    data[i++] = color;
    data[i++] = color;
    data[i++] = color;
    data[i++] = 255;
  }
  return ctx.putImageData(imageData, 0, 0);
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
createBox = function(cls){
  var canvas, box, label;
  canvas = document.createElement('canvas');
  box = document.createElement('div');
  label = document.createElement('p');
  box.className = 'box ' + cls;
  box.appendChild(canvas);
  box.appendChild(label);
  return box;
};
window.addEventListener('load', function(){
  var boxesElement, target, targetLarge, bestLarge, i, i$, ref$, len$, n, box, img, imageSelect, imageText, textureSelect;
  boxesElement = document.getElementById('boxes');
  target = document.getElementById('target');
  targetLarge = document.getElementById('target-large');
  bestLarge = document.getElementById('best-large');
  target.width = paintingWidth;
  target.height = paintingHeight;
  i = 0;
  for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    box = createBox('survivor');
    boxesElement.appendChild(box);
    survivorBoxes.push(box);
    box.dataIndex = n - 1;
    box.addEventListener('click', fn1$);
  }
  for (i$ = 0, len$ = (ref$ = (fn2$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    box = createBox('mutant');
    boxesElement.appendChild(box);
    mutantBoxes.push(box);
  }
  for (i$ = 0, len$ = (ref$ = (fn3$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    box = createBox('crossover');
    boxesElement.appendChild(box);
    crossBoxes.push(box);
  }
  img = new Image();
  img.addEventListener('load', function(){
    var ctx;
    targetLarge.src = img.src;
    if (img.width > img.height) {
      paintingWidth = Math.floor(img.width / img.height * paintingBaseSize);
      paintingHeight = paintingBaseSize;
    } else {
      paintingHeight = Math.floor(img.height / img.width * paintingBaseSize);
      paintingWidth = paintingBaseSize;
    }
    bestLarge.style.width = targetLarge.style.width = paintingWidth * 3 + 'px';
    bestLarge.style.height = targetLarge.style.height = paintingHeight * 3 + 'px';
    target.width = paintingWidth;
    target.height = paintingHeight;
    ctx = target.getContext('2d');
    ctx.drawImage(img, 0, 0, paintingWidth, paintingHeight);
    targetData = ctx.getImageData(0, 0, paintingWidth, paintingHeight).data;
    generateWeightMap();
    storageKey = img.src;
    if (window.__proto__ && localStorage.getItem(storageKey)) {
      paintings = JSON.parse(localStorage.getItem(storageKey), reviver).concat(paintings).slice(0, generationKeep);
      resetStats();
    } else {
      restart();
    }
    sessionStorage.setItem('url', img.src);
    setTimeout(breed, 0);
  });
  img.onerror = function(){
    alert('Failed to load the selected image. It is likely that the image server does not allow Cross-Origin Resource Sharing.');
  };
  imageSelect = document.getElementById('imageSelect');
  imageText = document.getElementById('imageText');
  if (sessionStorage.getItem('url')) {
    imageSelect.selectedIndex = 0;
    imageText.value = sessionStorage.getItem('url');
  } else {
    imageSelect.selectedIndex = between(1, imageSelect.options.length - 1);
    imageText.value = 'images/' + imageSelect.value;
  }
  img.crossOrigin = '';
  img.src = imageText.value;
  imageSelect.addEventListener('change', function(){
    if (imageSelect.selectedIndex > 0) {
      return imageText.value = img.src = 'images/' + imageSelect.value;
    } else {
      imageText.value = '';
      return imageText.focus();
    }
  });
  imageText.addEventListener('change', function(){
    imageSelect.selectedIndex = 0;
    img.crossOrigin = '';
    return img.src = imageText.value;
  });
  textureSelect = document.getElementById('textureSelect');
  textureSelect.addEventListener('change', function(){
    return bestLarge.style.backgroundImage = 'url(textures/' + textureSelect.value + ')';
  });
  return document.getElementById('restart').addEventListener('click', restart);
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