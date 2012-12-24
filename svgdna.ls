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

storageKey = null
svgId = 0

paintingBaseSize = 100
paintingWidth = paintingBaseSize
paintingHeight = paintingBaseSize
paintingMaxShapes = 100

shapeSize = 20
alphaMax = 0.6
alphaMin = 0.3

generationKeep = 4
generationMutate = 15
generationCross = 2
generationSize = -> generationKeep + generationMutate + generationCross
generationNumber = 0
cumulativeTime = 0

paintings = []
survivorBoxes = []
mutantBoxes = []
crossBoxes = []

attempts = {}
successes = {}

attempt = (type, success) ->
  attempts[type] = (attempts[type] || 0) + 1
  if success
    successes[type] = (successes[type] || 0) + 1

lowWeightedRandom = -> Math.cos(Math.random! * Math.PI / 2)
highWeightedRandom = -> Math.sin(Math.random! * Math.PI / 2)

randomX = -> Math.floor Math.random! * paintingWidth
randomY = -> Math.floor Math.random! * paintingHeight
randomByte = -> Math.floor Math.random! * 256
randomPainting = -> Math.floor Math.random! * paintings.length
randomSign = -> if Math.random! < 0.5 then -1 else 1

clamp = (min, n, max) -> if n < min then min else if n > max then max else n
between = (min, max) -> (Math.random! * (max - min) + min)
plusOrMinus = (min, max) -> randomSign! * between max, min

format = (n) ->
  if n < 0
    n = -n
    sign = '-'
  else
    sign = ''
  if n >= 100
    sign + Math.floor(n).toString!
  else if n < 1
    sign + n.toString!.slice(1)
  else
    sign + n.toString!.slice(0,4)

setText = (element, text) -> element.innerText = element.textContent = text

diffPoint = (d, x1, y1, x2, y2) ->
  b1 = (x1 + (y1 * paintingWidth)) * 4
  b2 = (x2 + (y2 * paintingWidth)) * 4
  dr = d[b1++] - d[b2++]
  dg = d[b1++] - d[b2++]
  db = d[b1++] - d[b2++]
  Math.sqrt (dr * dr + dg * dg + db * db) / (3 * 255 * 255)

stringifier = (key, val) ->
  if typeof val == 'object'
    val.protoName = val.constructor.name
  if key == 'diffMap'
    return undefined
  return val

reviver = (key, val) ->
  if val && val.protoName
    val.constructor = window[val.protoName]
    val.__proto__ = val.constructor.prototype
  return val

class Point
  (@x, @y) -> unless x? then @randomize!

  randomize: ->
    @x = randomX!
    @y = randomY!
    return this

  mutate: ->
    r = plusOrMinus(shapeSize / 8, shapeSize / 2)
    a = Math.random! * Math.PI * 2
    dx = r * Math.cos a
    dy = r * Math.sin a
    new Point (Math.floor @x + dx), (Math.floor @y + dy)

  svg: -> @x + ',' + @y

class Color

  (@r, @g, @b, @a) -> unless @r? then @randomize!

  randomize: ->
    @r = randomByte!
    @g = randomByte!
    @b = randomByte!
    @a = between alphaMin, alphaMax
    return this

  fillStyle: -> 'rgba(' + @r + ',' + @g + ',' + @b + ',' + @a + ')'

  svg: -> "stop-color='rgb(" + @r + "," + @g + "," + @b + ")' stop-opacity='" + format(@a) + "'"

  mutate: ->
    child = new Color @r, @g, @b, @a
    roll = Math.random!
    if roll < 0.25
      child.r = Math.floor clamp(0, @r + plusOrMinus(32, 64), 255)
    else if roll < 0.50
      child.g = Math.floor clamp(0, @g + plusOrMinus(32, 64), 255)
    else if roll < 0.75
      child.b = Math.floor clamp(0, @b + plusOrMinus(32, 64), 255)
    else
      child.a = clamp(alphaMin, @a + plusOrMinus(0.05, 0.20), alphaMax)
    return child

