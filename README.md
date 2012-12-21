svgdna
======

Vector Painting Evolution

This page starts by creating a set of paintings that each contain one oval or triangle.
These paintings are mutated by adding, removing, or altering components, and also
cross-bred with other paintings. The results are compared to the image labeled "Target",
paying particular attention to areas shown in the image labeled "Weights".
The best image and a selection of the others are retained, the rest are thrown out,
and the process repeats.

The page can be seen live [here](http://static.svachalek.net/vector/index.html).

This is entirely client-side code. To build, just run:

  livescript -c svgdna.ls
  python -m SimpleHTTPServer

And navigate to [http://localhost:8000]() in your browser.


