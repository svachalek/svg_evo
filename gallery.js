const images = [
  {
    o: "images/MonaLisa.jpg",
    svg: "MonaLisa-400k.svg"
  },
  {
    o: "images/MonaLisaFace.jpg",
    svg: "MonaLisaFace-130k.svg"
  },
  {
    o: "images/AmericanGothic.jpg",
    svg: "AmericanGothic-200k.svg"
  },
  {
    o: "images/StarryNight.jpg",
    svg: "StarryNight-100k.svg"
  },
  {
    o: "images/GrandCanyon.jpg",
    svg: "GrandCanyon-140k.svg"
  },
  {
    o: "images/Lenna.jpg",
    svg: "Lenna-120k.svg"
  },
  {
    o: "images/Flowers.jpg",
    svg: "Flowers-87k.svg"
  },
  {
    o:
      "https://lh4.googleusercontent.com/-q-R5clDIXIg/S1fefky5yRI/AAAAAAAAIYc/yeYl_tYXQwM/s571/IMG_2564.JPG",
    svg: "OrangeButterflyFish-40k.svg"
  }
];

let imgIndex = -1;
let box = null;
let source = null;
let painting = null;
let timeoutImage = null;
let timeoutOpacity = null;

function scaleImages() {
  const border = parseInt(
    document.defaultView.getComputedStyle(source).borderLeftWidth ||
      source.currentStyle.borderWidth
  );
  const bw = box.clientWidth - 2 * border;
  const bh = box.clientHeight - 2 * border;
  const nw = source.naturalWidth;
  const nh = source.naturalHeight;
  const ratio = Math.min(bh / nh, bw / nw);
  const w = Math.ceil(nw * ratio);
  const h = Math.ceil(nh * ratio);
  painting.style.width = source.style.width = `${w}px`;
  painting.style.height = source.style.height = `${h}px`;
  painting.style.left = source.style.left = `${Math.floor((bw - w) / 2)}px`;
  painting.style.top = source.style.top = `${Math.floor((bh - h) / 2)}px`;
}

function nextImage() {
  imgIndex = (imgIndex + 1) % images.length;
  source.src = images[imgIndex].o;
}

function transitionOpacity() {
  const opacity = Math.round(painting.style.opacity * 100) + 10;
  painting.style.opacity = String(opacity / 100);
  source.style.opacity = String(1 - opacity / 100);
  if (opacity === 100) {
    timeoutImage = setTimeout(nextImage, 5000);
  } else {
    timeoutOpacity = setTimeout(transitionOpacity, 100);
  }
}

window.addEventListener("load", () => {
  box = document.getElementById("imgbox");
  source = document.getElementById("source");
  painting = document.getElementById("painting");
  source.addEventListener("load", () => {
    scaleImages();
    source.style.opacity = 1;
    painting.style.opacity = 0;
    painting.src = "samples/" + images[imgIndex].svg;
  });
  painting.addEventListener("load", () => {
    timeoutOpacity = setTimeout(transitionOpacity, 1000);
  });
  painting.addEventListener("click", () => {
    clearTimeout(timeoutImage);
    clearTimeout(timeoutOpacity);
    nextImage();
  });
  window.addEventListener("resize", scaleImages);
  nextImage();
});