class Painting
  (shapes, @origin) -> if shapes then @shapes = shapes.slice(0) else @randomize!

  randomize: ->
    @shapes = [new Shape!]
    @origin = 'random'
    return this

  paint: !(canvas, scale, opaque) ->
    canvas.width = paintingWidth * scale
    canvas.height = paintingHeight * scale
    ctx = canvas.getContext '2d'
    ctx.save!
    ctx.scale scale, scale
    if opaque
      # lay down an opaque white, a clear background looks white but compares black
      ctx.fillStyle = '#ffffff'
      ctx.fillRect 0, 0, paintingWidth, paintingHeight
    else
      ctx.clearRect 0, 0, paintingWidth, paintingHeight
    for shape in @shapes
      shape.paint ctx
    ctx.restore!

  show: (box) ->
    canvas = box.children[0]
    @paint canvas, 1, true
    unless @score then @diffScore canvas
    label = Math.floor(@score) + (if @age then ' +' + @age else '')
    setText box.children[1], label

  diffScore: (canvas) ->
    ctx = canvas.getContext '2d'
    score = 0
    diffMap = []
    data = (ctx.getImageData 0, 0, paintingWidth, paintingHeight).data
    i = w = 0
    l = data.length
    while i < l
      dr = data[i] - targetData[i++]
      dg = data[i] - targetData[i++]
      db = data[i] - targetData[i++]
      i++
      # should match diffPoint above
      diff = Math.sqrt (dr * dr + dg * dg + db * db) / (3 * 255 * 255)
      diffMap.push diff
      score += diff * weightMap[w++]
    @score = score
    @diffMap = diffMap

  paintDiffMap: (canvas) ->
    canvas.width = paintingWidth
    canvas.height = paintingHeight
    ctx = canvas.getContext '2d'
    diffData = ctx.createImageData(paintingWidth, paintingHeight)
    data = diffData.data
    i = 0
    for point in @diffMap
      color = Math.floor (1 - point) * 255
      data[i++] = color # r
      data[i++] = color # g
      data[i++] = color # b
      data[i++] = 255   # a
    ctx.putImageData diffData, 0, 0

  mutate: ->
    child = new Painting @shapes
    roll = Math.random!
    if roll < 0.01 && @shapes.length >= 1
      child.origin = 'remove'
      i = Math.floor * (@shapes.length - 1)
      child.shapes.splice(i, 1)
    else if roll < 0.02 && @shapes.length < paintingMaxShapes
      child.origin = 'add'
      child.shapes.push new Shape!
    else if roll < 0.05 && @shapes.length >= 2
      child.origin = 'order'
      # lean towards swapping at the top
      i = Math.floor highWeightedRandom! * (@shapes.length - 1)
      tmp = @shapes[i]
      child.shapes[i] = @shapes[i + 1]
      child.shapes[i + 1] = tmp
    else
      # lean towards mutating at the top
      i = Math.floor highWeightedRandom! * @shapes.length
      child.shapes[i] = @shapes[i].mutate!
      child.origin = child.shapes[i].origin
    return child

  cross: (other) ->
    i = j = 0
    shapes = []
    while i < @shapes.length && j < other.shapes.length
      if Math.random! < 0.5
        shapes.push @shapes[i++]
      else
        shapes.push other.shapes[j++]
    while i < @shapes.length
      shapes.push @shapes[i++]
    while j < other.shapes.length
      shapes.push other.shapes[j++]
    n = Math.floor shapes.length / 2
    i = 0
    while i++ < n
      shapes.splice (Math.floor Math.random! * shapes.length), 1
    new Painting shapes, 'cross'

  svg: ->
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + paintingWidth + "px' height='" + paintingHeight + "px' " +
      "viewbox='0 0 " + paintingWidth + " " + paintingHeight + "'>" +
      [shape.svg! for shape in @shapes].join('') +
    "</svg>"

class Shape
  (source) ->
    if source
      for key, val of source
        this[key] = val
    else
      @randomize!

  randomize: !->
    @sx = (Math.random! + 0.2) / 2
    @sy = (Math.random! + 0.2) / 2
    @rotate = Math.random! * 2 * Math.PI
    @p = new Point!
    @color1 = new Color!
    @color2 = new Color!
    @path = new Path!

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
    @path.paint ctx
    ctx.closePath!
    ctx.fill!
    ctx.restore!

  mutate: ->
    roll = Math.random! * 13
    child = new Shape this
    if roll < 7
      child.path = @path.mutate!
      child.origin = 'shape'
    else if roll < 8
      child.rotate += plusOrMinus(Math.PI / 32, Math.PI / 8)
      child.origin = 'orientation'
    else if roll < 9
      child.sx += plusOrMinus(0.1, 0.5)
      child.origin = 'size'
    else if roll < 10
      child.sy += plusOrMinus(0.1, 0.5)
      child.origin = 'size'
    else if roll < 11
      child.p = @p.mutate!
      child.origin = 'position'
    else if roll < 12
      child.color1 = @color1.mutate!
      child.origin = 'color'
    else
      child.color2 = @color2.mutate!
      child.origin = 'color'
    return child

  svg: ->
    gradientId = svgId++
    rotate = format(@rotate / Math.PI * 180)
    scale = format(@sx) + "," + format(@sy)
    transform = "translate(" + @p.svg! + ") rotate(" + rotate + ") scale(" + scale + ")"
    "<defs>" +
      "<linearGradient id='" + gradientId + "'>" +
        "<stop offset='0%' "   + @color1.svg! + "/>" +
        "<stop offset='100%' " + @color2.svg! + "/>" +
      "</linearGradient>" +
    "</defs>" +
    "<path transform='" + transform + "' fill='url(#" + gradientId + ")' d='" + @path.svg! + "'/>"

