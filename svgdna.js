var storageKey, svgId, paintingBaseSize, paintingWidth, paintingHeight, paintingMaxShapes, shapeSize, alphaMax, alphaMin, generationKeep, generationMutate, generationCross, generationSize, generationNumber, cumulativeTime, paintings, survivorBoxes, mutantBoxes, crossBoxes, attempts, successes, attempt, lowWeightedRandom, highWeightedRandom, randomX, randomY, randomByte, randomPainting, randomSign, clamp, between, plusOrMinus, format, setText, diffPoint, stringifier, reviver, Point, Color, Painting, Shape, Path, targetData, bestData, breed, weightMap, generateWeightMap, generateEdgeMap, generateHistoMap, paintWeightMap, resetStats, restart, createBox;
storageKey = null;
svgId = 0;
paintingBaseSize = 100;
paintingWidth = paintingBaseSize;
paintingHeight = paintingBaseSize;
paintingMaxShapes = 100;
shapeSize = 20;
alphaMax = 0.6;
alphaMin = 0.3;
generationKeep = 4;
generationMutate = 15;
generationCross = 2;
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
lowWeightedRandom = function(){
  return Math.cos(Math.random() * Math.PI / 2);
};
highWeightedRandom = function(){
  return Math.sin(Math.random() * Math.PI / 2);
};
randomX = function(){
  return Math.floor(Math.random() * paintingWidth);
};
randomY = function(){
  return Math.floor(Math.random() * paintingHeight);
};
randomByte = function(){
  return Math.floor(Math.random() * 256);
};
randomPainting = function(){
  return Math.floor(Math.random() * paintings.length);
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
between = function(min, max){
  return Math.random() * (max - min) + min;
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
    return sign + n.toString().slice(1);
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
  if (typeof val === 'object') {
    val.protoName = val.constructor.name;
  }
  if (key === 'diffMap') {
    return void 8;
  }
  return val;
};
reviver = function(key, val){
  if (val && val.protoName) {
    val.constructor = window[val.protoName];
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
    this.x = randomX();
    this.y = randomY();
    return this;
  };
  prototype.mutate = function(){
    var r, a, dx, dy;
    r = plusOrMinus(shapeSize / 8, shapeSize / 2);
    a = Math.random() * Math.PI * 2;
    dx = r * Math.cos(a);
    dy = r * Math.sin(a);
    return new Point(Math.floor(this.x + dx), Math.floor(this.y + dy));
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
    return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
  };
  prototype.svg = function(){
    return "stop-color='rgb(" + this.r + "," + this.g + "," + this.b + ")' stop-opacity='" + format(this.a) + "'";
  };
  prototype.mutate = function(){
    var child, roll;
    child = new Color(this.r, this.g, this.b, this.a);
    roll = Math.random();
    if (roll < 0.25) {
      child.r = Math.floor(clamp(0, this.r + plusOrMinus(32, 64), 255));
    } else if (roll < 0.50) {
      child.g = Math.floor(clamp(0, this.g + plusOrMinus(32, 64), 255));
    } else if (roll < 0.75) {
      child.b = Math.floor(clamp(0, this.b + plusOrMinus(32, 64), 255));
    } else {
      child.a = clamp(alphaMin, this.a + plusOrMinus(0.05, 0.20), alphaMax);
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
      shape.paint(ctx);
    }
    ctx.restore();
  };
  prototype.show = function(box){
    var canvas, label;
    canvas = box.children[0];
    this.paint(canvas, 1, true);
    if (!this.score) {
      this.diffScore(canvas);
    }
    label = Math.floor(this.score) + (this.age ? ' +' + this.age : '');
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
    roll = Math.random();
    if (roll < 0.01 && this.shapes.length >= 1) {
      child.origin = 'remove';
      i = Math.floor * (this.shapes.length - 1);
      child.shapes.splice(i, 1);
    } else if (roll < 0.02 && this.shapes.length < paintingMaxShapes) {
      child.origin = 'add';
      child.shapes.push(new Shape());
    } else if (roll < 0.05 && this.shapes.length >= 2) {
      child.origin = 'order';
      i = Math.floor(highWeightedRandom() * (this.shapes.length - 1));
      tmp = this.shapes[i];
      child.shapes[i] = this.shapes[i + 1];
      child.shapes[i + 1] = tmp;
    } else {
      i = Math.floor(highWeightedRandom() * this.shapes.length);
      child.shapes[i] = this.shapes[i].mutate();
      child.origin = child.shapes[i].origin;
    }
    return child;
  };
  prototype.cross = function(other){
    var i, j, shapes, n;
    i = j = 0;
    shapes = [];
    while (i < this.shapes.length && j < other.shapes.length) {
      if (Math.random() < 0.5) {
        shapes.push(this.shapes[i++]);
      } else {
        shapes.push(other.shapes[j++]);
      }
    }
    while (i < this.shapes.length) {
      shapes.push(this.shapes[i++]);
    }
    while (j < other.shapes.length) {
      shapes.push(other.shapes[j++]);
    }
    n = Math.floor(shapes.length / 2);
    i = 0;
    while (i++ < n) {
      shapes.splice(Math.floor(Math.random() * shapes.length), 1);
    }
    return new Painting(shapes, 'cross');
  };
  prototype.svg = function(){
    var shape;
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + paintingWidth + "px' height='" + paintingHeight + "px' " + "viewbox='0 0 " + paintingWidth + " " + paintingHeight + "'>" + (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = this.shapes).length; i$ < len$; ++i$) {
        shape = ref$[i$];
        results$.push(shape.svg());
      }
      return results$;
    }.call(this)).join('') + "</svg>";
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
    this.sx = (Math.random() + 0.2) / 2;
    this.sy = (Math.random() + 0.2) / 2;
    this.rotate = Math.random() * 2 * Math.PI;
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
    ctx.rotate(this.rotate);
    ctx.scale(this.sx, this.sy);
    ctx.beginPath();
    this.path.paint(ctx);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  prototype.mutate = function(){
    var roll, child;
    roll = Math.random() * 13;
    child = new Shape(this);
    if (roll < 7) {
      child.path = this.path.mutate();
      child.origin = 'shape';
    } else if (roll < 8) {
      child.rotate += plusOrMinus(Math.PI / 32, Math.PI / 8);
      child.origin = 'orientation';
    } else if (roll < 9) {
      child.sx += plusOrMinus(0.1, 0.5);
      child.origin = 'size';
    } else if (roll < 10) {
      child.sy += plusOrMinus(0.1, 0.5);
      child.origin = 'size';
    } else if (roll < 11) {
      child.p = this.p.mutate();
      child.origin = 'position';
    } else if (roll < 12) {
      child.color1 = this.color1.mutate();
      child.origin = 'color';
    } else {
      child.color2 = this.color2.mutate();
      child.origin = 'color';
    }
    return child;
  };
  prototype.svg = function(){
    var gradientId, rotate, scale, transform;
    gradientId = svgId++;
    rotate = format(this.rotate / Math.PI * 180);
    scale = format(this.sx) + "," + format(this.sy);
    transform = "translate(" + this.p.svg() + ") rotate(" + rotate + ") scale(" + scale + ")";
    return "<defs>" + "<linearGradient id='" + gradientId + "'>" + "<stop offset='0%' " + this.color1.svg() + "/>" + "<stop offset='100%' " + this.color2.svg() + "/>" + "</linearGradient>" + "</defs>" + "<path transform='" + transform + "' fill='url(#" + gradientId + ")' d='" + this.path.svg() + "'/>";
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
    x = Math.floor((Math.random() - 0.5) * 2 * shapeSize);
    y = Math.floor((Math.random() - 0.5) * 2 * shapeSize);
    this.points = [new Point(shapeSize, 0), new Point(x, y)];
    res$ = [];
    for (i$ = 0, len$ = (ref$ = this.points).length; i$ < len$; ++i$) {
      point = ref$[i$];
      res$.push(point.mutate());
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
    x = Math.floor(clamp(-shapeSize, point.x, shapeSize));
    y = Math.floor(clamp(-shapeSize, point.y, shapeSize));
    return new Point(x, y);
  };
  prototype.mutate = function(){
    var roll, child, i;
    roll = Math.random() * 8;
    child = new Path(this);
    i = Math.floor(Math.random() * this.points.length);
    if (roll < 1 && this.points.length < 10) {
      child.points.splice(i, 0, this.clamp(this.points[i].mutate()));
      child.controls.splice(i, 0, this.clamp(child.points[i].mutate()));
    } else if (roll < 2 && i > 0) {
      child.points.splice(i, 1);
      child.controls.splice(i, 1);
    } else if (roll < 5 && i > 0) {
      child.points[i] = this.clamp(this.points[i].mutate());
    } else {
      child.controls[i] = this.clamp(child.controls[i].mutate());
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
breed = function(){
  var startTime, i$, ref$, len$, i, n, mom, child, dad, best, painting, key, val, percent, fraction;
  startTime = Date.now();
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
  for (i$ = 0, len$ = (ref$ = (fn1$())).length; i$ < len$; ++i$) {
    i = ref$[i$];
    mom = randomPainting();
    dad = randomPainting();
    while (mom === dad) {
      dad = randomPainting();
    }
    child = paintings[mom].cross(paintings[dad]);
    child.show(crossBoxes[i]);
    if (child.score < paintings[mom].score) {
      paintings[mom] = child;
      attempt('cross', true);
    } else if (child.score < paintings[dad].score) {
      paintings[dad] = child;
      attempt('cross', true);
    } else {
      attempt('cross', false);
    }
  }
  paintings.sort(function(a, b){
    return a.score - b.score || a.shapes.length - b.shapes.length;
  });
  if (paintings[0] !== best) {
    document.getElementById('best-large').src = 'data:image/svg+xml;utf8,' + paintings[0].svg();
    if (paintings[0].diffMap) {
      paintings[0].paintDiffMap(document.getElementById('diff'));
    }
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
  function fn$(){
    var i$, to$, results$ = [];
    for (i$ = 0, to$ = generationMutate - 1; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
  function fn1$(){
    var i$, to$, results$ = [];
    for (i$ = 0, to$ = generationCross - 1; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
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
  }
  for (i$ = 0, len$ = (ref$ = (fn1$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    box = createBox('mutant');
    boxesElement.appendChild(box);
    mutantBoxes.push(box);
  }
  for (i$ = 0, len$ = (ref$ = (fn2$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    box = createBox('crossbreed');
    boxesElement.appendChild(box);
    crossBoxes.push(box);
  }
  img = new Image();
  img.addEventListener('load', function(){
    var ctx;
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
      paintings = JSON.parse(localStorage.getItem(storageKey), reviver);
      resetStats();
    } else {
      restart();
    }
    sessionStorage.setItem('url', img.src);
    return setTimeout(breed, 0);
  });
  imageSelect = document.getElementById('imageSelect');
  imageText = document.getElementById('imageText');
  if (sessionStorage.getItem('url')) {
    imageSelect.selectedIndex = 0;
    imageText.value = sessionStorage.getItem('url');
  } else {
    imageSelect.selectedIndex = 1 + Math.floor(Math.random() * imageSelect.options.length - 1);
    imageText.value = 'images/' + imageSelect.value;
  }
  img.crossOrigin = '';
  targetLarge.src = img.src = imageText.value;
  imageSelect.addEventListener('change', function(){
    if (imageSelect.selectedIndex > 0) {
      return imageText.value = targetLarge.src = img.src = 'images/' + imageSelect.value;
    } else {
      imageText.value = '';
      return imageText.focus();
    }
  });
  imageText.addEventListener('change', function(){
    imageSelect.selectedIndex = 0;
    img.crossOrigin = '';
    return targetLarge.src = img.src = imageText.value;
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
    var i$, to$, results$ = [];
    for (i$ = 1, to$ = generationMutate; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
  function fn2$(){
    var i$, to$, results$ = [];
    for (i$ = 1, to$ = generationCross; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
});