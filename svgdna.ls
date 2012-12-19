startTime = Date.now!

imageWidth = 100
imageHeight = 100
imageShapes = 25

generationSize = 50
generationKeep = 10
generationMutate = (generationSize - generationKeep) / 2
generationCross = generationSize - generationKeep - generationMutate
generationNumber = 0

bestPossibleScore = 0

paintings = []
canvases = []
labels = []

randomX = -> Math.floor (Math.random! * 1.5 - 0.25) * imageWidth
randomY = -> Math.floor (Math.random! * 1.5 - 0.25) * imageHeight
randomRadius = -> Math.floor Math.random! * imageHeight / 2
randomByte = -> Math.floor Math.random! * 256
randomColor = -> 'rgba(' + randomByte! + ',' + randomByte! + ',' + randomByte! + ',' + Math.random! + ')'

class Painting
  (shapes) -> if shapes then @shapes = shapes.slice(0) else @randomize!

  randomize: ->
    @shapes = [randomShape()]
    return this

  paint: !(canvas) ->
    ctx = canvas.getContext '2d'
    ctx.clearRect 0, 0, imageWidth, imageHeight
    for shape in @shapes
      shape.paint ctx

  show: (box) ->
    @paint canvases[box]
    unless @score then @score = diffScore canvases[box]
    label = (Math.floor @score * 100) + '% [' + @shapes.length + ']'
    if @age
      label += ' (' + @age + ')'
    labels[box].innerText = label

  shuffle: !->
    i = @shapes.length;
    if i
      while --i
        j = Math.floor Math.random! * (i + 1)
        tmp = @shapes[i]
        @shapes[i] = @shapes[j]
        @shapes[j] = tmp

  remove: !->
    if @shapes.length
      i = Math.floor Math.random! * @shapes.length
      @shapes.splice i, 1

  add: !->
    if @shapes.length >= imageShapes then @shapes.splice 0, 1
    i = Math.floor Math.random! * @shapes.length
    @shapes.splice i, 0, randomShape()

  swap: !->
    if @shapes.length >= 2
      i = Math.floor Math.random! * @shapes.length
      j = Math.floor Math.random! * @shapes.length
      tmp = @shapes[i]
      @shapes[i] = @shapes[j]
      @shapes[j] = tmp

  mutateShape: !->
    if @shapes.length
      i = Math.floor Math.random! * @shapes.length
      @shapes[i] = @shapes[i].mutate!

  mutate: ->
    copy = new Painting @shapes
    roll = Math.random!
    if roll < 0.10
      copy.shuffle!
    else if roll < 0.30
      copy.remove!
    else if roll < 0.50
      copy.add!
    else if roll < 0.70
      copy.swap!
    else
      copy.mutateShape!
    return copy

  cross: (other) ->
    len = Math.min this.shapes.length, other.shapes.length
    i = 0
    shapes = []
    while i < len
      if Math.random! < 0.5
        shapes.push this.shapes[i]
      else
        shapes.push other.shapes[i]
      ++i
    return new Painting shapes

class Shape
  (source) ->
    if source
      for key, val of source
        this[key] = val
    else
      @randomize!

class Triangle extends Shape

  randomize: !->
    @x0 = randomX!
    @y0 = randomY!
    @x1 = randomX!
    @y1 = randomY!
    @x2 = randomX!
    @y2 = randomY!
    @fillStyle = randomColor!

  paint: !(ctx) ->
    ctx.fillStyle = @fillStyle
    ctx.beginPath!
    ctx.moveTo @x0, @y0
    ctx.lineTo @x1, @y1
    ctx.lineTo @x2, @y2
    ctx.closePath!
    ctx.fill!

  mutate: ->
    roll = Math.random!
    copy = new Triangle this
    if roll < 0.1
      copy.x0 = randomX!
    else if roll < 0.2
      copy.y0 = randomY!
    else if roll < 0.3
      copy.x1 = randomX!
    else if roll < 0.4
      copy.y1 = randomY!
    else if roll < 0.5
      copy.x2 = randomX!
    else if roll < 0.6
      copy.y2 = randomY!
    else
      copy.fillStyle = randomColor!
    return copy

class Circle extends Shape

  randomize: !->
    @x = randomX!
    @y = randomY!
    @r = randomRadius!
    @fillStyle = randomColor!

  paint: !(ctx) ->
    ctx.fillStyle = @fillStyle
    ctx.beginPath!
    ctx.arc @x, @y, @r, 0 , 2 * Math.PI, false
    ctx.closePath!
    ctx.fill!

  mutate: ->
    roll = Math.random!
    copy = new Circle this
    if roll < 0.2
      copy.x = randomX!
    else if roll < 0.4
      copy.y = randomY!
    else if roll < 0.6
      copy.r = randomRadius!
    else
      copy.fillStyle = randomColor!
    return copy

