var imgs, imgIndex, box, source, painting, timeoutImage, timeoutOpacity, scaleImages, nextImage, transitionOpacity;
imgs = [
  {
    o: 'images/MonaLisa.jpg',
    svg: 'MonaLisa-400k.svg'
  }, {
    o: 'images/MonaLisaFace.jpg',
    svg: 'MonaLisaFace-100k.svg'
    /*
    },{
      o:   'https://lh3.googleusercontent.com/-VqbjDm2twT4/SxBj8kbEugI/AAAAAAAABWA/nmnZw0hFaF0/s572/Picture+006.jpg',
      svg: 'HalfMoonBay-25k.svg'
    },{
      o:   'https://lh4.googleusercontent.com/-q-R5clDIXIg/S1fefky5yRI/AAAAAAAAIYc/yeYl_tYXQwM/s571/IMG_2564.JPG',
      svg: 'OrangeButterflyFish-23k.svg'
    },{
      o:   'images/GrandCanyon.jpg',
      svg: 'GrandCanyon.svg'
    },{
      o:   'images/MonaLisaFace.jpg',
      svg: 'MonaLisaFace.svg'
    },{
      o:   'images/StarryNight.jpg',
      svg: 'StarryNight-30k.svg'
    },{
      o:   'images/Lenna.jpg',
      svg: 'Lenna.svg'
    },{
      o:   'images/Flowers.jpg',
      svg: 'Flowers-70k.svg'
    */
  }
];
imgIndex = -1;
box = null;
source = null;
painting = null;
timeoutImage = null;
timeoutOpacity = null;
scaleImages = function(){
  var border, bw, bh, nw, nh, ratio, w, h;
  border = parseInt(document.defaultView.getComputedStyle(source).borderLeftWidth || source.currentStyle.borderWidth);
  bw = box.clientWidth - 2 * border;
  bh = box.clientHeight - 2 * border;
  nw = source.naturalWidth;
  nh = source.naturalHeight;
  ratio = Math.min(bh / nh, bw / nw);
  w = Math.ceil(nw * ratio);
  h = Math.ceil(nh * ratio);
  painting.style.width = source.style.width = w + 'px';
  painting.style.height = source.style.height = h + 'px';
  painting.style.left = source.style.left = Math.floor((bw - w) / 2) + 'px';
  painting.style.top = source.style.top = Math.floor((bh - h) / 2) + 'px';
};
nextImage = function(){
  imgIndex = (imgIndex + 1) % imgs.length;
  source.src = imgs[imgIndex].o;
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
    painting.src = 'samples/' + imgs[imgIndex].svg;
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