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

paintWeightMap = !->
  weights = document.getElementById('weights')
  weights.width = target.width
  weights.height = target.height
  ctx = weights.getContext '2d'
  imageData = ctx.createImageData(target.width, target.height)
  data = imageData.data
  i = 0
  for weight in weightMap
    color = Math.floor (1 - weight) * 255
    data[i++] = color # r
    data[i++] = color # g
    data[i++] = color # b
    data[i++] = 255   # a
  ctx.putImageData imageData, 0, 0

window.addEventListener 'load', !->
  imageSource.onError = !->
    alert 'Failed to load the selected image. It is likely that the image server does not allow Cross-Origin Resource Sharing.'

  imageSelect = document.getElementById 'imageSelect'
  imageText = document.getElementById 'imageText'

  if sessionStorage.getItem 'url'
    imageSelect.selectedIndex = 0
    imageText.value = sessionStorage.getItem 'url'
  else
    imageSelect.selectedIndex = between 1, imageSelect.options.length - 1
    imageText.value = 'images/' + imageSelect.value

  imageSource.crossOrigin = ''
  imageSource.src = imageText.value
  imageSelect.addEventListener 'change', ->
    if imageSelect.selectedIndex > 0
      imageText.value = imageSource.src = 'images/' + imageSelect.value
    else
      imageText.value = ''
      imageText.focus!

  imageText.addEventListener 'change', ->
    imageSelect.selectedIndex = 0
    imageSource.crossOrigin = ''
    imageSource.src = imageText.value

  textureSelect = document.getElementById 'textureSelect'
  textureSelect.addEventListener 'change', ->
    bestLarge.style.backgroundImage = 'url(textures/' + textureSelect.value + ')'

  document.getElementById('restart').addEventListener 'click', restart

  imageSource.addEventListener 'load', !->
    sessionStorage.setItem 'url', imageSource.src
    targetLarge = document.getElementById 'target-large'
    bestLarge = document.getElementById 'best-large'
    targetLarge.src = imageSource.src
    bestLarge.style.width = targetLarge.style.width = paintingWidth * 3 + 'px'
    bestLarge.style.height = targetLarge.style.height = paintingHeight * 3 + 'px'

onScalePaintings = !->
  paintWeightMap!
  for painting, i in paintings
    painting.canvas = null
    painting.show survivorBoxes[i]

onSvgImproved = !->
  # the base64 encoding shouldn't be necessary but Firefox can't handle the image otherwise
  (document.getElementById 'best-large').src = 'data:image/svg+xml;base64,' + base64.encode paintings[showIndex].svg!
  paintings[showIndex].paintDiffMap document.getElementById 'diff'

onGenerationComplete = !->
  for painting, i in paintings
    painting.age = (painting.age || 0) + 1
    painting.show survivorBoxes[i]
  setText document.getElementById('generation'), generationNumber
  setText document.getElementById('time'), (Math.floor cumulativeTime / 1000) + 's'
  setText document.getElementById('speed'), Math.floor generationNumber / (cumulativeTime / 1000)
  for key, val of attempts
    percent = (Math.floor (successes[key] || 0) / val * 100) + '%'
    fraction = (successes[key] || 0) + '/' + val
    setText document.getElementById('success-' + key), fraction + ' (' + percent + ')'

