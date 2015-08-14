module.exports = MessageBuilder

function MessageBuilder () {
  this.initialize.apply(this, arguments);
};

MessageBuilder.prototype = {
    initialize: function(sink, speed, reedSolomon) {
		this.sink  = sink;
		this.speed = speed; // 1 = BASE , 2 = 2xFASTER
		this.bytes = [];
		this.blocks = [];
    this.ReedSolomonEncoder = reedSolomon;
	},

	clear: function() {
		this.bytes.length = 0;
		this.blocks.length = 0;
	},

	build: function() {
		this.makeEncodedBlocks();

		this.appendPrologue();
		this.appendPreamble(1 - this.getFirstBit());
		this.appendMessageHeader();
		this.appendBlocks();
		this.appendEpilogue();
	},

	appendMessageHeader: function() {
		var k = this.blocks[0].dataLength;
		this.appendByte(k);
		this.appendByte(k);

		return k;
	},

	getFirstBit: function() {
		return this.blocks[0].dataLength & 1;
	},

	appendBlocks: function() {
		var i, k;
		var len = this.blocks.length;
		var plen = this.ReedSolomonEncoder.getParityLength();

		for (i = 0;i < len;i++) {
			var bk = this.blocks[i];
			var dlen = bk.dataLength;
			for (k = 0;k < dlen;k++) {
				this.appendByte(bk.dataBytes[k]);
			}

			for (k = 0;k < plen;k++) {
				this.appendByte(bk.parityBytes[k]);
			}
		}
	},

	makeEncodedBlocks: function() {
		var bytes = this.bytes;
		var dlen = this.ReedSolomonEncoder.getDataLength();
		var plen = this.ReedSolomonEncoder.getParityLength();
		var blockLength = bytes.length;
		var padding = 0, i;
		if (blockLength >= dlen) {
			blockLength = dlen;
		} else {
			padding = dlen - blockLength;
		}

		var tmp = new Array(dlen);
		var pbuf = new Array(plen);
		for (i = 0;i < blockLength;i++) {
			tmp[i] = bytes.shift();
		}

		for (;i < dlen;i++) {
			tmp[i] = 0;
		}

		this.ReedSolomonEncoder.encode(tmp, pbuf);
		this.blocks.push({
			dataBytes: tmp,
			parityBytes: pbuf,
			dataLength: blockLength
		});
	},

	setBytesFromText: function(s, buffer) {
		var bytes = buffer ? buffer : this.bytes;
		var es = encodeURI(s);
		var pos = 0, len = es.length;
		var k;

		for (;pos < len;) {
			k = es.charCodeAt(pos);
			if (k == 0x25) {
				k =  parseInt(es.charAt(++pos), 16) << 4;
				k |= parseInt(es.charAt(++pos), 16);
			}

			bytes.push(k)
			pos++;
		}

		return bytes;
	},

	appendPreamble: function(termBit) {
		for (var i = 0;i < 22;i++) {
			this.sink.appendBit(1);
			this.sink.appendBit(0);
		}

		if (termBit) {
			this.sink.appendBit(1);
			this.sink.appendBit(1);
		} else {
			this.sink.appendBit(0);
		}
	},

	appendPrologue: function() {
		this.writeBlank(96 * this.speed);
	},

	appendEpilogue: function() {
		this.writeBlank(42 * this.speed);
	},

	appendByte: function(k) {
		for (var i = 0;i < 8;i++)
			this.sink.appendBit((k>>i) & 1);
	},

	writeBlank: function(count) {
		for (var i = 0;i < count;i++)
			this.sink.appendBit(0);
	}
}