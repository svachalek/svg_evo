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

paintingBaseSize = 100
testScale = 1
weightMin = 0.02
radialSort = true

# determines complexity of result
# cost is 1 per variable needed in the solution, thus adding 1 point to a shape is twice (x and y) costScoreRatio
# score is the sum of the squares of dR, dG, dB, thus 8 off on each dimension is 64 + 64 + 64 = 196
# thus to allow 1 to fix 1 such pixel would implies costScoreRatio = 196 / 2
costScoreRatio = 200

alphaMin = 30
alphaMax = 60
pointsMin = 6

generationKeep = 4
generationMutate = 16
generationCross = 1
generationNumber = 0
cumulativeTime = 0

storageKey = 'paintings'
imageSource = null
target = null
targetData = null
weightMap = null
showIndex = 0
lastShownIndex = -1

paintingWidth = paintingBaseSize
paintingHeight = paintingBaseSize
paintings = []
survivorBoxes = []
mutantBoxes = []
crossBoxes = []

attempts = {}
successes = {}

# event handlers
onSvgImproved = ->
onGenerationComplete = ->
onScalePaintings = ->

attempted = []

attempt = !(type) ->
  attempts[type] = (attempts[type] || 0) + 1
  attempted.push type

failure = !->
  attempted := []
success = !->
  for type in attempted
    successes[type] = (successes[type] || 0) + 1
  attempted := []

between = (min, max) -> Math.floor (Math.random! * (max - min + 1) + min)
betweenHigh = (min, max) -> Math.floor ((Math.sin Math.random! * Math.PI / 2) * (max - min + 1) + min)
randomByte = -> between 0, 255
randomPainting = -> between 0, paintings.length - 1
randomSign = -> if Math.random! < 0.5 then -1 else 1

clamp = (min, n, max) -> if n < min then min else if n > max then max else n
plusOrMinus = (min, max) -> randomSign! * between max, min

setText = (element, text) -> element.innerText = element.textContent = text

diffPoint = (d, x1, y1, x2, y2) ->
  b1 = (x1 + (y1 * target.width)) * 4
  b2 = (x2 + (y2 * target.width)) * 4
  dr = d[b1++] - d[b2++]
  dg = d[b1++] - d[b2++]
  db = d[b1++] - d[b2++]
  Math.sqrt (dr * dr + dg * dg + db * db) / 0x30000

stringifier = (key, val) ->
  if val && typeof val == 'object'
    val._ = val.constructor.name
  if key == 'canvas'
    return undefined
  return val

reviver = (key, val) ->
  if val && val._
    val.constructor = window[val._]
    val.__proto__ = val.constructor.prototype
  return val

class Point
  (@x = (between 0, paintingWidth - 1), @y = (between 0, paintingHeight - 1)) ->

  mutate: ->
    dx = between -2, +2
    dy = between -2, +2
    new Point @x + dx, @y + dy

  angle: (p) -> ((Math.atan2 @y - p.y, @x - p.x) + 2 * Math.PI) % (2 * Math.PI)

  svg: -> @x + ',' + @y

class Color

  (@r = randomByte!, @g = randomByte!, @b = randomByte!, @a = (between alphaMin, alphaMax)) -> @setFillStyle!

  setFillStyle: -> @fillStyle = 'rgba(' + @r + ',' + @g + ',' + @b + ',' + @a/100 + ')'

  mutate: ->
    child = new Color @r, @g, @b, @a
    switch between 1, 4
      when 1
        child.r = clamp 0, @r + (plusOrMinus 1, 16), 255
        attempt 'rgb'
      when 2
        child.g = clamp 0, @g + (plusOrMinus 1, 16), 255
        attempt 'rgb'
      when 3
        child.b = clamp 0, @b + (plusOrMinus 1, 16), 255
        attempt 'rgb'
      when 4
        child.a = clamp alphaMin, @a + (plusOrMinus 1, 5), alphaMax
        attempt 'alpha'
    child.setFillStyle!
    return child

