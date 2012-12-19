startTime = Date.now!

imageWidth = 100
imageHeight = 100
imageShapes = 50

generationSize = 50
generationKeep = 10
generationNumber = 0

bestPossibleScore = 0

paintings = []
canvases = []
labels = []

randomX = -> Math.floor (Math.random! * 1.5 - 0.25) * imageWidth
randomY = -> Math.floor (Math.random! * 1.5 - 0.25) * imageHeight
randomByte = -> Math.floor Math.random! * 256
randomColor = -> 'rgba(' + randomByte! + ',' + randomByte! + ',' + randomByte! + ',' + Math.random! + ')'

class Painting
  (@shapes) -> @randomize! unless @shapes

  randomize: ->
    @shapes = [randomShape() for p in [1 to imageShapes]]
    return this

  paint: !(canvas) ->
    ctx = canvas.getContext '2d'
    ctx.clearRect 0, 0, imageWidth, imageHeight
    for shape in @shapes
      shape.paint ctx

  cross: (other) -> new Painting [choose(this.shapes[i], other.shapes[i]) for i in [0 to imageShapes - 1]]

class Shape
  -> @randomize!

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

class Circle extends Shape

  randomize: !->
    @x = randomX!
    @y = randomY!
    @r = Math.random! * imageHeight / 2
    @fillStyle = randomColor!

  paint: !(ctx) ->
    ctx.fillStyle = @fillStyle
    ctx.beginPath!
    ctx.arc @x, @y, @r, 0 , 2 * Math.PI, false
    ctx.closePath!
    ctx.fill!

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
  r = Math.random!
  if r < 0.45
    return a
  else if r < 0.90
    return b
  else
    return randomShape()

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
  keep.push paintings[4]
  keep.push paintings[6]
  keep.push paintings[8]
  keep.push paintings[10]
  keep.push paintings[12]
  keep.push paintings[16]
  keep.push paintings[20]
  paintings := keep
  for i in [0 to generationKeep - 1]
    paintings[i].age = (paintings[i].age || 0) + 1
    paintings[i].paint canvases[i]
    labels[i].innerText = (Math.floor paintings[i].score * 100) + '% (' + paintings[i].age + ')'
  for i in [generationKeep to generationSize - 1]
    mom = paintings[Math.floor Math.random! * generationKeep]
    dad = paintings[Math.floor Math.random! * generationKeep]
    while mom == dad
      mom = paintings[Math.floor Math.random! * generationKeep]
      dad = paintings[Math.floor Math.random! * generationKeep]
    child = mom.cross dad
    paintings.push child
    child.paint canvases[i]
    child.score = score = diffScore canvases[i]
    labels[i].innerText = (Math.floor score * 100) + '%'
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

