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

imgs =
  'MonaLisaFace.jpg',
  'GrandCanyon.jpg',
  'MonaLisa.jpg',
  'StarryNight.jpg',
  'Lenna.jpg',
  'Flowers.jpg',

imgIndex = -1
box = null
source = null
painting = null
timeoutImage = null
timeoutOpacity = null

scaleImages = !->
  border = parseInt (document.defaultView.getComputedStyle(source).borderLeftWidth || source.currentStyle.borderWidth)
  bw = box.clientWidth - 2 * border
  bh = box.clientHeight - 2 * border
  nw = source.naturalWidth
  nh = source.naturalHeight
  if bw / nw > bh / nh
    w = nw * bh / nh
    h = nh * bh / nh
  else
    w = nw * bw / nw
    h = nh * bw / nw
  painting.style.width = source.style.width = w + 'px'
  painting.style.height = source.style.height = h + 'px'
  painting.style.left = source.style.left = (bw - w) / 2 + 'px'
  painting.style.top = source.style.top = (bh - h) / 2 + 'px'

nextImage = !->
  imgIndex := (imgIndex + 1) % imgs.length
  source.src = 'images/' + imgs[imgIndex]

transitionOpacity = !->
  opacity = Math.round(painting.style.opacity * 100) + 10
  painting.style.opacity = opacity / 100
  source.style.opacity = 1 - opacity / 100
  if opacity == 100
    timeoutImage := setTimeout nextImage, 5000
  else
    timeoutOpacity := setTimeout transitionOpacity, 100

window.addEventListener 'load', !->
  box := document.getElementById 'imgbox'
  source := document.getElementById 'source'
  painting := document.getElementById 'painting'
  source.addEventListener 'load', !->
    scaleImages!
    source.style.opacity = 1
    painting.style.opacity = 0
    painting.src = source.src.replace /jpg|png/, 'svg'
  painting.addEventListener 'load', !->
    timeoutOpacity := setTimeout transitionOpacity, 1000
  painting.addEventListener 'click', !->
    clearTimeout timeoutImage
    clearTimeout timeoutOpacity
    nextImage!
  window.addEventListener 'resize', scaleImages
  nextImage!

