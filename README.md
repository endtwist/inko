# Inko

A live chat support system for support.mozilla.com.

## Requirements

* [node.js](http://nodejs.org) == 0.1.97
* [dbslayer](http://code.nytimes.com/projects/dbslayer/wiki) == beta-12
* [kiwi](http://github.com/visionmedia/kiwi) (node.js package manager) >= 0.3.1
* [express](http://github.com/visionmedia/express) (framework) == 0.13.0


## Installation

Download node.js, compile from source:
    wget http://nodejs.org/dist/node-v0.1.97.tar.gz
    tar xzf node-v0.1.97.tar.gz
    cd node-v0.1.97
    ./configure
    make
    make install

Install the kiwi package manager for node.js (on OS X, its easiest to do using [homebrew](http://mxcl.github.com/homebrew/)):
    brew install kiwi

Install express, a node.js web framework:
    kiwi -v install express 0.13.0
    
Install dbslayer:
    wget http://code.nytimes.com/downloads/dbslayer-beta-12.tgz
    tar xzf dbslayer-beta-12.tgz
    cd dbslayer
    ./configure
    make
    make install