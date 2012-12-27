var imgs, imgIndex, box, source, painting, timeoutImage, timeoutOpacity, scaleImages, nextImage, transitionOpacity;
imgs = ['MonaLisaFace.jpg', 'MonaLisa.jpg', 'StarryNight.jpg', 'Lenna.jpg', 'Flowers.jpg'];
imgIndex = -1;
box = null;
source = null;
painting = null;
timeoutImage = null;
timeoutOpacity = null;
scaleImages = function(){
  var border, bw, bh, nw, nh, w, h;
  border = parseInt(document.defaultView.getComputedStyle(source).borderWidth);
  bw = box.clientWidth - 2 * border;
  bh = box.clientHeight - 2 * border;
  nw = source.naturalWidth;
  nh = source.naturalHeight;
  if (bw / nw > bh / nh) {
    w = nw * bh / nh;
    h = nh * bh / nh;
  } else {
    w = nw * bw / nw;
    h = nh * bw / nw;
  }
  painting.style.width = source.style.width = w + 'px';
  painting.style.height = source.style.height = h + 'px';
  painting.style.left = source.style.left = (bw - w) / 2 + 'px';
  painting.style.top = source.style.top = (bh - h) / 2 + 'px';
};
nextImage = function(){
  imgIndex = (imgIndex + 1) % imgs.length;
  source.src = 'images/' + imgs[imgIndex];
};
transitionOpacity = function(){
  var opacity;
  opacity = Math.round(painting.style.opacity * 100) + 10;
  painting.style.opacity = opacity / 100;
  source.style.opacity = 1 - opacity / 100;
  if (opacity === 100) {
    timeoutImage = setTimeout(nextImage, 5000);
  } else {
    timeoutOpacity = setTimeout(transitionOpacity, 100);
  }
};
window.addEventListener('load', function(){
  box = document.getElementById('imgbox');
  source = document.getElementById('source');
  painting = document.getElementById('painting');
  source.addEventListener('load', function(){
    scaleImages();
    source.style.opacity = 1;
    painting.style.opacity = 0;
    painting.src = source.src.replace(/jpg|png/, 'svg');
  });
  painting.addEventListener('load', function(){
    timeoutOpacity = setTimeout(transitionOpacity, 1000);
  });
  painting.addEventListener('click', function(){
    clearTimeout(timeoutImage);
    clearTimeout(timeoutOpacity);
    nextImage();
  });
  window.addEventListener('resize', scaleImages);
  nextImage();
});