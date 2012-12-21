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

imageWidth = 100
imageHeight = 100
imageShapes = 100
imageRadius = -> (Math.sqrt imageWidth * imageWidth + imageHeight * imageHeight) / 2

generationKeep = 4
generationMutate = 15
generationCross = 7
generationSize = -> generationKeep + generationMutate + generationCross
generationStartCross = 0
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
randomRadius = -> Math.floor lowWeightedRandom! * imageRadius! / 2
randomByte = -> Math.floor Math.random! * 256
randomPainting = -> Math.floor Math.random! * paintings.length
clamp = (min, n, max) -> if n < min then min else if n > max then max else n

setText = (element, text) -> element.innerText = element.textContent = text

diffPoint = (d1, x1, y1, d2, x2, y2) ->
  b1 = (x1 + (y1 * imageWidth)) * 4
  b2 = (x2 + (y2 * imageWidth)) * 4
  dr = d1[b1++] - d2[b2++]
  dg = d1[b1++] - d2[b2++]
  db = d1[b1++] - d2[b2++]
  Math.sqrt (dr * dr + dg * dg + db * db) / (3 * 255 * 255)

class Point
  (@x, @y) -> unless x? then @randomize!

  randomize: ->
    @x = randomX!
    @y = randomY!
    return this

  mutate: ->
    r = randomRadius!
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
      child.r = clamp(0, @r + Math.random! * 10 - 5, 255)
    else if roll < 0.50
      child.g = clamp(0, @g + Math.random! * 10 - 5, 255)
    else if roll < 0.75
      child.b = clamp(0, @b + Math.random! * 10 - 5, 255)
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
    canvas.width = imageWidth
    canvas.height = imageHeight
    ctx = canvas.getContext '2d'
    # lay down an opaque white, a clear background looks white but compares black
    ctx.fillStyle = '#ffffff'
    ctx.fillRect 0, 0, imageWidth, imageHeight
    for shape in @shapes
      shape.paint ctx

  show: (box) ->
    canvas = box.children[0]
    @paint canvas
    unless @score then @diffScore canvas
    label = '@' + Math.floor(@score * 10000) + ' #' + @shapes.length
    if @age
      label += ' ' + @origin + @age
    setText box.children[1], label

  diffScore: (canvas) ->
    ctx = canvas.getContext '2d'
    score = 0
    points = []
    data = (ctx.getImageData 0, 0, imageWidth, imageHeight).data
    y = 0
    while y < imageHeight
      x = 0
      while x < imageWidth
        diff = (diffPoint data, x, y, targetData, x, y)
        points.push diff
        score += diff * weightMap[x + (y * imageWidth)]
        ++x
      ++y
    @score = score / (imageHeight * imageWidth)
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
    roll = Math.random!
    if roll < 0.10
      child.origin = 'A'
      child.add!
    else if roll < 0.20
      child.origin = 'R'
      child.remove!
    else if roll < 0.30
      child.origin = 'X'
      child.swap!
    else if roll < 0.40
      child.origin = 'F'
      child.fork!
    else
      child.origin = 'S'
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

class Triangle extends Shape

  randomize: !->
    @rotate = 0
    @p0 = new Point!
    @p1 = @p0.mutate!
    @p2 = @p0.mutate!
    @color = new Color!

  paint: !(ctx) ->
    ctx.save!
    ctx.fillStyle = @color.fillStyle!
    ctx.rotate @rotate
    ctx.beginPath!
    ctx.moveTo @p0.x, @p0.y
    ctx.lineTo @p1.x, @p1.y
    ctx.lineTo @p2.x, @p2.y
    ctx.closePath!
    ctx.fill!
    ctx.restore!

  copy: -> new Triangle this

  mutate: ->
    roll = Math.random!
    child = @copy!
    if roll < 0.2
      child.p0 = @p0.mutate!
    else if roll < 0.4
      child.p1 = @p1.mutate!
    else if roll < 0.6
      child.p2 = @p2.mutate!
    else if roll < 0.8
      child.rotate += (lowWeightedRandom! - 0.5) * 2 * Math.PI
    else
      child.color = @color.mutate!
    return child

class Oval extends Shape

  randomize: !->
    @sx = Math.random! + 0.5
    @sy = Math.random! + 0.5
    @rotate = Math.random! * 2 * Math.PI
    @center = new Point!
    @r = randomRadius!
    @color = new Color!

  paint: !(ctx) ->
    ctx.save!
    ctx.fillStyle = @color.fillStyle!
    ctx.rotate @rotate
    ctx.scale @sx, @sy
    ctx.beginPath!
    ctx.arc @center.x, @center.y, @r, 0 , 2 * Math.PI, false
    ctx.closePath!
    ctx.fill!
    ctx.restore!

  copy: -> new Oval this

  mutate: ->
    roll = Math.random!
    child = @copy!
    if roll < 0.20
      child.rotate += (lowWeightedRandom! - 0.5) * 2 * Math.PI
    else if roll < 0.40
      child.sx += (Math.random! - 0.5) / 4
    else if roll < 0.60
      child.sy += (Math.random! - 0.5) / 4
    else if roll < 0.80
      child.center = @center.mutate!
    else
      child.color = @color.mutate!
    return child

randomShape = ->
  if Math.random! < 0.8
    new Triangle!
  else
    new Oval!

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
  if generationNumber >= generationStartCross
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
        diffPoint(targetData, x, y, targetData, l, u) +
        diffPoint(targetData, x, y, targetData, x, u) +
        diffPoint(targetData, x, y, targetData, r, u) +
        diffPoint(targetData, x, y, targetData, l, y) +
        diffPoint(targetData, x, y, targetData, r, y) +
        diffPoint(targetData, x, y, targetData, l, d) +
        diffPoint(targetData, x, y, targetData, x, d) +
        diffPoint(targetData, x, y, targetData, r, d))
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
    box = createBox 'cross'
    boxesElement.appendChild box
    crossBoxes.push box

  img = new Image!
  img.addEventListener 'load', ->
    if img.width > img.height
      imageWidth := Math.floor img.width / img.height * 100
      imageHeight := 100
    else
      imageHeight := Math.floor img.height / img.width * 100
      imageWidth := 100
    target.width = imageWidth
    target.height = imageHeight
    ctx = target.getContext '2d'
    ctx.drawImage img, 0, 0, imageWidth, imageHeight
    targetData := (ctx.getImageData 0, 0, imageWidth, imageHeight).data
    generateWeightMap!
    restart!

  imageSelect = document.getElementById 'imageSelect'
  imageSelect.selectedIndex = Math.floor Math.random! * imageSelect.options.length
  img.src = 'images/' + imageSelect.value
  imageSelect.addEventListener 'change', ->
    img.src = 'images/' + imageSelect.value

