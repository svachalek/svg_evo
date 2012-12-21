var imageWidth, imageHeight, imageShapes, imageRadius, generationKeep, generationMutate, generationCross, generationSize, generationNumber, cumulativeTime, paintings, survivorBoxes, mutantBoxes, crossBoxes, lowWeightedRandom, highWeightedRandom, randomX, randomY, randomRadius, randomByte, randomPainting, clamp, setText, diffPoint, Point, Color, Painting, Shape, Triangle, Oval, randomShape, targetData, bestData, breed, weightMap, generateWeightMap, paintWeightMap, restart, createBox;
imageWidth = 100;
imageHeight = 100;
imageShapes = 100;
imageRadius = function(){
  return Math.sqrt(imageWidth * imageWidth + imageHeight * imageHeight) / 2;
};
generationKeep = 4;
generationMutate = 15;
generationCross = 7;
generationSize = function(){
  return generationKeep + generationMutate + generationCross;
};
generationNumber = 0;
cumulativeTime = 0;
paintings = [];
survivorBoxes = [];
mutantBoxes = [];
crossBoxes = [];
lowWeightedRandom = function(){
  return Math.cos(Math.random() * Math.PI / 2);
};
highWeightedRandom = function(){
  return Math.sin(Math.random() * Math.PI / 2);
};
randomX = function(){
  return Math.floor(Math.random() * imageWidth);
};
randomY = function(){
  return Math.floor(Math.random() * imageHeight);
};
randomRadius = function(){
  return Math.floor(lowWeightedRandom() * imageRadius() / 2);
};
randomByte = function(){
  return Math.floor(Math.random() * 256);
};
randomPainting = function(){
  return Math.floor(Math.random() * paintings.length);
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
setText = function(element, text){
  return element.innerText = element.textContent = text;
};
diffPoint = function(d1, x1, y1, d2, x2, y2){
  var b1, b2, dr, dg, db;
  b1 = (x1 + y1 * imageWidth) * 4;
  b2 = (x2 + y2 * imageWidth) * 4;
  dr = d1[b1++] - d2[b2++];
  dg = d1[b1++] - d2[b2++];
  db = d1[b1++] - d2[b2++];
  return Math.sqrt((dr * dr + dg * dg + db * db) / (3 * 255 * 255));
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
    r = randomRadius();
    a = Math.random() * Math.PI * 2;
    dx = r * Math.cos(a);
    dy = r * Math.sin(a);
    return new Point(this.x + dx, this.y + dy);
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
    this.a = Math.random();
    return this;
  };
  prototype.fillStyle = function(){
    return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
  };
  prototype.mutate = function(){
    var child, roll;
    child = new Color(this.r, this.g, this.b, this.a);
    roll = Math.random();
    if (roll < 0.25) {
      child.r = clamp(0, this.r + Math.random() * 10 - 5, 255);
    } else if (roll < 0.50) {
      child.g = clamp(0, this.g + Math.random() * 10 - 5, 255);
    } else if (roll < 0.75) {
      child.b = clamp(0, this.b + Math.random() * 10 - 5, 255);
    } else {
      child.a = clamp(0, this.a + Math.random() / 10 - 0.05, 1);
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
    this.shapes = [randomShape()];
    this.origin = 'R';
    return this;
  };
  prototype.paint = function(canvas){
    var ctx, i$, ref$, len$, shape;
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, imageWidth, imageHeight);
    for (i$ = 0, len$ = (ref$ = this.shapes).length; i$ < len$; ++i$) {
      shape = ref$[i$];
      shape.paint(ctx);
    }
  };
  prototype.show = function(box){
    var canvas, label;
    canvas = box.children[0];
    this.paint(canvas);
    if (!this.score) {
      this.diffScore(canvas);
    }
    label = '@' + Math.floor(this.score * 10000) + ' #' + this.shapes.length + ' ' + this.origin + (this.age || '');
    return setText(box.children[1], label);
  };
  prototype.diffScore = function(canvas){
    var ctx, score, points, data, y, x, diff;
    ctx = canvas.getContext('2d');
    score = 0;
    points = [];
    data = ctx.getImageData(0, 0, imageWidth, imageHeight).data;
    y = 0;
    while (y < imageHeight) {
      x = 0;
      while (x < imageWidth) {
        diff = diffPoint(data, x, y, targetData, x, y);
        points.push(diff);
        score += diff * weightMap[x + y * imageWidth];
        ++x;
      }
      ++y;
    }
    this.score = score / (imageHeight * imageWidth);
    return this.points = points;
  };
  prototype.paintDiff = function(canvas){
    var ctx, imageData, data, i, i$, ref$, len$, point, color;
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    ctx = canvas.getContext('2d');
    imageData = ctx.createImageData(imageWidth, imageHeight);
    data = imageData.data;
    i = 0;
    for (i$ = 0, len$ = (ref$ = this.points).length; i$ < len$; ++i$) {
      point = ref$[i$];
      color = Math.floor((1 - point) * 255);
      data[i++] = color;
      data[i++] = color;
      data[i++] = color;
      data[i++] = 255;
    }
    return ctx.putImageData(imageData, 0, 0);
  };
  prototype.remove = function(){
    var i;
    if (this.shapes.length > 1) {
      i = Math.floor(lowWeightedRandom() * this.shapes.length);
      this.shapes.splice(i, 1);
    }
  };
  prototype.add = function(){
    var i;
    if (this.shapes.length >= imageShapes) {
      this.shapes.splice(0, 1);
    }
    i = Math.floor(highWeightedRandom() * this.shapes.length);
    this.shapes.splice(i, 0, randomShape());
  };
  prototype.fork = function(){
    var i;
    if (this.shapes.length >= imageShapes) {
      this.shapes.splice(0, 1);
    }
    i = Math.floor(highWeightedRandom() * this.shapes.length);
    this.shapes.splice(i, 0, this.shapes[i].mutate());
  };
  prototype.swap = function(){
    var i, tmp;
    if (this.shapes.length >= 2) {
      i = Math.floor(highWeightedRandom() * (this.shapes.length - 1));
      tmp = this.shapes[i];
      this.shapes[i] = this.shapes[i + 1];
      this.shapes[i + 1] = tmp;
    }
  };
  prototype.mutateShape = function(){
    var i;
    if (this.shapes.length) {
      i = Math.floor(highWeightedRandom() * this.shapes.length);
      this.shapes[i] = this.shapes[i].mutate();
    }
  };
  prototype.mutate = function(){
    var child, roll;
    child = new Painting(this.shapes);
    roll = Math.random();
    if (roll < 0.10) {
      child.origin = 'A';
      child.add();
    } else if (roll < 0.20) {
      child.origin = 'R';
      child.remove();
    } else if (roll < 0.30) {
      child.origin = 'X';
      child.swap();
    } else if (roll < 0.40) {
      child.origin = 'F';
      child.fork();
    } else {
      child.origin = 'S';
      child.mutateShape();
    }
    return child;
  };
  prototype.cross = function(other){
    var len, i, shapes;
    len = Math.min(this.shapes.length, other.shapes.length);
    i = 0;
    shapes = [];
    while (i < len) {
      if (Math.random() < 0.5) {
        shapes.push(this.shapes[i]);
      } else {
        shapes.push(other.shapes[i]);
      }
      ++i;
    }
    return new Painting(shapes, 'X');
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
  return Shape;
}());
Triangle = (function(superclass){
  var prototype = extend$((import$(Triangle, superclass).displayName = 'Triangle', Triangle), superclass).prototype, constructor = Triangle;
  prototype.randomize = function(){
    this.rotate = 0;
    this.p0 = new Point();
    this.p1 = this.p0.mutate();
    this.p2 = this.p0.mutate();
    this.color = new Color();
  };
  prototype.paint = function(ctx){
    ctx.save();
    ctx.fillStyle = this.color.fillStyle();
    ctx.rotate(this.rotate);
    ctx.beginPath();
    ctx.moveTo(this.p0.x, this.p0.y);
    ctx.lineTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  prototype.copy = function(){
    return new Triangle(this);
  };
  prototype.mutate = function(){
    var roll, child;
    roll = Math.random();
    child = this.copy();
    if (roll < 0.2) {
      child.p0 = this.p0.mutate();
    } else if (roll < 0.4) {
      child.p1 = this.p1.mutate();
    } else if (roll < 0.6) {
      child.p2 = this.p2.mutate();
    } else if (roll < 0.8) {
      child.rotate += (lowWeightedRandom() - 0.5) * 2 * Math.PI;
    } else {
      child.color = this.color.mutate();
    }
    return child;
  };
  function Triangle(){
    Triangle.superclass.apply(this, arguments);
  }
  return Triangle;
}(Shape));
Oval = (function(superclass){
  var prototype = extend$((import$(Oval, superclass).displayName = 'Oval', Oval), superclass).prototype, constructor = Oval;
  prototype.randomize = function(){
    this.sx = Math.random() + 0.5;
    this.sy = Math.random() + 0.5;
    this.rotate = Math.random() * 2 * Math.PI;
    this.center = new Point();
    this.r = randomRadius();
    this.color = new Color();
  };
  prototype.paint = function(ctx){
    ctx.save();
    ctx.fillStyle = this.color.fillStyle();
    ctx.rotate(this.rotate);
    ctx.scale(this.sx, this.sy);
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, this.r, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  prototype.copy = function(){
    return new Oval(this);
  };
  prototype.mutate = function(){
    var roll, child;
    roll = Math.random();
    child = this.copy();
    if (roll < 0.20) {
      child.rotate += (lowWeightedRandom() - 0.5) * 2 * Math.PI;
    } else if (roll < 0.40) {
      child.sx += (Math.random() - 0.5) / 4;
    } else if (roll < 0.60) {
      child.sy += (Math.random() - 0.5) / 4;
    } else if (roll < 0.80) {
      child.center = this.center.mutate();
    } else {
      child.color = this.color.mutate();
    }
    return child;
  };
  function Oval(){
    Oval.superclass.apply(this, arguments);
  }
  return Oval;
}(Shape));
randomShape = function(){
  if (Math.random() < 0.8) {
    return new Triangle();
  } else {
    return new Oval();
  }
};
targetData = null;
bestData = null;
breed = function(){
  var startTime, i$, ref$, len$, i, n, mom, child, dad, best, painting;
  startTime = Date.now();
  for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
    i = ref$[i$];
    n = randomPainting();
    mom = paintings[n];
    child = mom.mutate();
    child.show(mutantBoxes[i]);
    if (child.score < mom.score) {
      paintings[n] = child;
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
    if (child.score < mom.score) {
      paintings[mom] = child;
    } else if (child.score < dad.score) {
      paintings[dad] = child;
    }
  }
  paintings.sort(function(a, b){
    return a.score - b.score || a.shapes.length - b.shapes.length;
  });
  best = paintings[0];
  if (best.score != null) {
    best.paintDiff(document.getElementById('diff'));
  }
  for (i$ = 0, len$ = (ref$ = paintings).length; i$ < len$; ++i$) {
    i = i$;
    painting = ref$[i$];
    painting.age = (painting.age || 0) + 1;
    painting.show(survivorBoxes[i]);
  }
  ++generationNumber;
  cumulativeTime += Date.now() - startTime;
  setText(document.getElementById('generation'), generationNumber);
  setText(document.getElementById('time'), Math.floor(cumulativeTime / 1000));
  setText(document.getElementById('speed'), Math.floor(generationNumber / (cumulativeTime / 1000)));
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
  var y, x, u, l, r, d, weight;
  weightMap = [];
  y = 0;
  while (y < imageHeight) {
    x = 0;
    while (x < imageWidth) {
      u = Math.max(y - 1, 0);
      l = Math.max(x - 1, 0);
      r = Math.min(x + 1, imageWidth - 1);
      d = Math.min(y + 1, imageHeight - 1);
      weight = diffPoint(targetData, x, y, targetData, l, u) + diffPoint(targetData, x, y, targetData, x, u) + diffPoint(targetData, x, y, targetData, r, u) + diffPoint(targetData, x, y, targetData, l, y) + diffPoint(targetData, x, y, targetData, r, y) + diffPoint(targetData, x, y, targetData, l, d) + diffPoint(targetData, x, y, targetData, x, d) + diffPoint(targetData, x, y, targetData, r, d);
      weightMap.push(clamp(0.05, weight / 4, 1));
      ++x;
    }
    ++y;
  }
  return paintWeightMap();
};
paintWeightMap = function(){
  var weights, ctx, imageData, data, i, i$, ref$, len$, weight, color;
  weights = document.getElementById('weights');
  weights.width = imageWidth;
  weights.height = imageHeight;
  ctx = weights.getContext('2d');
  imageData = ctx.createImageData(imageWidth, imageHeight);
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
restart = function(){
  var res$, i$, ref$, len$, n;
  cumulativeTime = 0;
  generationNumber = 0;
  res$ = [];
  for (i$ = 0, len$ = (ref$ = (fn$())).length; i$ < len$; ++i$) {
    n = ref$[i$];
    res$.push(new Painting());
  }
  paintings = res$;
  return setTimeout(breed, 0);
  function fn$(){
    var i$, to$, results$ = [];
    for (i$ = 1, to$ = generationKeep; i$ <= to$; ++i$) {
      results$.push(i$);
    }
    return results$;
  }
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
  var boxesElement, target, i, i$, ref$, len$, n, box, img, imageSelect;
  boxesElement = document.getElementById('boxes');
  target = document.getElementById('target');
  target.width = imageWidth;
  target.height = imageHeight;
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
    box = createBox('cross');
    boxesElement.appendChild(box);
    crossBoxes.push(box);
  }
  img = new Image();
  img.addEventListener('load', function(){
    var ctx;
    if (img.width > img.height) {
      imageWidth = Math.floor(img.width / img.height * 100);
      imageHeight = 100;
    } else {
      imageHeight = Math.floor(img.height / img.width * 100);
      imageWidth = 100;
    }
    target.width = imageWidth;
    target.height = imageHeight;
    ctx = target.getContext('2d');
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
    targetData = ctx.getImageData(0, 0, imageWidth, imageHeight).data;
    generateWeightMap();
    return restart();
  });
  imageSelect = document.getElementById('imageSelect');
  imageSelect.selectedIndex = Math.floor(Math.random() * imageSelect.options.length);
  img.src = 'images/' + imageSelect.value;
  return imageSelect.addEventListener('change', function(){
    return img.src = 'images/' + imageSelect.value;
  });
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
function extend$(sub, sup){
  function fun(){} fun.prototype = (sub.superclass = sup).prototype;
  (sub.prototype = new fun).constructor = sub;
  if (typeof sup.extended == 'function') sup.extended(sub);
  return sub;
}
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}