class Painting
  (@shapes = [new Shape!]) -> @score = 1/0 # infinity

  paint: !(canvas, opaque) ->
    ctx = canvas.getContext '2d'
    if opaque
      # lay down an opaque white, a clear background looks white but compares black
      ctx.fillStyle = '#ffffff'
      ctx.fillRect 0, 0, paintingWidth, paintingHeight
    else
      ctx.clearRect 0, 0, paintingWidth, paintingHeight
    for shape in @shapes
      shape.paint ctx

  show: (box) ->
    canvas = box.children[0]
    unless @canvas == canvas then
      @paint canvas, true
      @diffScore canvas
      @canvas = canvas
    if @age
      label = 'Score: ' + (Math.floor @score) + ' Age: ' + @age
      setText box.children[1], label

  diffScore: (canvas) ->
    ctx = canvas.getContext '2d'
    score = 0
    data = (ctx.getImageData 0, 0, target.width, target.height).data
    w = weightMap.length
    i = data.length
    while i
      --i # ignore alpha
      db = data[--i] - targetData[i]
      dg = data[--i] - targetData[i]
      dr = data[--i] - targetData[i]
      score += (dr * dr + dg * dg + db * db) * weightMap[--w]
    @score = (score + @cost! * costScoreRatio) / (target.width * target.height)

  paintDiffMap: (canvas) ->
    @paint canvas
    ctx = canvas.getContext '2d'
    testData = (ctx.getImageData 0, 0, target.width, target.height).data
    diffData = ctx.createImageData target.width, target.height
    ddd = diffData.data
    i = ddd.length
    while i
      ddd[--i] = 255 # opacity = 1
      ddd[--i] = Math.abs testData[i] - targetData[i]
      ddd[--i] = Math.abs testData[i] - targetData[i]
      ddd[--i] = Math.abs testData[i] - targetData[i]
    ctx.putImageData diffData, 0, 0

  mutate: ->
    child = new Painting @shapes.slice 0
    roll = between 0, 99
    if roll < 1 && @shapes.length > 1
      attempt 'remove-shape'
      i = betweenHigh 0, @shapes.length - 1
      child.shapes.splice i, 1
    else if roll < 2
      attempt 'add-shape'
      child.shapes.push new Shape!
    else if roll < 5 && @shapes.length >= 2
      attempt 'reorder-shapes'
      i = betweenHigh 0, @shapes.length - 2 # not the last
      tmp = @shapes[i]
      child.shapes[i] = @shapes[i + 1]
      child.shapes[i + 1] = tmp
    else
      i = betweenHigh 0, @shapes.length - 1
      child.shapes[i] = @shapes[i].mutate!
    return child

  cross: (other) ->
    len = Math.min @shapes.length, other.shapes.length
    i = between 1, len - 2
    j = between i + 1, len - 1
    shapes = (@shapes.slice 0, i).concat(other.shapes.slice i, j).concat(@shapes.slice j)
    attempt 'crossover'
    new Painting shapes

  svg: ->
    w = paintingWidth
    h = paintingHeight
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + (w * 10) + "px' height='" + (h * 10) + "px' " +
      "viewBox='0 0 " + w + " " + paintingHeight + "'>" +
      "<title>" +
        "Generated by SVG Evo at http://svachalek.github.com/svg_evo" +
      "</title>" +
      "<desc>" +
        "Original image: " + storageKey +
      "</desc>" +
      "<defs>" +
        # [shape.svgGradient i for shape, i in @shapes].join('') +
        # should be clipped to viewbox but webkit doesn't in some circumstances; plus this allows for some creativity
        "<clipPath id='clip'>" +
          "<path d='M-1,-1L" + (w+1) + ",-1L" + (w+1) + "," + (h+1) + "L-1," + (h+1) + "Z'/>" +
        "</clipPath>" +
      "</defs>" +
      "<g clip-path='url(\#clip)'>" +
        [shape.svg i for shape, i in @shapes].join('') +
      "</g>" +
    "</svg>"

  cost: -> [shape.cost! for shape in @shapes].reduce (a, b) -> a + b

