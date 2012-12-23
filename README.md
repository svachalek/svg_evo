Vector Painting Evolution
=========================

[This page][1] starts by creating a set of paintings that each contain one oval,
triangle, or rectangle. These paintings are mutated by adding, removing, or
altering components, and also cross-bred with other paintings. The results are
compared to the image labeled **Target**, paying particular attention to dark
areas shown in the image labeled **Weights**. The dark areas in the
**Differences** image show where the target image is most different from the
best solution.

When a mutation is better than its parent or when a cross is better than one of
its parents it will replace it. The process repeats as fast as possible, and
after 2000 or 3000 generations you should begin to recognize the result.

This project was inspired by Roger Alsing's [Evolution of Mona Lisa][2] project
and follows a similar algorithm but has no code in common. Aside from the obvious
platform difference, I have added:

* gradients
* curves
* cross-breeding (although it badly needs improvement)

For my own challenge I didn't read the source or run the program until I was
generating pretty good results on my own. Comparing in hindsight one of the
biggest differences I notice that is not related to new features is the
selection of mutations; while his mutation decisions are independent and can
result in zero, one, or multiple simultaneous changes, here we make one single
mutation at random and constrain it in an attempt to make a change that has a
maximum impact that is weighted towards small changes but is at minimum visible.
(Minimums need to be adjusted for the size of the shape being changed but
currently are not.)

Building
--------

This is entirely client-side code. To build, just run:

    livescript -c svgdna.ls
    python -m SimpleHTTPServer

And navigate to [localhost:8000][3] in your browser.

Tuning
------

In my own experiments, I have found that to create a single good result quickly,
something like this works best:

    generationKeep = 1
    generationMutate = 15
    generationCross = 0

However, this produces only one result, while other settings produce multiple
solutions of the same quality in much less time than these settings do.


[1]: http://svachalek.github.com/svgdna/
[2]: http://rogeralsing.com/2008/12/07/genetic-programming-evolution-of-mona-lisa/
[3]: http://localhost:8000

