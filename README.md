Vector Painting Evolution
=========================

[This page][1] starts by creating a set of paintings that each contain one oval
or triangle. These paintings are mutated by adding, removing, or altering 
components, and also cross-bred with other paintings. The results are compared
to the image labeled _Target_, paying particular attention to areas shown in the
image labeled _Weights_. The dark areas in the _Differences_ image show where the
target image is most different from the best solution. The best image and a
selection of the others are retained, the rest are thrown out, and the process repeats.

This is entirely client-side code. To build, just run:

    livescript -c svgdna.ls
    python -m SimpleHTTPServer

And navigate to [localhost:8000][2] in your browser.

[1]: http://svachalek.github.com/svgdna/
[2]: http://localhost:8000