class Shape
  (@color = new Color!, @path = new Path!) ->

  paint: !(ctx) ->
    ctx.fillStyle = @color.fillStyle
    ctx.beginPath!
    @path.paint ctx
    ctx.fill!

  mutate: ->
    roll = between 0, 5
    child = new Shape @color, @path
    if roll > 0
      child.path = @path.mutate!
    else
      child.color = @color.mutate!
    return child

  svg: (gradientId) ->
    "<path fill='" + @color.fillStyle + "' d='" + @path.svg! + "'/>"

  cost: -> @path.cost! + 4

class Path

  (@points = [], @center = new Point!) ->
    if @points.length < pointsMin
      while @points.length < pointsMin
        @points.push @center.mutate!
      @sort!

  paint: !(ctx) ->
    first = @points[0]
    ctx.moveTo first.x, first.y
    i = 1
    len = @points.length
    while i <= len
      control = @points[i++]
      point = @points[i++ % len]
      ctx.quadraticCurveTo control.x, control.y, point.x, point.y

  sort: !-> if radialSort then @points.sort (a, b) ~> (a.angle @center) - (b.angle @center)

  mutate: ->
    roll = between 0, 9
    child = new Path (@points.slice 0), @center
    if roll < 7
      i = between 0, child.points.length - 1
      child.points[i] = child.points[i].mutate!
      child.sort!
      attempt 'move-point'
    else if roll < 8 && @points.length >= pointsMin + 2
      i = between 0, child.points.length / 2 - 1
      child.points.splice i * 2, 1
      if i == 0
        child.points.pop!
      else
        child.points.splice i * 2 - 1, 1
      attempt 'remove-point'
    else if roll < 9
      child.center = child.center.mutate!
      child.sort!
      attempt 'move-center'
    else
      p = new Point!
      child.points.push p
      child.points.push p.mutate!
      child.sort!
      attempt 'add-point'
    return child

  svg: ->
    first = @points[0]
    svg = 'M' + first.svg!
    i = 1
    len = @points.length
    while i <= len
      control = @points[i++]
      point = @points[i++ % len]
      svg += 'Q' + control.svg! + ' ' + point.svg!
    return svg

  cost: -> @points.length * 2

mutate = !->
  mutationRate = Math.max 1, 5 - (Math.floor (Math.log generationNumber) / Math.LN10)
  for i in [0 to generationMutate - 1]
    n = i % paintings.length
    child = mom = paintings[n]
    j = mutationRate
    while j--
      child = child.mutate!
    child.show mutantBoxes[i]
    if child.score < mom.score
      paintings[n] = child
      success!
    else
      failure!

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
      success!
    else
      failure!

breed = !->
  startTime = Date.now!
  ++generationNumber
  # try some mutations
  previousPaintings = paintings.slice 0
  mutate!
  crossover!
  cumulativeTime := cumulativeTime + Date.now! - startTime
  # show the best
  if showIndex != lastShownIndex || paintings[showIndex] != previousPaintings[showIndex]
    lastShownIndex := showIndex
    onSvgImproved!
  onGenerationComplete!
  # save
  if generationNumber % 100 == 0
    sessionStorage.setItem storageKey, JSON.stringify paintings, stringifier
  # and repeat
  setTimeout breed, 0

generateWeightMap = !->
  edgeMap = generateEdgeMap!
  histoMap = generateHistoMap!
  i = edgeMap.length
  weightMap := new Array i
  while i--
    weightMap[i] = clamp weightMin, edgeMap[i] + histoMap[i], 1

