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
showIndex = 0
lastShownIndex = 0

paintingBaseSize = 100
paintingWidth = paintingBaseSize
paintingHeight = paintingBaseSize
paintingMaxShapes = 100

alphaMin = 30
alphaMax = 60

# these are on scaled path coordinates
xMin = yMin = -50
xMax = yMax = +50
xMid = yMid = (xMin + xMax) / 2

shapeSize = 10
xRange = xMax - xMin
scaleMax = Math.round 100 * paintingBaseSize / xRange # shape is paintingBaseSize pixels
scaleMin = Math.round 100 * 1 / xRange                # shape is 1 pixel
scaleMid = Math.round 100 * shapeSize / xRange        # shape is shapeSize pixels

generationKeep = 4
generationMutate = 15
generationCross = 1
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

between = (min, max) -> Math.floor (Math.random! * (max - min + 1) + min)
betweenHigh = (min, max) -> Math.floor (Math.sin(Math.random! * Math.PI / 2) * (max - min + 1) + min)
randomByte = -> between 0, 255
randomPainting = -> between 0, paintings.length - 1
randomSign = -> if Math.random! < 0.5 then -1 else 1

clamp = (min, n, max) -> if n < min then min else if n > max then max else n
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
    sign + n.toString!.slice(1,4)
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
  if val && typeof val == 'object'
    val._ = val.constructor.name
  if key == 'diffMap' || key == 'canvas'
    return undefined
  return val

reviver = (key, val) ->
  if val && val._
    val.constructor = window[val._]
    val.__proto__ = val.constructor.prototype
  return val

class Point
  (@x, @y) -> unless x? then @randomize!

  randomize: ->
    @x = between 1, paintingWidth
    @y = between 1, paintingHeight
    return this

  mutate: (scale) ->
    r = between 1, clamp(1, shapeSize / scale, 50)
    a = between 1, 360
    dx = r * Math.cos a
    dy = r * Math.sin a
    new Point (Math.round @x + dx), (Math.round @y + dy)

  svg: -> @x + ',' + @y

class Color

  (@r, @g, @b, @a) -> unless @r? then @randomize!

  randomize: ->
    @r = randomByte!
    @g = randomByte!
    @b = randomByte!
    @a = between alphaMin, alphaMax
    return this

  fillStyle: -> 'rgba(' + @r + ',' + @g + ',' + @b + ',' + @a/100 + ')'

  svg: ->
    rgb = '00000' + (@b .|. (@g .<<. 8) .|. (@r .<<. 16)).toString(16);
    "stop-color='#" + rgb.substr(rgb.length - 6, 6) + "' stop-opacity='" + format(@a / 100) + "'"

  mutate: (scale)  ->
    min = clamp 8, (Math.round 16 / scale), 64
    max = 2 * min
    child = new Color @r, @g, @b, @a
    switch between 1, 4
      when 1
        child.r = Math.round clamp 0, @r + plusOrMinus(min, max), 255
      when 2
        child.g = Math.round clamp 0, @g + plusOrMinus(min, max), 255
      when 3
        child.b = Math.round clamp 0, @b + plusOrMinus(min, max), 255
      when 4
        min = clamp 1, (Math.round 5 / scale), 10
        max = 2 * min
        child.a = clamp alphaMin, @a + plusOrMinus(min, max), alphaMax
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
    unless @canvas == canvas then
      @paint canvas, 1, true
      @diffScore canvas
      @canvas = canvas
    label = 'Score: ' + Math.floor(@score) + (if @age then ' Age: ' + @age else '')
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
    unless @diffMap then
      @paint canvas
      @diffScore canvas
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
    roll = between 0, 99
    if roll < 1 && @shapes.length > 1
      child.origin = 'remove'
      i = betweenHigh 0, @shapes.length - 1
      child.shapes.splice(i, 1)
    else if roll < 2 && @shapes.length < paintingMaxShapes
      child.origin = 'add'
      child.shapes.push new Shape!
    else if roll < 5 && @shapes.length >= 2
      child.origin = 'order'
      i = betweenHigh 0, @shapes.length - 2 # not the last
      tmp = @shapes[i]
      child.shapes[i] = @shapes[i + 1]
      child.shapes[i + 1] = tmp
    else
      i = betweenHigh 0, @shapes.length - 1
      child.shapes[i] = @shapes[i].mutate!
      child.origin = child.shapes[i].origin
    return child

  cross: (other) ->
    i = between (Math.round @shapes.length / 4), @shapes.length
    j = i + between (Math.round @shapes.length / 4), @shapes.length / 3/4
    shapes = (@shapes.slice 0, i).concat(other.shapes.slice i, j).concat(@shapes.slice(j))
    new Painting shapes, 'cross'

  svg: ->
    w = paintingWidth
    h = paintingHeight
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + (w * 10) + "px' height='" + (h * 10) + "px' " +
      "viewBox='0 0 " + w + " " + paintingHeight + "'>" +
      "<title>" +
        "Generated by SVGDNA at http://svachalek.github.com/svgdna" +
      "</title>" +
      "<desc>" +
        "Original image: " + storageKey +
      "</desc>" +
      "<defs>" +
        [shape.svgGradient i for shape, i in @shapes].join('') +
        # should be clipped to viewbox but webkit doesn't in some circumstances; plus this allows for some creativity
        "<clipPath id='clip'>" +
          "<path d='M-1,-1L" + (w+1) + ",-1L" + (w+1) + "," + (h+1) + "L-1," + (h+1) + "Z'/>" +
        "</clipPath>" +
      "</defs>" +
      "<g clip-path='url(\#clip)'>" +
        [shape.svgPath i for shape, i in @shapes].join('') +
      "</g>" +
    "</svg>"

