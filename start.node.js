// Starts the drone.
// Receives video of the front camera as uncompressed frames
//
// Marker is a simple radial gradient from green to black.
// Unfortunately the front camera is not that good so the bright green in the center will become yellow and white
// Since we are looking for green pixels, the gradient will become a circle.
// Find this circle and keep the position in front of the marker

var arDrone = require('ar-drone');
var http    = require('http');
var fs      = require('fs');

// simulation (dry = true) or actual flying (dry = false)
var dry     = false;

var client = arDrone.createClient();
if (!dry) client.takeoff();


console.log('Connecting raw stream ...');

var rawStream = arDrone.createRawStream({frameRate:5});

rawStream
	.on('error', console.log)
	.on('data', function(rawBuffer) {
	
		// When you receive a new uncommpressed frame, analyse it and find the marker
		var p = scanBuffer(rawBuffer);
		
		var size = Math.max(p.w, p.h);
		
		// use the position of the marker to calculate commands for the drone
		// here is a lot of potential for optimization!
		if (size > 1) {
			var msg = [p.w, p.h];
		
			var reduceSpeed = 3;
			var d = (p.x - 320) / 300;
			var a = Math.abs(d);
			if (a > 1) a = 1;
			
			if (d < 0) {
				client.counterClockwise(a/reduceSpeed);
				msg.push(repeat('L', a, 10));
			} else {
				client.clockwise(a/reduceSpeed);
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
	
	// We need the following variables to calculate the center and the size of the marker
	var cS = 0;  // sum of c (c = color value)
	var xS = 0;  // sum of c*x
	var yS = 0;  // sum of c*y
	var xxS = 0; // sum of c*x*x
	var yyS = 0; // sum of c*y*y
	
	
	for (var y = 0; y < 360; y++) {
		for (var x = 0; x < 640; x++) {
		
			// get the r,g,b values of every pixel
			var r = buf[i+0];
			var g = buf[i+1];
			var b = buf[i+2];
			
			// calculate only the weight of green colors
			var c = g - Math.max(r,b);
			c = c - offset;
			
			if (c < 0) c = 0;
			
			// sum up the values
			cS  += c;
			xS  += x*c;
			xxS += x*x*c;
			yS  += y*c;
			yyS += y*y*c;
			
			// for debugging
			c = Math.round(255*c/(255-offset));
			buf[i+0] = c;
			buf[i+1] = c;
			buf[i+2] = c;
			
			i += 3;
		}
	}
	
	// generate some ascii art for debugging
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
			s = Math.round(20*s/(255*c));
			if (s > 5) s = 5;
			m += " .-+O#".charAt(s);
		}
		console.log(m);
	}
	
	// return the center, the size and the quality/clarity of the marker
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