class Path

  (source) ->
    if source
      @points = source.points.slice 0
      @controls = source.controls.slice 0
    else @randomize!

  randomize: !->
    x = Math.floor (Math.random! - 0.5) * 2 * shapeSize
    y = Math.floor (Math.random! - 0.5) * 2 * shapeSize
    @points = [(new Point shapeSize, 0), (new Point x, y)]
    @controls = [point.mutate! for point in @points]

  paint: !(ctx) ->
    ctx.moveTo -shapeSize, 0
    for point, i in @points
      ctx.quadraticCurveTo point.x, point.y, @controls[i].x, @controls[i].y

  clamp: (point) ->
    x = Math.floor clamp(-shapeSize, point.x, shapeSize)
    y = Math.floor clamp(-shapeSize, point.y, shapeSize)
    new Point x, y

  mutate: ->
    roll = Math.random! * 8
    child = new Path this
    i = Math.floor Math.random! * @points.length
    # first point cannot be moved or deleted but curve can be adjusted
    if roll < 1 && @points.length < 10
      child.points.splice i, 0, @clamp @points[i].mutate!
      child.controls.splice i, 0, @clamp child.points[i].mutate!
    else if roll < 2 && i > 0
      child.points.splice i, 1
      child.controls.splice i, 1
    else if roll < 5 && i > 0
      child.points[i] = @clamp @points[i].mutate!
    else
      child.controls[i] = @clamp child.controls[i].mutate!
    return child

  svg: -> "M" + (-shapeSize) + ",0" + [("Q" + point.svg! + ' ' + @controls[i].svg!) for point, i in @points].join('')

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
      attempt child.origin, true
    else
      attempt child.origin, false
  for i in [0 to generationCross - 1]
    mom = randomPainting!
    dad = randomPainting!
    while mom == dad
      dad = randomPainting!
    child = paintings[mom].cross paintings[dad]
    child.show crossBoxes[i]
    if child.score < paintings[mom].score
      paintings[mom] = child
      attempt 'cross', true
    else if child.score < paintings[dad].score
      paintings[dad] = child
      attempt 'cross', true
    else
      attempt 'cross', false
  # show the best
  paintings.sort (a, b) -> (a.score - b.score) || (a.shapes.length - b.shapes.length)
  if paintings[0] != best
    (document.getElementById 'best-large').src = 'data:image/svg+xml;utf8,' + paintings[0].svg!
    if paintings[0].diffMap then paintings[0].paintDiffMap document.getElementById 'diff'
  best = paintings[0]
  for painting, i in paintings
    painting.age = (painting.age || 0) + 1
    painting.show survivorBoxes[i]
  # update stats
  ++generationNumber
  cumulativeTime += Date.now! - startTime
  setText document.getElementById('generation'), generationNumber
  setText document.getElementById('time'), (Math.floor cumulativeTime / 1000) + 's'
  setText document.getElementById('speed'), Math.floor generationNumber / (cumulativeTime / 1000)
  for key, val of attempts
    percent = (Math.floor (successes[key] || 0) / val * 100) + '%'
    fraction = (successes[key] || 0) + '/' + val
    setText document.getElementById('success-' + key), fraction + ' (' + percent + ')'
  # save
  if generationNumber % 100 == 0
    localStorage.setItem storageKey, JSON.stringify paintings, stringifier
  # and repeat
  setTimeout breed, 0

weightMap = null

generateWeightMap = ->
  edgeMap = generateEdgeMap!
  histoMap = generateHistoMap!
  i = 0
  weightMap := []
  while i < edgeMap.length
    weightMap.push clamp 0.02, edgeMap[i] + histoMap[i], 1
    i++
  paintWeightMap!