class Shape
  (source) ->
    if source
      for key, val of source
        this[key] = val
    else
      @randomize!

  randomize: !->
    @sx = @sy = scaleMid
    @rotate = between 1, 360
    @p = new Point!
    @color1 = new Color!
    @color2 = new Color!
    @path = new Path!

  paint: !(ctx) ->
    ctx.save!
    gradient = ctx.createLinearGradient xMin, 0, xMax, 0
    gradient.addColorStop 0, @color1.fillStyle!
    gradient.addColorStop 1, @color2.fillStyle!
    ctx.fillStyle = gradient
    ctx.translate @p.x, @p.y
    ctx.rotate @rotate * Math.PI / 180
    ctx.scale @sx / 100, @sy / 100
    ctx.beginPath!
    @path.paint ctx
    ctx.closePath!
    ctx.fill!
    ctx.restore!

  mutate: ->
    roll = between 0, 13
    scale = @sx * @sy / 10000 # 100x100 = 1, smaller is lower, bigger is higher
    child = new Shape this
    if roll < 7
      child.path = @path.mutate scale
      child.origin = 'shape'
    else if roll < 8
      child.rotate += plusOrMinus(5 / scale, 20 / scale)
      child.origin = 'orientation'
    else if roll < 9
      child.sx = clamp scaleMin, @sx + plusOrMinus(scaleMin, scaleMax / 8), scaleMax
      child.origin = 'size'
    else if roll < 10
      child.sy = clamp scaleMin, @sy + plusOrMinus(scaleMin, scaleMax / 8), scaleMax
      child.origin = 'size'
    else if roll < 11
      child.p = @p.mutate scale
      child.origin = 'position'
    else if roll < 12
      child.color1 = @color1.mutate scale
      child.origin = 'color'
    else
      child.color2 = @color2.mutate scale
      child.origin = 'color'
    return child

  svgGradient: (gradientId)  ->
    "<linearGradient id='" + gradientId + "'>" +
      "<stop offset='0%' "   + @color1.svg! + "/>" +
      "<stop offset='100%' " + @color2.svg! + "/>" +
    "</linearGradient>"

  svgPath: (gradientId) ->
    scale = format(@sx / 100) + "," + format(@sy / 100)
    transform = "translate(" + @p.svg! + ") rotate(" + @rotate + ") scale(" + scale + ")"
    "<path transform='" + transform + "' fill='url(#" + gradientId + ")' d='" + @path.svg! + "'/>"

