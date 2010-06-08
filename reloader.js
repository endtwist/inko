var fs = require('fs'),
    sys = require('sys'),
    spawn = require('child_process').spawn,
    args = process.argv.slice(2);
var proc;

function run() {
    if(proc !== undefined) {
        try {
            proc.kill();
        } catch(e) {}
    }
    proc = spawn('node', args);
    proc.stdout.addListener('data', function(data) {
        sys.print(data);
    });
    proc.stderr.addListener('data', function(data) {
        sys.print(data);
    });
}

fs.watchFile(__dirname, function(curr, prev) {
    if(curr.mtime > prev.mtime)
        run();
});

run();