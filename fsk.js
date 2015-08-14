/*
 * Javascript FSK Modulator - Mar 2010 Satoshi Ueyama
 * based on Javascript Sound Player by Moriyoshi Koizumi
 */

module.exports = FSKGen

function FSKGen () { this.initialize.apply(this, arguments); };
FSKGen.CarrierFQ1 = 2100;
FSKGen.CarrierFQ2 = 1300;
FSKGen.CarrierFQM = 100;

FSKGen.prototype = {
    initialize: function(sr, highspeed) {
		this.mWavTbl = null;
		this.mOutSamplingRate = sr;
		this.mReadStep1 = FSKGen.CarrierFQ1 / FSKGen.CarrierFQM;
		this.mReadStep2 = FSKGen.CarrierFQ2 / FSKGen.CarrierFQM;
		this.mSamplesPerBit = highspeed ? 147 /* 300bps */ : 294 /* 150bps */;
		this.setupTable();

		this.clear();
	},

	clear: function() {
		this.mBitCount = 0;
		this.mShiftCount = 0;
		this.mBuffer = [0];
	},

	appendBit: function(b) {
		if (b != 0) {
			this.mBuffer[ this.mBuffer.length - 1 ] |= (1 << this.mShiftCount);
		}

		++this.mShiftCount;
		if ((++this.mBitCount & 0xf) == 0) {
			this.mBuffer.push(0);
			this.mShiftCount = 0;
		}
	},

	readBit: function(i) {
		var block = i >> 4;
		var ofs = i & 0xf;

		return (this.mBuffer[block] >> ofs) & 1;
	},

	dumpBuffer: function() {
		var ret = [];
		var len = this.mBuffer.length;
		for (var i = 0;i < len;i++) {
			ret.push(this.mBuffer[i].toString(16));
		}

		return ret.join('  ');
	},

	setupTable: function() {
		var samples = this.mOutSamplingRate / FSKGen.CarrierFQM;
		this.mWavTbl = new Array(samples);

		for (var i = 0;i < samples;i++) {
			this.mWavTbl[i] = (Math.sin(Math.PI*2.0 * i / samples) * 8192) | 0;
		}
	},

	insertDing: function(a, len) {
		var step = 880*Math.PI / this.mOutSamplingRate;
		for (var i = 0;i < len;i++) {
			var vol = (len-(i<<1))/len;

			if (vol < 0.001)
				a[i] = 0;
			else
				a[i] = (Math.sin(i * step) * vol * 22000.0) | 0;
		}
	},

	generateSamples: function(ding) {
		var datalen = this.mBitCount;
		var blen = this.mSamplesPerBit;
		var slen = blen * datalen;
		var step;
		var bitPos = 0;
		var tblPos = 0;

		var tbl  = this.mWavTbl;
		var tlen = tbl.length;

		var ding_len = ding ? this.mOutSamplingRate : 0;
		var samps = new Array(ding_len + slen);
		if (ding)
			this.insertDing(samps, ding_len);

		for (var i = 0;i < slen;i++) {
			if (!(i % blen)) {
				step = this.readBit(bitPos++) ? this.mReadStep2 : this.mReadStep1;
			}
			tblPos = (tblPos + step) % tlen;

			samps[ding_len + i] = tbl[tblPos];
		}

		return samps;
	}
}