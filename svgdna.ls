# Copyright 2012 Scott Vachalek

# This file is part of SVGDNA.

# SVGDNA is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# SVGDNA is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with SVGDNA.  If not, see <http://www.gnu.org/licenses/>

baseSize = 100
shapeSize = 20

imageWidth = baseSize
imageHeight = baseSize
imageShapes = 100
imageRadius = -> (Math.sqrt imageWidth * imageWidth + imageHeight * imageHeight) / 2

generationKeep = 4
generationMutate = 15
generationCross = 7
generationSize = -> generationKeep + generationMutate + generationCross
generationNumber = 0
cumulativeTime = 0

paintings = []
survivorBoxes = []
mutantBoxes = []
crossBoxes = []

lowWeightedRandom = -> Math.cos(Math.random! * Math.PI / 2)
highWeightedRandom = -> Math.sin(Math.random! * Math.PI / 2)

randomX = -> Math.floor Math.random! * imageWidth
randomY = -> Math.floor Math.random! * imageHeight
randomByte = -> Math.floor Math.random! * 256
randomPainting = -> Math.floor Math.random! * paintings.length
randomSign = -> if Math.random! < 0.5 then -1 else 1

clamp = (min, n, max) -> if n < min then min else if n > max then max else n
plusOrMinus = (min, max) -> randomSign! * (Math.random! * (max - min) + min)

setText = (element, text) -> element.innerText = element.textContent = text

diffPoint = (d, x1, y1, x2, y2) ->
  b1 = (x1 + (y1 * imageWidth)) * 4
  b2 = (x2 + (y2 * imageWidth)) * 4
  dr = d[b1++] - d[b2++]
  dg = d[b1++] - d[b2++]
  db = d[b1++] - d[b2++]
  Math.sqrt (dr * dr + dg * dg + db * db) / (3 * 255 * 255)

class Point
  (@x, @y) -> unless x? then @randomize!

  randomize: ->
    @x = randomX!
    @y = randomY!
    return this

  mutate: ->
    r = Math.floor plusOrMinus(shapeSize / 2, shapeSize * 2)
    a = Math.random! * Math.PI * 2
    dx = r * Math.cos a
    dy = r * Math.sin a
    new Point @x + dx, @y + dy

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
      child.r = Math.floor clamp(0, @r + plusOrMinus(8, 32), 255)
    else if roll < 0.50
      child.g = Math.floor clamp(0, @g + plusOrMinus(8, 32), 255)
    else if roll < 0.75
      child.b = Math.floor clamp(0, @b + plusOrMinus(8, 32), 255)
    else
      child.a = clamp(0, @a + plusOrMinus(0.05, 0.20), 1)
    return child

class Painting
  (shapes, @origin) -> if shapes then @shapes = shapes.slice(0) else @randomize!

  randomize: ->
    @shapes = [new Shape!]
    @origin = 'R'
    return this

  paint: !(canvas, scale) ->
    canvas.width = imageWidth * scale
    canvas.height = imageHeight * scale
    ctx = canvas.getContext '2d'
    ctx.save!
    ctx.scale scale, scale
    # lay down an opaque white, a clear background looks white but compares black
    ctx.fillStyle = '#ffffff'
    ctx.fillRect 0, 0, imageWidth, imageHeight
    for shape in @shapes
      shape.paint ctx
    ctx.restore!

  show: (box) ->
    canvas = box.children[0]
    @paint canvas, 1
    unless @score then @diffScore canvas
    label = Math.floor(@score) + ' ' + @origin + ' ' + (@age || '')
    setText box.children[1], label

  diffScore: (canvas) ->
    ctx = canvas.getContext '2d'
    score = 0
    points = []
    data = (ctx.getImageData 0, 0, imageWidth, imageHeight).data
    i = w = 0
    l = data.length
    while i < l
      dr = data[i] - targetData[i++]
      dg = data[i] - targetData[i++]
      db = data[i] - targetData[i++]
      i++
      # should match diffPoint above
      diff = Math.sqrt (dr * dr + dg * dg + db * db) / (3 * 255 * 255)
      points.push diff
      score += diff * weightMap[w++]
    @score = score
    @points = points

  paintDiff: (canvas) ->
    canvas.width = imageWidth
    canvas.height = imageHeight
    ctx = canvas.getContext '2d'
    imageData = ctx.createImageData(imageWidth, imageHeight)
    data = imageData.data
    i = 0
    for point in @points
      color = Math.floor (1 - point) * 255
      data[i++] = color # r
      data[i++] = color # g
      data[i++] = color # b
      data[i++] = 255   # a
    ctx.putImageData imageData, 0, 0

  remove: !->
    if @shapes.length > 1
      # lean towards removing from the bottom
      i = Math.floor lowWeightedRandom! * @shapes.length
      @shapes.splice i, 1

  add: !->
    if @shapes.length >= imageShapes then @shapes.splice 0, 1
    # lean towards adding at the top
    i = Math.floor highWeightedRandom! * @shapes.length
    @shapes.splice i, 0,  new Shape!

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
      @origin = @shapes[i].origin

  mutate: ->
    child = new Painting @shapes
    roll = Math.random!
    if roll < 0.01
      child.origin = '+'
      child.add!
    else if roll < 0.02
      child.origin = 'F'
      child.fork!
    else if roll < 0.05
      child.origin = '-'
      child.remove!
    else if roll < 0.10
      child.origin = 'X'
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
    new Painting shapes, 'X'

