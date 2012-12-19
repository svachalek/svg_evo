startTime = Date.now!

imageWidth = 100
imageHeight = 100
imagePolys = 50

generationSize = 50
generationKeep = 10
generationNumber = 0

polySets = []
canvases = []
labels = []

randomPoly = ->
  x0: Math.floor (Math.random! * 1.5 - 0.25) * imageWidth
  y0: Math.floor (Math.random! * 1.5 - 0.25) * imageHeight
  x1: Math.floor (Math.random! * 1.5 - 0.25) * imageWidth
  y1: Math.floor (Math.random! * 1.5 - 0.25) * imageHeight
  x2: Math.floor (Math.random! * 1.5 - 0.25) * imageWidth
  y2: Math.floor (Math.random! * 1.5 - 0.25) * imageHeight
  r:  Math.floor Math.random! * 255
  g:  Math.floor Math.random! * 255
  b:  Math.floor Math.random! * 255
  a:  Math.random!

paintPoly = (canvas, polySet) ->
  ctx = canvas.getContext '2d'
  ctx.clearRect 0, 0, imageWidth, imageHeight
  for poly in polySet
    ctx.fillStyle = 'rgba(' + poly.r + ',' + poly.g + ',' + poly.b + ',' + poly.a + ')'
    ctx.beginPath!
    ctx.moveTo poly.x0, poly.y0
    ctx.lineTo poly.x1, poly.y1
    ctx.lineTo poly.x2, poly.y2
    ctx.closePath!
    ctx.fill!

targetData = null

diffScore = (canvas) ->
  ctx = canvas.getContext '2d'
  score = imageWidth * imageHeight
  data = (ctx.getImageData 0, 0, imageWidth, imageHeight).data
  for i in [0 to (imageWidth * imageHeight) - 1]
    base = i * 4
    dr = Math.abs (data[base + 0] - targetData[base + 0]) / 255
    dg = Math.abs (data[base + 1] - targetData[base + 1]) / 255
    db = Math.abs (data[base + 2] - targetData[base + 2]) / 255
    score -= Math.sqrt dr * dr + dg * dg + db * db
  return Math.pow score / (imageWidth * imageHeight), 4

scoreAll = ->
  for i in [0 to generationSize - 1]
    polySets[i].score = score = diffScore canvases[i]
    labels[i].innerText = (Math.floor score * 100) + '%'

flip = (a, b) -> if Math.random! < 0.5 then a else b

choose = (a, b) ->
  r = Math.random!
  if r < 0.3
    return a
  else if r < 0.6
    return b
  else if r < 0.8
    c = {}
    for val, key of a
      c[key] = flip(a, b)[key]
    return c
  else
    return randomPoly!

cross = (mom, dad) ->
  child = [choose(mom[i], dad[i]) for i in [0 to imagePolys - 1]]
  return child

breed = !->
  ++generationNumber
  elapsed = (Date.now! - startTime) / 1000
  document.getElementById('generation').innerText = generationNumber
  document.getElementById('time').innerText = Math.floor elapsed
  document.getElementById('speed').innerText = Math.floor generationNumber / elapsed
  polySets.sort (a, b) -> b.score - a.score
  keep = []
  keep.push polySets[0]
  keep.push polySets[1]
  keep.push polySets[2]
  keep.push polySets[4]
  keep.push polySets[6]
  keep.push polySets[10]
  keep.push polySets[16]
  keep.push polySets[22]
  keep.push polySets[30]
  keep.push polySets[40]
  polySets := keep
  for i in [0 to generationKeep - 1]
    polySets[i].age = (polySets[i].age || 0) + 1
    paintPoly canvases[i], polySets[i]
    labels[i].innerText = (Math.floor polySets[i].score * 100) + '% (' + polySets[i].age + ')'
  for i in [generationKeep to generationSize - 1]
    mom = polySets[Math.floor Math.random! * generationKeep]
    dad = polySets[Math.floor Math.random! * generationKeep]
    while mom == dad
      mom = polySets[Math.floor Math.random! * generationKeep]
      dad = polySets[Math.floor Math.random! * generationKeep]
    child = cross mom, dad
    polySets.push child
    paintPoly canvases[i], child
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
  polySet = [randomPoly! for p in [1 to imagePolys]]
  polySets.push polySet

polySets.sort (a, b) -> b.score - a.score
for i in [0 to generationSize - 1]
  paintPoly canvases[i], polySets[i]

img = new Image!
img.onload = ->
  ctx = target.getContext '2d'
  ctx.drawImage img, 0, 0, imageWidth, imageHeight
  targetData := (ctx.getImageData 0, 0, imageWidth, imageHeight).data
  scoreAll!
  setTimeout breed, 0
img.src = 'Lenna.png'

