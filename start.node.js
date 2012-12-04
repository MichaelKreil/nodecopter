// Run this to receive a raw image stream from your drone.

var arDrone = require('ar-drone');
var http    = require('http');
var fs    = require('fs');
var dry = false;

var client = arDrone.createClient();
if (!dry) client.takeoff();


console.log('Connecting raw stream ...');

var rawStream = arDrone.createRawStream({frameRate:5});

rawStream
	.on('error', console.log)
	.on('data', function(rawBuffer) {
		var p = scanBuffer(rawBuffer);
		var size = Math.max(p.w, p.h);
		
		//client.stop();
		//console.log(point);
		if (size > 1) {
			var msg = [p.w, p.h];
		
			var reduceSpeed = 3;
			var d = (p.x - 320) / 300;
			var a = Math.abs(d);
			if (a > 1) a = 1;
			
			if (d < 0) {
				client.counterClockwise(a/reduceSpeed);
				//client.left(a);
				msg.push(repeat('L', a, 10));
			} else {
				client.clockwise(a/reduceSpeed);
				//client.right(a);
				msg.push(repeat('R', a, 10));
			}
		
			var reduceSpeed = 3;
			var d = (p.y - 180) / 300;
			var a = Math.abs(d);
			if (a > 1) a = 1;
			
			if (d < 0) {
				client.up(a/reduceSpeed);
				msg.push(repeat('U', a, 10));
			} else {
				client.down(a/reduceSpeed);
				msg.push(repeat('D', a, 10));
			}
			
			var reduceSpeed = 10;
			var d = (size-50)/100;
			var a = Math.abs(d);
			if (a > 1) a = 1;
			
			if (d < 0) {
				client.front(a/reduceSpeed);
				msg.push(repeat('F', a, 20));
			} else {
				client.back(a/reduceSpeed);
				msg.push(repeat('B', a, 20));
			}
			
			console.log(msg.join('   '));
		} else {
			console.log('nix', p.l);
			client.stop();
		}
	});
	
function scanBuffer(buf) {
	var offset = 64;

	var i = 0;
	var cS = 0;
	var xS = 0;
	var yS = 0;
	var xxS = 0;
	var yyS = 0;
	
	//fs.writeFileSync('test.raw', buf);
	
	for (var y = 0; y < 360; y++) {
		for (var x = 0; x < 640; x++) {
			var r = buf[i+0];
			var g = buf[i+1];
			var b = buf[i+2];
			var c = g - Math.max(r,b);
			c = c - offset;
			
			if (c < 0) c = 0;
			
			cS  += c;
			xS  += x*c;
			xxS += x*x*c;
			yS  += y*c;
			yyS += y*y*c;
			
			c = Math.round(255*c/(255-offset));
			buf[i+0] = c;
			buf[i+1] = c;
			buf[i+2] = c;
			
			i += 3;
		}
	}
	
	var yMax = 18;
	var xMax = 64;
	var w = 640/xMax;
	var h = 360/yMax;
	
	for (var y = 0; y < yMax; y++) {
		var m = '';
		for (var x = 0; x < xMax; x++) {
			var s = 0;
			var c = 0;
			for (var yi = 0; yi < h; yi++) {
				for (var xi = 0; xi < w; xi++) {
					var i = ((y*h+yi)*640 + (x*w+xi))*3;
					s += buf[i];
					c++;
				}
			}
			//console.log(s);
			s = Math.round(20*s/(255*c));
			if (s > 5) s = 5;
			m += " .-+O#".charAt(s);
		}
		console.log(m);
	}
	
	//fs.writeFileSync('post.raw', buf);
	
	//xSum /= cSum;
	//ySum /= cSum;
	return {
		x:xS/cS,
		y:yS/cS,
		w:Math.sqrt(xxS*cS-xS*xS)/cS,
		h:Math.sqrt(yyS*cS-yS*yS)/cS,
		l:cS/(255-offset)
	};
}	


function repeat(c, value, max) {
	var s = '';
	for (var i = 0; i < max; i++) s += (value*max > i) ? c : '.';
	return s;
}
	
	
/*
var server = http.createServer(function(req, res) {
  if (!lastPng) {
    res.writeHead(503);
    res.end('Did not receive any raw data yet.');
    return;
  }

  res.writeHead(200, {'Content-Type': 'image/raw'});
  res.end(lastPng);
});

server.listen(8080, function() {
  console.log('Serving latest raw on port 8080 ...');
});
*/