class Shape
  (source) ->
    if source
      for key, val of source
        this[key] = val
    else
      @randomize!

  randomize: !->
    @sx = Math.random! + 0.5
    @sy = Math.random! + 0.5
    @sx = @sy = 1
    @rotate = Math.random! * 2 * Math.PI
    @p = new Point!
    @color1 = new Color!
    @color2 = new Color!
    @paintPath = if Math.random! < 0.50 then triangle else oval

  paint: !(ctx) ->
    ctx.save!
    gradient = ctx.createLinearGradient -shapeSize, 0, shapeSize, 0
    gradient.addColorStop 0, @color1.fillStyle!
    gradient.addColorStop 1, @color2.fillStyle!
    ctx.fillStyle = gradient
    ctx.translate @p.x, @p.y
    ctx.rotate @rotate
    ctx.scale @sx, @sy
    ctx.beginPath!
    @paintPath ctx
    ctx.closePath!
    ctx.fill!
    ctx.restore!

  mutate: ->
    roll = Math.random! * 10
    child = new Shape this
    if roll < 1
      child.paintPath = if @paintPath == triangle then oval else triangle
      child.origin = 'O'
    else if roll < 2
      child.rotate += plusOrMinus(Math.PI / 16, Math.PI / 4)
      child.origin = 'R'
    else if roll < 3
      child.sx += plusOrMinus(0.1, 0.5)
      child.origin = 'W'
    else if roll < 4
      child.sy += plusOrMinus(0.1, 0.5)
      child.origin = 'H'
    else if roll < 6
      child.p = @p.mutate!
      child.origin = 'P'
    else if roll < 8
      child.color1 = @color1.mutate!
      child.origin = '{'
    else
      child.color2 = @color2.mutate!
      child.origin = '}'
    return child

triangle = !(ctx) ->
    r = shapeSize * 2 * Math.sqrt(Math.PI) / Math.pow(3, 3/4)
    ctx.moveTo -r, 0
    ctx.lineTo  r * Math.cos(Math.PI / 3), -r * Math.sin(Math.PI / 3)
    ctx.lineTo  r * Math.cos(Math.PI / 3),  r * Math.sin(Math.PI / 3)

oval = !(ctx) ->
    ctx.arc 0, 0, shapeSize, 0, 2 * Math.PI, false

targetData = null
bestData = null

