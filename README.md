# Inko

A live chat support system for support.mozilla.com.

## Requirements

* [node.js](http://nodejs.org) == 0.1.97
* [dbslayer](http://code.nytimes.com/projects/dbslayer/wiki) == beta-12
* [npm](http://github.com/isaacs/npm) (node.js package manager) >= 0.1.13
* [express](http://github.com/visionmedia/express) (framework) == 0.14.0

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
    npm install express@0.14.0

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

Add the permissions to your database
    mysql -u username -p kitsune < app_perms.sql

Add one of your users to the 'Live Chat Agent' permissions group either through the Django admin panel or SQL
    INSERT INTO auth_user_groups (user_id, group_id) VALUES(
        (SELECT id FROM `auth_user` WHERE username='yourusername' LIMIT 1),
        (SELECT id FROM `auth_group` WHERE name='Live Chat Agent' LIMIT 1)
    );

## Getting SSL working (`https`)

Because `https` seems to be broken in Node.js when sending "large" files (> 10kb) to clients, if you want SSL,
you will need to proxy it over another server. Included in `configs/` is the file `apache2-inko.conf`, which contains
a very basic configuration for proxying through Apache2.

To use this configuration, `Include` the conf file in your Apache configuration.
    Include /path/to/inko/configs/apache2-inko.conf

You will need to adjust the `SSLCertificateFile` and `SSLCertificateKeyFile` to point toward your SSL key and cert.
Also, if you are not running Inko at `localhost:3000`, change the host:port pointers in the `ProxyPass` and `ProxyPassReverse`
configuration items.

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

## License

(The MIT License)

Copyright (c) 2010 Mozilla Foundation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.