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
costScoreRatio = 0.001
weightMin = 0.02
radialSort = true

alphaMin = 30
alphaMax = 60
pointsMin = 6
pointsMax = 20

generationKeep = 4
generationMutate = 15
generationCross = 1
generationNumber = 0
cumulativeTime = 0

paintings = []
survivorBoxes = []
mutantBoxes = []
crossBoxes = []

attempts = {}
successes = {}

attempt = (types, success) ->
  for type in types
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

setText = (element, text) -> element.innerText = element.textContent = text

diffRGB = (dr, dg, db) -> Math.sqrt (dr * dr + dg * dg + db * db) / (3 * 255 * 255)

diffPoint = (d, x1, y1, x2, y2) ->
  b1 = (x1 + (y1 * paintingWidth)) * 4
  b2 = (x2 + (y2 * paintingWidth)) * 4
  dr = d[b1++] - d[b2++]
  dg = d[b1++] - d[b2++]
  db = d[b1++] - d[b2++]
  diffRGB dr, dg, db

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
      when 2
        child.g = clamp 0, @g + plusOrMinus(1, 16), 255
      when 3
        child.b = clamp 0, @b + plusOrMinus(1, 16), 255
      when 4
        child.a = clamp alphaMin, @a + plusOrMinus(1, 5), alphaMax
    return child

class Painting
  (shapes, @origin = []) -> if shapes then @shapes = shapes.slice(0) else @randomize!

  randomize: ->
    @shapes = [new Shape!]
    @origin = ['random']
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
    diffMap = new Array weightMap.length
    data = (ctx.getImageData 0, 0, paintingWidth, paintingHeight).data
    i = w = 0
    l = data.length
    while i < l
      dr = data[i] - targetData[i++]
      dg = data[i] - targetData[i++]
      db = data[i] - targetData[i++]
      i++
      diff = diffRGB dr, dg, db
      diffMap[w] = diff
      score += diff * weightMap[w++]
    @score = score + @cost! * costScoreRatio
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
      child.origin.push 'remove'
      i = betweenHigh 0, @shapes.length - 1
      child.shapes.splice i, 1
    else if roll < 2
      child.origin.push 'add'
      child.shapes.push new Shape!
    else if roll < 5 && @shapes.length >= 2
      child.origin.push 'order'
      i = betweenHigh 0, @shapes.length - 2 # not the last
      tmp = @shapes[i]
      child.shapes[i] = @shapes[i + 1]
      child.shapes[i + 1] = tmp
    else
      i = betweenHigh 0, @shapes.length - 1
      child.shapes[i] = @shapes[i].mutate!
      child.origin.push child.shapes[i].origin
    return child

  cross: (other) ->
    len = Math.min @shapes.length, other.shapes.length
    i = between (Math.round len / 4), len
    j = i + between (Math.round len / 4), len * 3/4
    shapes = (@shapes.slice 0, i).concat(other.shapes.slice i, j).concat(@shapes.slice(j))
    new Painting shapes, ['cross']

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
      child.origin = 'shape'
    else
      child.color = @color.mutate!
      child.origin = 'color'
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

  randomPoint: -> between 0, @points.length - 1

  mutate: ->
    roll = between 0, 7
    child = new Path this
    if roll < 5
      i = child.randomPoint!
      child.points[i] = child.points[i].mutate!
      child.sort!
    else if roll < 6 && @points.length >= pointsMin + 2
      child.points.splice child.randomPoint!, 1
      child.points.splice child.randomPoint!, 1
    else if roll < 7
      child.center = child.center.mutate!
      child.sort!
    else
      p = new Point!
      child.points.push p
      child.points.push p.mutate!
      child.sort!
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

targetData = null
bestData = null

mutate = !->
  mutationRate = Math.max 1, 5 - (Math.floor (Math.log generationNumber) / Math.LN10)
  for i in [0 to generationMutate - 1]
    n = randomPainting!
    child = mom = paintings[n]
    j = 0
    while j++ < mutationRate
      child = child.mutate!
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
      attempt child.origin, true
    else
      attempt child.origin, false

breed = !->
  startTime = Date.now!
  ++generationNumber
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
    weightMap.push clamp weightMin, edgeMap[i] + histoMap[i], 1
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