breed = !->
  startTime = Date.now!
  # try some mutations
  for i in [0 to generationMutate - 1]
    n = randomPainting!
    mom = paintings[n]
    child = mom.mutate!
    child.show mutantBoxes[i]
    if child.score < mom.score
      paintings[n] = child
  for i in [0 to generationCross - 1]
    mom = randomPainting!
    dad = randomPainting!
    while mom == dad
      dad = randomPainting!
    child = paintings[mom].cross paintings[dad]
    child.show crossBoxes[i]
    if child.score < mom.score
      paintings[mom] = child
    else if child.score < dad.score
      paintings[dad] = child
  # show the best
  paintings.sort (a, b) -> (a.score - b.score) || (a.shapes.length - b.shapes.length)
  if paintings[0] != best
    paintings[0].paint (document.getElementById 'best-large'), 3 * (window.devicePixelRatio || 1);
  best = paintings[0]
  if best.score? then best.paintDiff document.getElementById 'diff'
  for painting, i in paintings
    painting.age = (painting.age || 0) + 1
    painting.show survivorBoxes[i]
  # update stats
  ++generationNumber
  cumulativeTime += Date.now! - startTime
  setText document.getElementById('generation'), generationNumber
  setText document.getElementById('time'), Math.floor cumulativeTime / 1000
  setText document.getElementById('speed'), Math.floor generationNumber / (cumulativeTime / 1000)
  setTimeout breed, 0

weightMap = null

generateWeightMap = ->
  weightMap := []
  y = 0
  while y < imageHeight
    x = 0
    while x < imageWidth
      u = Math.max y - 1, 0
      l = Math.max x - 1, 0
      r = Math.min x + 1, imageWidth - 1
      d = Math.min y + 1, imageHeight - 1
      weight = (
        diffPoint(targetData, x, y, l, u) +
        diffPoint(targetData, x, y, x, u) +
        diffPoint(targetData, x, y, r, u) +
        diffPoint(targetData, x, y, l, y) +
        diffPoint(targetData, x, y, r, y) +
        diffPoint(targetData, x, y, l, d) +
        diffPoint(targetData, x, y, x, d) +
        diffPoint(targetData, x, y, r, d))
      weightMap.push clamp(0.05, weight / 4, 1)
      ++x
    ++y
  paintWeightMap!

paintWeightMap = ->
  weights = document.getElementById('weights')
  weights.width = imageWidth
  weights.height = imageHeight
  ctx = weights.getContext '2d'
  imageData = ctx.createImageData(imageWidth, imageHeight)
  data = imageData.data
  i = 0
  for weight in weightMap
    color = Math.floor (1 - weight) * 255
    data[i++] = color # r
    data[i++] = color # g
    data[i++] = color # b
    data[i++] = 255   # a
  ctx.putImageData imageData, 0, 0

restart = ->
  cumulativeTime := 0
  generationNumber := 0
  paintings := [new Painting! for n in [1 to generationKeep]]
  setTimeout breed, 0

createBox = (cls) ->
  canvas = document.createElement 'canvas'
  box = document.createElement 'div'
  label = document.createElement 'p'
  box.className = 'box ' + cls
  box.appendChild canvas
  box.appendChild label
  return box

window.addEventListener 'load', ->
  boxesElement = document.getElementById('boxes')
  target = document.getElementById('target')
  targetLarge = document.getElementById('target-large')
  bestLarge = document.getElementById('best-large')
  target.width = imageWidth
  target.height = imageHeight
  i = 0
  for n in [1 to generationKeep]
    box = createBox 'survivor'
    boxesElement.appendChild box
    survivorBoxes.push box
  for n in [1 to generationMutate]
    box = createBox 'mutant'
    boxesElement.appendChild box
    mutantBoxes.push box
  for n in [1 to generationCross]
    box = createBox 'crossbreed'
    boxesElement.appendChild box
    crossBoxes.push box

  img = new Image!
  img.addEventListener 'load', ->
    if img.width > img.height
      imageWidth := Math.floor img.width / img.height * baseSize
      imageHeight := baseSize
    else
      imageHeight := Math.floor img.height / img.width * baseSize
      imageWidth := baseSize
    bestLarge.style.width = targetLarge.style.width = imageWidth * 3 + 'px'
    bestLarge.style.height = targetLarge.style.height = imageHeight * 3 + 'px'
    target.width = imageWidth
    target.height = imageHeight
    ctx = target.getContext '2d'
    ctx.drawImage img, 0, 0, imageWidth, imageHeight
    targetData := (ctx.getImageData 0, 0, imageWidth, imageHeight).data
    generateWeightMap!
    restart!

  imageSelect = document.getElementById 'imageSelect'
  imageSelect.selectedIndex = Math.floor Math.random! * imageSelect.options.length
  targetLarge.src = img.src = 'images/' + imageSelect.value
  imageSelect.addEventListener 'change', ->
    targetLarge.src = img.src = 'images/' + imageSelect.value

