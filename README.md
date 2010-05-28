# Inko

A live chat support system for support.mozilla.com.

## Requirements

* [node.js](http://nodejs.org) == 0.1.96
* [kiwi](http://github.com/visionmedia/kiwi) (node.js package manager) >= 0.3.0
* [express](http://github.com/visionmedia/express) (framework) == 0.9.0


## Installation

Download node.js, compile from source:
    ./configure
    make
    make install

Install the kiwi package manager for node.js (on OS X, its easiest to do using [homebrew](http://mxcl.github.com/homebrew/)):
    brew install kiwi

Install express, a node.js web framework:
    kiwi -v install express 0.9.0