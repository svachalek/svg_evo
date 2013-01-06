var paintWeightMap, onScalePaintings, onSvgImproved, onGenerationComplete;
paintWeightMap = function(){
  var weights, ctx, imageData, data, i, i$, ref$, len$, weight, color;
  weights = document.getElementById('weights');
  weights.width = target.width;
  weights.height = target.height;
  ctx = weights.getContext('2d');
  imageData = ctx.createImageData(target.width, target.height);
  data = imageData.data;
  i = 0;
  for (i$ = 0, len$ = (ref$ = weightMap).length; i$ < len$; ++i$) {
    weight = ref$[i$];
    color = Math.floor((1 - weight) * 255);
    data[i++] = color;
    data[i++] = color;
    data[i++] = color;
    data[i++] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
};
window.addEventListener('load', function(){
  var imageSelect, imageText, textureSelect;
  imageSource.onError = function(){
    alert('Failed to load the selected image. It is likely that the image server does not allow Cross-Origin Resource Sharing.');
  };
  imageSelect = document.getElementById('imageSelect');
  imageText = document.getElementById('imageText');
  if (sessionStorage.getItem('url')) {
    imageSelect.selectedIndex = 0;
    imageText.value = sessionStorage.getItem('url');
  } else {
    imageSelect.selectedIndex = between(1, imageSelect.options.length - 1);
    imageText.value = 'images/' + imageSelect.value;
  }
  imageSource.crossOrigin = '';
  imageSource.src = imageText.value;
  imageSelect.addEventListener('change', function(){
    if (imageSelect.selectedIndex > 0) {
      return imageText.value = imageSource.src = 'images/' + imageSelect.value;
    } else {
      imageText.value = '';
      return imageText.focus();
    }
  });
  imageText.addEventListener('change', function(){
    imageSelect.selectedIndex = 0;
    imageSource.crossOrigin = '';
    return imageSource.src = imageText.value;
  });
  textureSelect = document.getElementById('textureSelect');
  textureSelect.addEventListener('change', function(){
    return bestLarge.style.backgroundImage = 'url(textures/' + textureSelect.value + ')';
  });
  document.getElementById('restart').addEventListener('click', restart);
  imageSource.addEventListener('load', function(){
    var targetLarge, bestLarge;
    sessionStorage.setItem('url', imageSource.src);
    targetLarge = document.getElementById('target-large');
    bestLarge = document.getElementById('best-large');
    targetLarge.src = imageSource.src;
    bestLarge.style.width = targetLarge.style.width = paintingWidth * 3 + 'px';
    bestLarge.style.height = targetLarge.style.height = paintingHeight * 3 + 'px';
  });
});
onScalePaintings = function(){
  var i$, ref$, len$, i, painting;
  paintWeightMap();
  for (i$ = 0, len$ = (ref$ = paintings).length; i$ < len$; ++i$) {
    i = i$;
    painting = ref$[i$];
    painting.canvas = null;
    painting.show(survivorBoxes[i]);
  }
};
onSvgImproved = function(){
  document.getElementById('best-large').src = 'data:image/svg+xml;base64,' + base64.encode(paintings[showIndex].svg());
  paintings[showIndex].paintDiffMap(document.getElementById('diff'));
};
onGenerationComplete = function(){
  var i$, ref$, len$, i, painting, key, val, percent, fraction;
  for (i$ = 0, len$ = (ref$ = paintings).length; i$ < len$; ++i$) {
    i = i$;
    painting = ref$[i$];
    painting.age = (painting.age || 0) + 1;
    painting.show(survivorBoxes[i]);
  }
  setText(document.getElementById('generation'), generationNumber);
  setText(document.getElementById('time'), Math.floor(cumulativeTime / 1000) + 's');
  setText(document.getElementById('speed'), Math.floor(generationNumber / (cumulativeTime / 1000)));
  for (key in ref$ = attempts) {
    val = ref$[key];
    percent = Math.floor((successes[key] || 0) / val * 100) + '%';
    fraction = (successes[key] || 0) + '/' + val;
    setText(document.getElementById('success-' + key), fraction + ' (' + percent + ')');
  }
};