randomShape = ->
  if Math.random! < 0.5
    new Triangle!
  else
    new Circle!

targetData = null

diffScore = (canvas) ->
  ctx = canvas.getContext '2d'
  score = bestPossibleScore
  data = (ctx.getImageData 0, 0, imageWidth, imageHeight).data
  x = 0
  while x < imageWidth
    y = 0
    while y < imageHeight
      base = x * y * 4
      dr = data[base + 0] - targetData[base + 0]
      dg = data[base + 1] - targetData[base + 1]
      db = data[base + 2] - targetData[base + 2]
      score -= Math.sqrt (dr * dr + dg * dg + db * db) / (3 * 255 * 255)
      ++y
    ++x
  return score / bestPossibleScore

findBestPossibleScore = ->
  x = 0
  while x < imageWidth
    y = 0
    while y < imageHeight
      base = x * y * 4
      r = targetData[base + 0]
      g = targetData[base + 1]
      b = targetData[base + 2]
      dr = Math.max r, 255 - r
      dg = Math.max g, 255 - g
      db = Math.max b, 255 - b
      bestPossibleScore += Math.sqrt (dr * dr + dg * dg + db * db) / (3 * 255 * 255)
      ++y
    ++x

scoreAll = ->
  for i in [0 to generationSize - 1]
    paintings[i].score = score = diffScore canvases[i]
    labels[i].innerText = (Math.floor score * 100) + '%'

flip = (a, b) -> if Math.random! < 0.5 then a else b

choose = (a, b) ->
  roll = Math.random!
  if roll < 0.45
    a
  else if roll < 0.90
    b
  else if roll < 0.95
    a.mutate!
  else
    b.mutate!

breed = !->
  ++generationNumber
  elapsed = (Date.now! - startTime) / 1000
  document.getElementById('generation').innerText = generationNumber
  document.getElementById('time').innerText = Math.floor elapsed
  document.getElementById('speed').innerText = Math.floor generationNumber / elapsed
  paintings.sort (a, b) -> b.score - a.score
  keep = []
  keep.push paintings[0]
  keep.push paintings[1]
  keep.push paintings[2]
  keep.push paintings[3]
  keep.push paintings[5]
  keep.push paintings[7]
  keep.push paintings[10]
  keep.push paintings[13]
  keep.push paintings[17]
  keep.push paintings[21]
  paintings := keep
  for i in [0 to generationKeep - 1]
    paintings[i].age = (paintings[i].age || 0) + 1
    paintings[i].show i
  for i in [0 to generationMutate - 1]
    mom = paintings[Math.floor Math.random! * generationKeep]
    child = mom.mutate!
    paintings.push child
    child.show paintings.length - 1
  for i in [0 to generationCross - 1]
    mom = paintings[Math.floor Math.random! * generationKeep]
    dad = paintings[Math.floor Math.random! * generationKeep]
    while mom == dad
      mom = paintings[Math.floor Math.random! * generationKeep]
      dad = paintings[Math.floor Math.random! * generationKeep]
    child = mom.cross dad
    paintings.push child
    child.show paintings.length - 1
  setTimeout breed, 0

target = document.getElementById('target')
target.width = imageWidth
target.height = imageHeight

for i in [0 to generationSize - 1]
  canvas = canvases[i] = document.createElement 'canvas'
  canvas.width = imageWidth
  canvas.height = imageHeight
  div = document.createElement 'div'
  label = labels[i] = document.createElement 'p'
  label.innerText = i.toString!
  div.className = 'box'
  div.appendChild canvas
  div.appendChild label
  document.body.appendChild div

for i in [0 to generationSize - 1]
  paintings.push new Painting()

paintings.sort (a, b) -> b.score - a.score
for i in [0 to generationSize - 1]
  paintings[i].paint canvases[i]

img = new Image!
img.onload = ->
  ctx = target.getContext '2d'
  ctx.drawImage img, 0, 0, imageWidth, imageHeight
  targetData := (ctx.getImageData 0, 0, imageWidth, imageHeight).data
  bestPossibleScore = findBestPossibleScore!
  scoreAll!
  setTimeout breed, 0
img.src = 'Lenna.png'