generateEdgeMap = ->
  edgeMap = []
  y = 0
  while y < paintingHeight
    x = 0
    while x < paintingWidth
      u = Math.max y - 1, 0
      l = Math.max x - 1, 0
      r = Math.min x + 1, paintingWidth - 1
      d = Math.min y + 1, paintingHeight - 1
      edge = (
        diffPoint(targetData, x, y, l, u) +
        diffPoint(targetData, x, y, x, u) +
        diffPoint(targetData, x, y, r, u) +
        diffPoint(targetData, x, y, l, y) +
        diffPoint(targetData, x, y, r, y) +
        diffPoint(targetData, x, y, l, d) +
        diffPoint(targetData, x, y, x, d) +
        diffPoint(targetData, x, y, r, d))
      edgeMap.push clamp(0, edge / 4, 1)
      ++x
    ++y
  return edgeMap

generateHistoMap = ->
  histogram = []
  i = 0
  max = 0
  while i < targetData.length
    r = targetData[i++]
    g = targetData[i++]
    b = targetData[i++]
    a = targetData[i++]
    color = (r .>>. 5) .<<. 6 .|. (g .>>. 5) .<<. 3 .|. (b .>>. 5)
    histogram[color] = (histogram[color] || 0) + 1
    if histogram[color] > max then max = histogram[color]
  histoMap = []
  i = 0
  while i < targetData.length
    r = targetData[i++]
    g = targetData[i++]
    b = targetData[i++]
    a = targetData[i++]
    color = (r .>>. 5) .<<. 6 .|. (g .>>. 5) .<<. 3 .|. (b .>>. 5)
    rarity = histogram[color] / (paintingWidth * paintingHeight) * histogram.length
    histoMap.push clamp 0, 1 - rarity, 1
  return histoMap

paintWeightMap = ->
  weights = document.getElementById('weights')
  weights.width = paintingWidth
  weights.height = paintingHeight
  ctx = weights.getContext '2d'
  imageData = ctx.createImageData(paintingWidth, paintingHeight)
  data = imageData.data
  i = 0
  for weight in weightMap
    color = Math.floor (1 - weight) * 255
    data[i++] = color # r
    data[i++] = color # g
    data[i++] = color # b
    data[i++] = 255   # a
  ctx.putImageData imageData, 0, 0

resetStats = ->
  cumulativeTime := 0
  generationNumber := 0
  attempts := {}
  successes := {}

restart = ->
  resetStats!
  paintings := [new Painting! for n in [1 to generationKeep]]

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
  target.width = paintingWidth
  target.height = paintingHeight
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
      paintingWidth := Math.floor img.width / img.height * paintingBaseSize
      paintingHeight := paintingBaseSize
    else
      paintingHeight := Math.floor img.height / img.width * paintingBaseSize
      paintingWidth := paintingBaseSize
    bestLarge.style.width = targetLarge.style.width = paintingWidth * 3 + 'px'
    bestLarge.style.height = targetLarge.style.height = paintingHeight * 3 + 'px'
    target.width = paintingWidth
    target.height = paintingHeight
    ctx = target.getContext '2d'
    ctx.drawImage img, 0, 0, paintingWidth, paintingHeight
    targetData := (ctx.getImageData 0, 0, paintingWidth, paintingHeight).data
    generateWeightMap!
    storageKey := img.src
    if window.__proto__ && localStorage.getItem storageKey
      paintings := JSON.parse localStorage.getItem(storageKey), reviver
      resetStats!
    else
      restart!
    localStorage.setItem 'url', img.src
    setTimeout breed, 0

  imageSelect = document.getElementById 'imageSelect'
  imageText = document.getElementById 'imageText'

  if localStorage.getItem 'url'
    imageSelect.selectedIndex = 0
    imageText.value = localStorage.getItem 'url'
  else
    imageSelect.selectedIndex = 1 + Math.floor Math.random! * imageSelect.options.length - 1
    imageText.value = 'images/' + imageSelect.value

  img.crossOrigin = ''
  targetLarge.src = img.src = imageText.value
  imageSelect.addEventListener 'change', ->
    if imageSelect.selectedIndex > 0
      imageText.value = targetLarge.src = img.src = 'images/' + imageSelect.value
    else
      imageText.value = ''
      imageText.focus!

  imageText.addEventListener 'change', ->
    imageSelect.selectedIndex = 0
    img.crossOrigin = ''
    targetLarge.src = img.src = imageText.value

  textureSelect = document.getElementById 'textureSelect'
  textureSelect.addEventListener 'change', ->
    bestLarge.style.backgroundImage = 'url(textures/' + textureSelect.value + ')'

  document.getElementById('restart').addEventListener 'click', restart

