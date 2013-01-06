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
costScoreRatio = 0.002
diffMapSensitivity = 0x4000
weightMin = 0.02
radialSort = true

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
lastShownIndex = 0

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
betweenHigh = (min, max) -> Math.floor (Math.sin(Math.random! * Math.PI / 2) * (max - min + 1) + min)
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
    @x = between 0, paintingWidth - 1
    @y = between 0, paintingHeight - 1
    return this

  mutate: ->
    dx = between -2, +2
    dy = between -2, +2
    new Point @x + dx, @y + dy

  angle: (p) -> ((Math.atan2 @y - p.y, @x - p.x) + 2 * Math.PI) % (2 * Math.PI)

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

  mutate: ->
    child = new Color @r, @g, @b, @a
    switch between 1, 4
      when 1
        child.r = clamp 0, @r + plusOrMinus(1, 16), 255
        attempt 'rgb'
      when 2
        child.g = clamp 0, @g + plusOrMinus(1, 16), 255
        attempt 'rgb'
      when 3
        child.b = clamp 0, @b + plusOrMinus(1, 16), 255
        attempt 'rgb'
      when 4
        child.a = clamp alphaMin, @a + plusOrMinus(1, 5), alphaMax
        attempt 'alpha'
    return child

class Painting
  (shapes) -> if shapes then @shapes = shapes.slice(0) else @randomize!

  randomize: ->
    @shapes = [new Shape!]
    @score = 1/0 # infinity
    return this

  paint: !(canvas, opaque) ->
    canvas.width = target.width
    canvas.height = target.height
    ctx = canvas.getContext '2d'
    ctx.save!
    ctx.scale canvas.width / paintingWidth, canvas.height / paintingHeight
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
      @paint canvas, true
      @diffScore canvas
      @canvas = canvas
    label = 'Score: ' + Math.floor(@score) + (if @age then ' Age: ' + @age else '')
    setText box.children[1], label

  diffScore: (canvas) ->
    ctx = canvas.getContext '2d'
    score = 0
    diffMap = new Array weightMap.length
    data = (ctx.getImageData 0, 0, target.width, target.height).data
    i = w = 0
    l = data.length
    while i < l
      dr = data[i] - targetData[i++]
      dg = data[i] - targetData[i++]
      db = data[i] - targetData[i++]
      i++
      diff = dr * dr + dg * dg + db * db
      diffMap[w] = diff
      score += diff * weightMap[w++]
    @score = score / (target.width * target.height) + @cost! * costScoreRatio
    @diffMap = diffMap

  paintDiffMap: (canvas) ->
    unless @diffMap
      @paint canvas
      @diffScore canvas
    canvas.width = target.width
    canvas.height = target.height
    ctx = canvas.getContext '2d'
    diffData = ctx.createImageData target.width, target.height
    data = diffData.data
    i = 0
    for point in @diffMap
      color = 255 * (1 - point / diffMapSensitivity)
      data[i++] = color # r
      data[i++] = color # g
      data[i++] = color # b
      data[i++] = 255   # a
    ctx.putImageData diffData, 0, 0

  mutate: ->
    child = new Painting @shapes
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
    i = between (Math.round len / 4), len
    j = i + between (Math.round len / 4), len * 3/4
    shapes = (@shapes.slice 0, i).concat(other.shapes.slice i, j).concat(@shapes.slice(j))
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
        [shape.svgPath i for shape, i in @shapes].join('') +
      "</g>" +
    "</svg>"

  cost: -> [shape.cost! for shape in @shapes].reduce (a, b) -> a + b

class Shape
  (source) ->
    if source
      for key, val of source
        this[key] = val
    else
      @randomize!

  randomize: !->
    @color = new Color!
    @path = new Path!

  paint: !(ctx) ->
    ctx.save!
    ctx.fillStyle = @color.fillStyle!
    ctx.beginPath!
    @path.paint ctx
    ctx.closePath!
    ctx.fill!
    ctx.restore!

  mutate: ->
    roll = between 0, 5
    child = new Shape this
    if roll > 0
      child.path = @path.mutate!
    else
      child.color = @color.mutate!
    return child

  svgGradient: (gradientId)  ->
    "<linearGradient id='" + gradientId + "' gradientUnits='userSpaceOnUse'>" +
      "<stop offset='0%' "   + @color1.svg! + "/>" +
      "<stop offset='100%' " + @color2.svg! + "/>" +
    "</linearGradient>"

  svgPath: (gradientId) ->
    "<path fill='" + @color.fillStyle! + "' d='" + @path.svg! + "'/>"

  cost: -> @path.cost! + 5

class Path

  (source) ->
    if source
      @points = source.points.slice 0
      @center = source.center
    else
      @randomize!

  randomize: !->
    @center = new Point!
    @points = []
    while @points.length < pointsMin
      @points.push @center.mutate!
    @sort!

  paint: !(ctx) ->
    first = @points[0]
    ctx.moveTo first.x, first.y
    i = 1
    while i <= @points.length
      control = @points[i % @points.length]
      point = @points[(i + 1) % @points.length]
      i += 2
      ctx.quadraticCurveTo control.x, control.y, point.x, point.y

  sort: !-> if radialSort then @points.sort (a, b) ~> a.angle(@center) - b.angle(@center)

  mutate: ->
    roll = between 0, 9
    child = new Path this
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
    while i <= @points.length
      control = @points[i % @points.length]
      point = @points[(i + 1) % @points.length]
      i += 2
      svg += 'Q' + control.svg! + ' ' + point.svg!
    return svg

  cost: -> @points.length

mutate = !->
  mutationRate = Math.max 1, 5 - (Math.floor (Math.log generationNumber) / Math.LN10)
  for i in [0 to generationMutate - 1]
    n = i % paintings.length
    child = mom = paintings[n]
    j = 0
    while j++ < mutationRate
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
    lastShownIndex = showIndex
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
  i = 0
  weightMap := []
  while i < edgeMap.length
    weightMap.push clamp weightMin, edgeMap[i] + histoMap[i], 1
    i++

generateEdgeMap = ->
  edgeMap = []
  y = 0
  while y < target.height
    x = 0
    while x < target.width
      u = Math.max y - 1, 0
      l = Math.max x - 1, 0
      r = Math.min x + 1, target.width - 1
      d = Math.min y + 1, target.height - 1
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
    rarity = histogram[color] / (target.width * target.height) * histogram.length
    histoMap.push clamp 0, 1 - rarity, 1
  return histoMap

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
  onScalePaintings!

window.addEventListener 'load', !->
  boxesElement = document.getElementById('boxes')
  target := document.getElementById('target')
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

  imageSource := new Image!
  imageSource.addEventListener 'load', !->
    scalePaintings!
    if window.__proto__ && sessionStorage.getItem storageKey
      paintings := (JSON.parse sessionStorage.getItem(storageKey), reviver).concat(paintings).slice 0, generationKeep
      resetStats!
    else
      restart!
    setTimeout breed, 0