class Path

  (source) ->
    if source
      @points = source.points.slice 0
      @controls = source.controls.slice 0
    else @randomize!

  randomize: !->
    x = between xMin, xMax
    y = between yMin, yMax
    # first point is implicit (xMin, yMid)
    @points = [(new Point xMax, yMid), (new Point x, y)]
    @controls = [point.mutate 1 for point in @points]

  paint: !(ctx) ->
    ctx.moveTo xMin, yMid
    for point, i in @points
      ctx.quadraticCurveTo point.x, point.y, @controls[i].x, @controls[i].y

  clamp: (point) ->
    x = clamp xMin, point.x, xMax
    y = clamp yMin, point.y, yMax
    new Point x, y

  mutate: (scale) ->
    roll = between 0, 7
    child = new Path this
    i = between 0, @points.length - 1
    # points[0] cannot be moved or deleted but curve can be adjusted
    if roll < 1 && @points.length < 10
      child.points.splice i, 0, @clamp @points[i].mutate scale
      child.controls.splice i, 0, @clamp child.points[i].mutate scale
    else if roll < 2 && i > 0
      child.points.splice i, 1
      child.controls.splice i, 1
    else if roll < 5 && i > 0
      child.points[i] = @clamp @points[i].mutate scale
    else
      child.controls[i] = @clamp child.controls[i].mutate scale
    return child

  svg: -> 'M' + xMin + ',' + yMid + [("Q" + point.svg! + ' ' + @controls[i].svg!) for point, i in @points].join('')

targetData = null
bestData = null

mutate = !->
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

crossover = !->
  for i in [0 to generationCross - 1]
    m = randomPainting!
    d = randomPainting!
    while m == d
      d = randomPainting!
    mom = paintings[m]
    dad = paintings[d]
    child = mom.cross dad
    child.show crossBoxes[i]
    if child.score < mom.score && child.score < dad.score
      paintings[if mom.score < dad.score then d else m] = child
      attempt 'cross', true
    else
      attempt 'cross', false

breed = !->
  startTime = Date.now!
  previousPaintings = paintings.slice 0
  # try some mutations
  mutate!
  crossover!
  # show the best
  if showIndex != lastShownIndex || paintings[showIndex] != previousPaintings[showIndex]
    lastShownIndex = showIndex
    # the base64 encoding shouldn't be necessary but Firefox can't handle the image otherwise
    (document.getElementById 'best-large').src = 'data:image/svg+xml;base64,' + base64.encode paintings[showIndex].svg!
    paintings[showIndex].paintDiffMap document.getElementById 'diff'
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
    box.dataIndex = n - 1
    box.addEventListener 'click', !-> showIndex := @dataIndex
  for n in [1 to generationMutate]
    box = createBox 'mutant'
    boxesElement.appendChild box
    mutantBoxes.push box
  for n in [1 to generationCross]
    box = createBox 'crossover'
    boxesElement.appendChild box
    crossBoxes.push box

  img = new Image!
  img.addEventListener 'load', !->
    targetLarge.src = img.src
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
      paintings := (JSON.parse localStorage.getItem(storageKey), reviver).concat(paintings).slice 0, generationKeep
      resetStats!
    else
      restart!
    sessionStorage.setItem 'url', img.src
    setTimeout breed, 0

  img.onerror = !->
    alert 'Failed to load the selected image. It is likely that the image server does not allow Cross-Origin Resource Sharing.'

  imageSelect = document.getElementById 'imageSelect'
  imageText = document.getElementById 'imageText'

  if sessionStorage.getItem 'url'
    imageSelect.selectedIndex = 0
    imageText.value = sessionStorage.getItem 'url'
  else
    imageSelect.selectedIndex = between 1, imageSelect.options.length - 1
    imageText.value = 'images/' + imageSelect.value

  img.crossOrigin = ''
  img.src = imageText.value
  imageSelect.addEventListener 'change', ->
    if imageSelect.selectedIndex > 0
      imageText.value = img.src = 'images/' + imageSelect.value
    else
      imageText.value = ''
      imageText.focus!

  imageText.addEventListener 'change', ->
    imageSelect.selectedIndex = 0
    img.crossOrigin = ''
    img.src = imageText.value

  textureSelect = document.getElementById 'textureSelect'
  textureSelect.addEventListener 'change', ->
    bestLarge.style.backgroundImage = 'url(textures/' + textureSelect.value + ')'

  document.getElementById('restart').addEventListener 'click', restart

