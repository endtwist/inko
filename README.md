# Inko

A live chat support system for support.mozilla.com.

## Requirements

* [node.js](http://nodejs.org) == 0.1.97
* [dbslayer](http://code.nytimes.com/projects/dbslayer/wiki) == beta-12
* [npm](http://github.com/isaacs/npm) (node.js package manager) >= 0.1.13
* [express](http://github.com/visionmedia/express) (framework) == 0.13.0

## Installation

Download node.js, compile from source:
    wget http://nodejs.org/dist/node-v0.1.99.tar.gz
    tar xzf node-v0.1.99.tar.gz
    cd node-v0.1.99
    ./configure
    make
    make install

Install npm, a package manager for node.js (on OS X, its easiest to do using [homebrew](http://mxcl.github.com/homebrew/)):
    brew install npm

Install express, a node.js web framework:
    npm install express

Install dbslayer:
    wget http://code.nytimes.com/downloads/dbslayer-beta-12.tgz
    tar xzf dbslayer-beta-12.tgz
    cd dbslayer
    ./configure
    make
    make install

If running locally, create or get an SSL certificate
    http://sial.org/howto/openssl/self-signed/

Create a local settings file by copying settings.js to settings.local.js
    cp settings.js settings.local.js

Set the path to your SSL `.key` and `.cert` files in settings.local.js
    SSL_KEY = '.../your.key'
    SSL_CERT = '.../your.cert'

Create a local dbslayer config file by copying configs/dbslayer.prod.cnf to configs/dbslayer.local.cnf
    cp configs/dbslayer.prod.cnf configs/dbslayer.local.cnf

## Starting up

There is a script in the root of this project named `inko` that allows you to quickly and easily boot up all server components.

First, `cd` into the Inko directory
    cd /your/path/to/inko
    
Then, start up DBSlayer
    ./inko -x

Finally, start up the Inko server

* If you want to launch the server in _development_ mode then `./inko -d`
* If you want to launch the server in _production_ mode then `./inko -r`

## Signing in

1. Sign into TikiWiki.
2. Visit the Django kitsune site (creates the `sessionid` cookie).
3. Return to the Node.js server.