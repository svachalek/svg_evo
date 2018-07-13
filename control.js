let improved = true;

const updateFrequency = 10;

function paintWeightMap() {
  const weights = document.getElementById("weights");
  const ctx = weights.getContext("2d");
  const imageData = ctx.createImageData(target.width, target.height);
  const data = imageData.data;
  let i = 0;
  weightMap.forEach(weight => {
    const color = Math.floor((1 - weight) * 255);
    data[i++] = color;
    data[i++] = color;
    data[i++] = color;
    data[i++] = 255;
  });
  ctx.putImageData(imageData, 0, 0);
}

window.addEventListener("load", () => {
  imageSource.onError = () => {
    alert(
      "Failed to load the selected image. It is likely that the image server does not allow Cross-Origin Resource Sharing."
    );
  };
  const imageSelect = document.getElementById("imageSelect");
  const imageText = document.getElementById("imageText");
  if (sessionStorage.getItem("url")) {
    imageSelect.selectedIndex = 0;
    imageText.value = sessionStorage.getItem("url");
  } else {
    imageSelect.selectedIndex = between(1, imageSelect.options.length - 1);
    imageText.value = "images/" + imageSelect.value;
  }
  imageSource.crossOrigin = "";
  imageSource.src = imageText.value;
  imageSelect.addEventListener("change", () => {
    if (imageSelect.selectedIndex > 0) {
      imageText.value = imageSource.src = "images/" + imageSelect.value;
      return imageText.value;
    } else {
      imageText.value = "";
      return imageText.focus();
    }
  });
  imageText.addEventListener("change", () => {
    imageSelect.selectedIndex = 0;
    imageSource.crossOrigin = "";
    imageSource.src = imageText.value;
    return imageSource.src;
  });
  const textureSelect = document.getElementById("textureSelect");
  textureSelect.addEventListener("change", () => {
    const bestLarge = document.getElementById("best-large");
    bestLarge.style.backgroundImage = `url(textures/${textureSelect.value})`;
    return bestLarge.style.backgroundImage;
  });
  document.getElementById("restart").addEventListener("click", restart);
  imageSource.addEventListener("load", () => {
    sessionStorage.setItem("url", imageSource.src);
    const targetLarge = document.getElementById("target-large");
    const bestLarge = document.getElementById("best-large");
    targetLarge.src = imageSource.src;
    targetLarge.style.width = `${paintingWidth * 3}px`;
    bestLarge.style.width = targetLarge.style.width;
    bestLarge.style.height = `${paintingHeight * 3}px`;
    bestLarge.style.height = targetLarge.style.height;
  });
});

function onScalePaintings() {
  const weights = document.getElementById("weights");
  weights.width = target.width;
  weights.height = target.height;
  paintWeightMap();
  const diff = document.getElementById("diff");
  diff.width = target.width;
  diff.height = target.height;
  diff
    .getContext("2d")
    .setTransform(
      target.width / paintingWidth,
      0,
      0,
      target.height / paintingHeight,
      0,
      0
    );
  if (paintings[showIndex]) {
    paintings[showIndex].paintDiffMap(diff);
  }
  paintings.forEach((painting, index) => {
    painting.canvas = null;
    painting.show(survivorBoxes[index]);
  });
}

function onSvgImproved() {
  improved = true;
}

function onGenerationComplete() {
  paintings.forEach(painting => {
    painting.age = (painting.age || 0) + 1;
  });
  if (improved || generationNumber % updateFrequency === 0) {
    paintings.forEach((painting, index) => painting.show(survivorBoxes[index]));
    setText(
      document.getElementById("speed"),
      (generationNumber / (cumulativeTime / 1000)).toFixed(2)
    );
    setText(
      document.getElementById("time"),
      `${Math.floor(cumulativeTime / 1000)}s`
    );
    setText(document.getElementById("generation"), generationNumber);
    if (improved) {
      document.getElementById("best-large").src =
        "data:image/svg+xml;base64," +
        base64.encode(paintings[showIndex].svg());
      paintings[showIndex].paintDiffMap(document.getElementById("diff"));
      improved = false;
    }
    Object.entries(attempts).forEach(([key, val]) => {
      const percent = (((successes[key] || 0) / val) * 100).toFixed(2) + "%";
      const fraction = (successes[key] || 0) + "/" + val;
      setText(
        document.getElementById("success-" + key),
        `${fraction} (${percent})`
      );
    });
  }
}
