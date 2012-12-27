var storageKey, svgId, showIndex, lastShownIndex, paintingBaseSize, paintingWidth, paintingHeight, paintingMaxShapes, shapeSize, alphaMax, alphaMin, scaleMax, scaleMin, generationKeep, generationMutate, generationCross, generationSize, generationNumber, cumulativeTime, paintings, survivorBoxes, mutantBoxes, crossBoxes, attempts, successes, attempt, between, betweenHigh, randomByte, randomPainting, randomSign, clamp, plusOrMinus, format, setText, diffPoint, stringifier, reviver, Point, Color, Painting, Shape, Path, targetData, bestData, mutate, crossover, breed, weightMap, generateWeightMap, generateEdgeMap, generateHistoMap, paintWeightMap, resetStats, restart, createBox;
storageKey = null;
svgId = 0;
showIndex = 0;
lastShownIndex = 0;
paintingBaseSize = 100;
paintingWidth = paintingBaseSize;
paintingHeight = paintingBaseSize;
paintingMaxShapes = 100;
shapeSize = 20;
alphaMax = 60;
alphaMin = 30;
scaleMax = Math.round(paintingBaseSize / (shapeSize * 2) * 100);
scaleMin = Math.round(1 / (shapeSize * 2) * 100);
generationKeep = 4;
generationMutate = 15;
generationCross = 1;
generationSize = function(){
  return generationKeep + generationMutate + generationCross;
};
generationNumber = 0;
cumulativeTime = 0;
paintings = [];
survivorBoxes = [];
mutantBoxes = [];
crossBoxes = [];
attempts = {};
successes = {};
attempt = function(type, success){
  attempts[type] = (attempts[type] || 0) + 1;
  if (success) {
    return successes[type] = (successes[type] || 0) + 1;
  }
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
format = function(n){
  var sign;
  if (n < 0) {
    n = -n;
    sign = '-';
  } else {
    sign = '';
  }
  if (n >= 100) {
    return sign + Math.floor(n).toString();
  } else if (n < 1) {
    return sign + n.toString().slice(1, 4);
  } else {
    return sign + n.toString().slice(0, 4);
  }
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
  return Math.sqrt((dr * dr + dg * dg + db * db) / (3 * 255 * 255));
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
    this.x = between(1, paintingWidth);
    this.y = between(1, paintingHeight);
    return this;
  };
  prototype.mutate = function(scale){
    var r, a, dx, dy;
    r = between(1, clamp(5, shapeSize / scale, 50));
    a = between(1, 360);
    dx = r * Math.cos(a);
    dy = r * Math.sin(a);
    return new Point(Math.round(this.x + dx), Math.round(this.y + dy));
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
  prototype.svg = function(){
    var rgb;
    rgb = '00000' + (this.b | this.g << 8 | this.r << 16).toString(16);
    return "stop-color='#" + rgb.substr(rgb.length - 6, 6) + "' stop-opacity='" + format(this.a / 100) + "'";
  };
  prototype.mutate = function(scale){
    var min, max, child;
    min = clamp(4, Math.round(32 / scale), 64);
    max = 2 * min;
    child = new Color(this.r, this.g, this.b, this.a);
    switch (between(1, 4)) {
    case 1:
      child.r = Math.round(clamp(0, this.r + plusOrMinus(min, max), 255));
      break;
    case 2:
      child.g = Math.round(clamp(0, this.g + plusOrMinus(min, max), 255));
      break;
    case 3:
      child.b = Math.round(clamp(0, this.b + plusOrMinus(min, max), 255));
      break;
    case 4:
      min = clamp(1, Math.round(5 / scale), 10);
      max = 2 * min;
      child.a = clamp(alphaMin, this.a + plusOrMinus(min, max), alphaMax);
    }
    return child;
  };
  return Color;
}());
Painting = (function(){
  Painting.displayName = 'Painting';
  var prototype = Painting.prototype, constructor = Painting;
  function Painting(shapes, origin){
    this.origin = origin;
    if (shapes) {
      this.shapes = shapes.slice(0);
    } else {
      this.randomize();
    }
  }
  prototype.randomize = function(){
    this.shapes = [new Shape()];
    this.origin = 'random';
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
      if (!shape) {
        console.log(this);
      }
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
    diffMap = [];
    data = ctx.getImageData(0, 0, paintingWidth, paintingHeight).data;
    i = w = 0;
    l = data.length;
    while (i < l) {
      dr = data[i] - targetData[i++];
      dg = data[i] - targetData[i++];
      db = data[i] - targetData[i++];
      i++;
      diff = Math.sqrt((dr * dr + dg * dg + db * db) / (3 * 255 * 255));
      diffMap.push(diff);
      score += diff * weightMap[w++];
    }
    this.score = score;
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
      color = Math.floor((1 - point) * 255);
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
    if (roll < 1 && this.shapes.length >= 1) {
      child.origin = 'remove';
      i = betweenHigh(0, this.shapes.length - 1);
      child.shapes.splice(i, 1);
    } else if (roll < 2 && this.shapes.length < paintingMaxShapes) {
      child.origin = 'add';
      child.shapes.push(new Shape());
    } else if (roll < 5 && this.shapes.length >= 2) {
      child.origin = 'order';
      i = betweenHigh(0, this.shapes.length - 2);
      tmp = this.shapes[i];
      child.shapes[i] = this.shapes[i + 1];
      child.shapes[i + 1] = tmp;
    } else {
      i = betweenHigh(0, this.shapes.length - 1);
      child.shapes[i] = this.shapes[i].mutate();
      child.origin = child.shapes[i].origin;
    }
    return child;
  };
  prototype.cross = function(other){
    var i, j, shapes;
    i = between(Math.round(this.shapes.length / 4), this.shapes.length);
    j = i + between(Math.round(this.shapes.length / 4), this.shapes.length / 3 / 4);
    shapes = this.shapes.slice(0, i).concat(other.shapes.slice(i, j)).concat(this.shapes.slice(j));
    return new Painting(shapes, 'cross');
  };
  prototype.svg = function(){
    var w, h, i, shape;
    w = paintingWidth;
    h = paintingHeight;
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + w * 10 + "px' height='" + h * 10 + "px' " + "viewBox='0 0 " + w + " " + paintingHeight + "'>" + "<title>" + "Generated by SVGDNA at http://svachalek.github.com/svgdna" + "</title>" + "<desc>" + "Original image: " + storageKey + "</desc>" + "<defs>" + (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = this.shapes).length; i$ < len$; ++i$) {
        i = i$;
        shape = ref$[i$];
        results$.push(shape.svgGradient(i));
      }
      return results$;
    }.call(this)).join('') + "<clipPath id='clip'>" + "<path d='M0,0L" + w + ",0L" + w + "," + h + "L0, " + h + "Z'/>" + "</clipPath>" + "</defs>" + "<g clip-path='url(#clip)'>" + (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = this.shapes).length; i$ < len$; ++i$) {
        i = i$;
        shape = ref$[i$];
        results$.push(shape.svgPath(i));
      }
      return results$;
    }.call(this)).join('') + "</g>" + "</svg>";
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
    this.sx = clamp(scaleMin, between(20, 50), scaleMax);
    this.sy = clamp(scaleMin, between(20, 50), scaleMax);
    this.rotate = between(1, 360);
    this.p = new Point();
    this.color1 = new Color();
    this.color2 = new Color();
    this.path = new Path();
  };
  prototype.paint = function(ctx){
    var gradient;
    ctx.save();
    gradient = ctx.createLinearGradient(-shapeSize, 0, shapeSize, 0);
    gradient.addColorStop(0, this.color1.fillStyle());
    gradient.addColorStop(1, this.color2.fillStyle());
    ctx.fillStyle = gradient;
    ctx.translate(this.p.x, this.p.y);
    ctx.rotate(this.rotate * Math.PI / 180);
    ctx.scale(this.sx / 100, this.sy / 100);
    ctx.beginPath();
    this.path.paint(ctx);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  prototype.mutate = function(){
    var roll, scale, child;
    roll = between(0, 13);
    scale = this.sx * this.sy / 10000;
    child = new Shape(this);
    if (roll < 7) {
      child.path = this.path.mutate(scale);
      child.origin = 'shape';
    } else if (roll < 8) {
      child.rotate += plusOrMinus(5 / scale, 20 / scale);
      child.origin = 'orientation';
    } else if (roll < 9) {
      child.sx = clamp(scaleMin, this.sx + plusOrMinus(scaleMin, scaleMax / 8), scaleMax);
      child.origin = 'size';
    } else if (roll < 10) {
      child.sy = clamp(scaleMin, this.sy + plusOrMinus(scaleMin, scaleMax / 8), scaleMax);
      child.origin = 'size';
    } else if (roll < 11) {
      child.p = this.p.mutate(scale);
      child.origin = 'position';
    } else if (roll < 12) {
      child.color1 = this.color1.mutate(scale);
      child.origin = 'color';
    } else {
      child.color2 = this.color2.mutate(scale);
      child.origin = 'color';
    }
    return child;
  };
  prototype.svgGradient = function(gradientId){
    return "<linearGradient id='" + gradientId + "'>" + "<stop offset='0%' " + this.color1.svg() + "/>" + "<stop offset='100%' " + this.color2.svg() + "/>" + "</linearGradient>";
  };
  prototype.svgPath = function(gradientId){
    var scale, transform;
    scale = format(this.sx / 100) + "," + format(this.sy / 100);
    transform = "translate(" + this.p.svg() + ") rotate(" + this.rotate + ") scale(" + scale + ")";
    return "<path transform='" + transform + "' fill='url(#" + gradientId + ")' d='" + this.path.svg() + "'/>";
  };
  return Shape;
}());
Path = (function(){
  Path.displayName = 'Path';
  var prototype = Path.prototype, constructor = Path;
  function Path(source){
    if (source) {
      this.points = source.points.slice(0);
      this.controls = source.controls.slice(0);
    } else {
      this.randomize();
    }
  }
  prototype.randomize = function(){
    var x, y, res$, i$, ref$, len$, point;
    x = between(-shapeSize, +shapeSize);
    y = between(-shapeSize, +shapeSize);
    this.points = [new Point(shapeSize, 0), new Point(x, y)];
    res$ = [];
    for (i$ = 0, len$ = (ref$ = this.points).length; i$ < len$; ++i$) {
      point = ref$[i$];
      res$.push(point.mutate(1));
    }
    this.controls = res$;
  };
  prototype.paint = function(ctx){
    var i$, ref$, len$, i, point;
    ctx.moveTo(-shapeSize, 0);
    for (i$ = 0, len$ = (ref$ = this.points).length; i$ < len$; ++i$) {
      i = i$;
      point = ref$[i$];
      ctx.quadraticCurveTo(point.x, point.y, this.controls[i].x, this.controls[i].y);
    }
  };
  prototype.clamp = function(point){
    var x, y;
    x = clamp(-shapeSize, point.x, +shapeSize);
    y = clamp(-shapeSize, point.y, +shapeSize);
    return new Point(x, y);
  };
  prototype.mutate = function(scale){
    var roll, child, i;
    roll = between(0, 7);
    child = new Path(this);
    i = between(0, this.points.length - 1);
    if (roll < 1 && this.points.length < 10) {
      child.points.splice(i, 0, this.clamp(this.points[i].mutate(scale)));
      child.controls.splice(i, 0, this.clamp(child.points[i].mutate(scale)));
    } else if (roll < 2 && i > 0) {
      child.points.splice(i, 1);
      child.controls.splice(i, 1);
    } else if (roll < 5 && i > 0) {
      child.points[i] = this.clamp(this.points[i].mutate(scale));
    } else {
      child.controls[i] = this.clamp(child.controls[i].mutate(scale));
    }
    return child;
  };
  prototype.svg = function(){
    var i, point;
    return "M" + (-shapeSize) + ",0" + (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = this.points).length; i$ < len$; ++i$) {
        i = i$;
        point = ref$[i$];
        results$.push("Q" + point.svg() + ' ' + this.controls[i].svg());
      }
      return results$;
    }.call(this)).join('');
  };
  return Path;
}());
targetData = null;
bestData = null;
mutate = function(){
  var i$, ref$, len$, i, n, mom, child;
  for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
    i = ref$[i$];
    n = randomPainting();
    mom = paintings[n];
    child = mom.mutate();
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
      attempt('cross', true);
    } else {
      attempt('cross', false);
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
  previousPaintings = paintings.slice(0);
  mutate();
  crossover();
  if (showIndex !== lastShownIndex || paintings[showIndex] !== previousPaintings[showIndex]) {
    lastShownIndex = showIndex;
    document.getElementById('best-large').src = 'data:image/svg+xml;base64,' + btoa(paintings[showIndex].svg());
    paintings[showIndex].paintDiffMap(document.getElementById('diff'));
  }
  best = paintings[0];
  for (i$ = 0, len$ = (ref$ = paintings).length; i$ < len$; ++i$) {
    i = i$;
    painting = ref$[i$];
    painting.age = (painting.age || 0) + 1;
    painting.show(survivorBoxes[i]);
  }
  ++generationNumber;
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
    weightMap.push(clamp(0.02, edgeMap[i] + histoMap[i], 1));
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