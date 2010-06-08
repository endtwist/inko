require('ext').extend(Object, {
    reject: function(obj, fn, context) {
        var rejected = {};
        for(var i = 0, k = Object.keys(obj); i < k.length; i++) {
            var key = k[i];
            if(!fn.call(context, obj[key], key, obj))
                rejected[key] = obj[key];
        }
        return rejected;
    }
});

exports.DjangoPickleReader = new Class({
    b2a_hex: function(s) {
        var result = [];
        for(var i=0; i<s.length; i++) {
            var c = (s[i].charCodeAt(0) >> 4) & 0xf;
            if(c > 9)
                c = c + 'a'.charCodeAt(0) - 10;
            else
                c = c + '0'.charCodeAt(0);
            result.push(String.fromCharCode(c));
            c = s[i].charCodeAt(0) & 0xf;
            if(c > 9)
                c = c + 'a'.charCodeAt(0) - 10;
            else
                c = c + '0'.charCodeAt(0);
            result.push(String.fromCharCode(c));
        }
        return result.join('');
    },
    
    decode_long: function(data) {
        if(typeof data == 'string')
            data = data.split('')
        var nbytes = data.length;
        var rdata = data.slice(0).reverse();
        if(!nbytes) return 0;
        var ashex = this.b2a_hex(rdata);
        var n = parseInt(ashex, 16);
        if(data.slice(data.length-1) >= '\x80')
            n -= 1 << (nbytes * 8)
        return n;
    },
    
    read_uint1: function(f) {
        if(f[0])
            return f[0].charCodeAt(0);
        throw new Error('not enough data in stream to read uint1');
    },
    
    read_long1: function(f) {
        var n = this.read_uint1(f);
        var data = f.substring(1, 1 + n);
        if(data.length != n)
            throw new Error('not enough data in stream to read long1');
        return this.decode_long(data);
    },
    
    id: function(data) {
        if(data.indexOf('\x80') == -1)
            throw new Error('could not read data: unknown pickle version');
        var pos = data.indexOf('\x8a');
        if(pos == -1)
            throw new Error('could not find first long in data');
        return this.read_long1(data.substring(pos+1));
    }
});