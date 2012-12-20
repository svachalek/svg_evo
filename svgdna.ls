startTime = Date.now!

imageWidth = 100
imageHeight = 100
imageShapes = 100
imageRadius = (Math.sqrt imageWidth * imageWidth + imageHeight * imageHeight) / 2

generationKeep = 10
generationMutate = 20
generationCross = 20
generationSize = generationKeep + generationMutate + generationCross
generationNumber = 0

bestPossibleScore = 0

paintings = []
canvases = []
labels = []

lowWeightedRandom = -> Math.cos(Math.random! * Math.PI / 2)
highWeightedRandom = -> Math.sin(Math.random! * Math.PI / 2)

randomX = -> Math.floor (Math.random! * 1.5 - 0.25) * imageWidth
randomY = -> Math.floor (Math.random! * 1.5 - 0.25) * imageHeight
randomRadius = -> Math.floor lowWeightedRandom! * imageRadius
randomByte = -> Math.floor Math.random! * 256
clamp = (min, n, max) -> if n < min then min else if n > max then max else n

class Color

  (@r, @g, @b, @a) -> unless @r? then @randomize!

  randomize: ->
    @r = randomByte!
    @g = randomByte!
    @b = randomByte!
    @a = Math.random!
    return this

  fillStyle: -> 'rgba(' + @r + ',' + @g + ',' + @b + ',' + @a + ')'

  mutate: ->
    child = new Color @r, @g, @b, @a
    roll = Math.random!
    if roll < 0.25
      child.r = clamp(0, @r + Math.random! * 10 - 5, 255)
    else if roll < 0.50
      child.r = clamp(0, @g + Math.random! * 10 - 5, 255)
    else if roll < 0.75
      child.r = clamp(0, @b + Math.random! * 10 - 5, 255)
    else
      child.a = clamp(0, @a + Math.random! / 10 - 0.05, 1)
    return child

class Painting
  (shapes, @origin) -> if shapes then @shapes = shapes.slice(0) else @randomize!

  randomize: ->
    @shapes = [randomShape!]
    @origin = 'R'
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
      label += ' (' + @origin + @age + ')'
    labels[box].innerText = label

  remove: !->
    if @shapes.length
      # lean towards removing from the bottom
      i = Math.floor lowWeightedRandom! * @shapes.length
      @shapes.splice i, 1

  add: !->
    if @shapes.length >= imageShapes then @shapes.splice 0, 1
    # lean towards adding at the top
    i = Math.floor highWeightedRandom! * @shapes.length
    @shapes.splice i, 0, randomShape!

  fork: !->
    if @shapes.length >= imageShapes then @shapes.splice 0, 1
    # lean towards adding at the top
    i = Math.floor highWeightedRandom! * @shapes.length
    @shapes.splice i, 0, @shapes[i].mutate!

  swap: !->
    if @shapes.length >= 2
      # lean towards swapping at the top
      i = Math.floor highWeightedRandom! * (@shapes.length - 1)
      tmp = @shapes[i]
      @shapes[i] = @shapes[i + 1]
      @shapes[i + 1] = tmp

  mutateShape: !->
    if @shapes.length
      # lean towards mutating at the top
      i = Math.floor highWeightedRandom! * @shapes.length
      @shapes[i] = @shapes[i].mutate!

  mutate: ->
    child = new Painting @shapes
    child.origin = 'M'
    roll = Math.random!
    if roll < 0.05
      child.add!
    if roll < 0.10
      child.fork!
    else if roll < 0.25
      child.remove!
    else if roll < 0.30
      child.swap!
    else
      child.mutateShape!
    return child

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
    new Painting shapes, 'C'

class Shape
  (source) ->
    if source
      for key, val of source
        this[key] = val
    else
      @randomize!

class Triangle extends Shape

  randomize: !->
    @rotate = 0
    @x0 = randomX!
    @y0 = randomY!
    @x1 = randomX!
    @y1 = randomY!
    @x2 = randomX!
    @y2 = randomY!
    @color = new Color!

  paint: !(ctx) ->
    ctx.save!
    ctx.fillStyle = @color.fillStyle!
    ctx.rotate @rotate
    ctx.beginPath!
    ctx.moveTo @x0, @y0
    ctx.lineTo @x1, @y1
    ctx.lineTo @x2, @y2
    ctx.closePath!
    ctx.fill!
    ctx.restore!

  move: ->
    r = randomRadius!
    a = Math.random! * Math.PI * 2
    dx = r * Math.cos a
    dy = r * Math.sin a
    @x0 += dx
    @y0 += dy
    @x1 += dx
    @y1 += dy
    @x2 += dx
    @y2 += dy

  copy: -> new Triangle this

  mutate: ->
    roll = Math.random!
    child = @copy!
    if roll < 0.1
      child.x0 = randomX!
    else if roll < 0.2
      child.y0 = randomY!
    else if roll < 0.3
      child.x1 = randomX!
    else if roll < 0.4
      child.y1 = randomY!
    else if roll < 0.5
      child.x2 = randomX!
    else if roll < 0.6
      child.y2 = randomY!
    else if roll < 0.7
      child.rotate += (lowWeightedRandom! - 0.5) * 2 * Math.PI
    else if roll < 0.8
      child.move!
    else
      child.color = @color.mutate!
    return child

class Oval extends Shape

  randomize: !->
    @sx = @sy = 1
    @rotate = 0
    @x = randomX!
    @y = randomY!
    @r = randomRadius!
    @color = new Color!

  paint: !(ctx) ->
    ctx.save!
    ctx.fillStyle = @color.fillStyle!
    ctx.rotate @rotate
    ctx.scale @sx, @sy
    ctx.beginPath!
    ctx.arc @x, @y, @r, 0 , 2 * Math.PI, false
    ctx.closePath!
    ctx.fill!
    ctx.restore!

  move: ->
    r = randomRadius!
    a = Math.random! * Math.PI * 2
    @x += r * Math.cos a
    @y += r * Math.sin a

  copy: -> new Oval this

  mutate: ->
    roll = Math.random!
    child = @copy!
    if roll < 0.10
      child.rotate += (lowWeightedRandom! - 0.5) * 2 * Math.PI
    else if roll < 0.20
      child.sx += (Math.random! - 0.5) / 2
    else if roll < 0.30
      child.sy += (Math.random! - 0.5) / 2
    else if roll < 0.60
      child.move!
    else
      child.color = @color.mutate!
    return child

randomShape = ->
  if Math.random! < 0.5
    new Triangle!
  else
    new Oval!

targetData = null
bestData = null

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

breed = !->
  ++generationNumber
  elapsed = (Date.now! - startTime) / 1000
  document.getElementById('generation').innerText = generationNumber
  document.getElementById('time').innerText = Math.floor elapsed
  document.getElementById('speed').innerText = Math.floor generationNumber / elapsed
  paintings.sort (a, b) -> (b.score - a.score) || (a.shapes.length - b.shapes.length)
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

window.addEventListener 'load', ->
  boxes = document.getElementById('boxes')
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
    boxes.appendChild div

  img = new Image!
  img.onload = ->
    ctx = target.getContext '2d'
    ctx.drawImage img, 0, 0, imageWidth, imageHeight
    targetData := (ctx.getImageData 0, 0, imageWidth, imageHeight).data
    bestPossibleScore = findBestPossibleScore!
    for i in [0 to generationSize - 1]
      painting = new Painting()
      paintings.push painting
      painting.show i
    setTimeout breed, 0
  img.src = 'Lenna.png'