generateEdgeMap = ->
  edgeMap = new Array target.height * target.width
  i = edgeMap.length
  y = target.height
  while y--
    x = target.width
    while x--
      u = Math.max y - 1, 0
      l = Math.max x - 1, 0
      r = Math.min x + 1, target.width - 1
      d = Math.min y + 1, target.height - 1
      edge =
        (diffPoint targetData, x, y, l, u) +
        (diffPoint targetData, x, y, x, u) +
        (diffPoint targetData, x, y, r, u) +
        (diffPoint targetData, x, y, l, y) +
        (diffPoint targetData, x, y, r, y) +
        (diffPoint targetData, x, y, l, d) +
        (diffPoint targetData, x, y, x, d) +
        (diffPoint targetData, x, y, r, d)
      edgeMap[--i] = clamp 0, edge / 4, 1
  return edgeMap

generateHistoMap = ->
  histogram = []
  i = targetData.length
  max = 0
  while i
    a = targetData[--i]
    b = targetData[--i]
    g = targetData[--i]
    r = targetData[--i]
    color = (r .>>. 5) .<<. 6 .|. (g .>>. 5) .<<. 3 .|. (b .>>. 5)
    histogram[color] = (histogram[color] || 0) + 1
    if histogram[color] > max then max = histogram[color]
  histoMap = new Array targetData.length / 4
  i = targetData.length
  while i
    a = targetData[--i]
    b = targetData[--i]
    g = targetData[--i]
    r = targetData[--i]
    color = (r .>>. 5) .<<. 6 .|. (g .>>. 5) .<<. 3 .|. (b .>>. 5)
    rarity = histogram[color] / (target.width * target.height) * histogram.length
    histoMap[i / 4] = clamp 0, 1 - rarity, 1
  return histoMap

resetStats = ->
  cumulativeTime := 0
  generationNumber := 0
  attempts := {}
  successes := {}

restart = ->
  resetStats!
  paintings := [new Painting! for n in [1 to generationKeep]]

createBox = (cls, text) ->
  canvas = document.createElement 'canvas'
  box = document.createElement 'div'
  label = document.createElement 'p'
  box.className = 'box ' + cls
  box.appendChild canvas
  box.appendChild label
  setText label, text
  return box

scaleBox = (box) ->
  canvas = box.children[0]
  canvas.width = target.width
  canvas.height = target.height
  (canvas.getContext '2d').setTransform canvas.width / paintingWidth, 0, 0, canvas.height / paintingHeight, 0, 0

scalePaintings = ->
  if imageSource.width > imageSource.height
    paintingWidth := Math.floor imageSource.width / imageSource.height * paintingBaseSize
    paintingHeight := paintingBaseSize
  else
    paintingHeight := Math.floor imageSource.height / imageSource.width * paintingBaseSize
    paintingWidth := paintingBaseSize
  target.width = paintingWidth * testScale
  target.height = paintingHeight * testScale
  ctx = target.getContext '2d'
  ctx.drawImage imageSource, 0, 0, target.width, target.height
  targetData := (ctx.getImageData 0, 0, target.width, target.height).data
  generateWeightMap!
  for box in survivorBoxes.concat(mutantBoxes).concat(crossBoxes)
    scaleBox box
  onScalePaintings!

window.addEventListener 'load', !->
  boxesElement = document.getElementById 'boxes'
  target := document.getElementById 'target'
  i = 0
  for n in [1 to generationKeep]
    box = createBox 'survivor', 'Survivor'
    boxesElement.appendChild box
    survivorBoxes.push box
    box.dataIndex = n - 1
    box.addEventListener 'click', !-> showIndex := @dataIndex
  for n in [1 to generationMutate]
    box = createBox 'mutant', 'Mutation'
    boxesElement.appendChild box
    mutantBoxes.push box
  for n in [1 to generationCross]
    box = createBox 'crossover', 'Crossover'
    boxesElement.appendChild box
    crossBoxes.push box

  imageSource := new Image!
  imageSource.addEventListener 'load', !->
    scalePaintings!
    if window.__proto__ && sessionStorage.getItem storageKey
      paintings := (JSON.parse (sessionStorage.getItem storageKey), reviver).concat(paintings).slice 0, generationKeep
      resetStats!
    else
      restart!
    setTimeout breed, 0

