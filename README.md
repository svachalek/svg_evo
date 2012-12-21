Vector Painting Evolution
=========================

[This page][1] starts by creating a set of paintings that each contain one oval
or triangle. These paintings are mutated by adding, removing, or altering 
components, and also cross-bred with other paintings. The results are compared
to the image labeled **Target**, paying particular attention to areas shown in
the image labeled **Weights**. The dark areas in the **Differences** image show
where the target image is most different from the best solution.

When a mutation is better than its parent, it replaces it; when a cross is
better than one if its parents it will replace it. The process repeats as fast
as possible, and after 2000 or 3000 generations you should begin to recognize
the result.

This is entirely client-side code. To build, just run:

    livescript -c svgdna.ls
    python -m SimpleHTTPServer

And navigate to [localhost:8000][2] in your browser.

[1]: http://svachalek.github.com/svgdna/
[2]: http://localhost:8000
