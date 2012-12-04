// Run this to receive a png image stream from your drone.

var arDrone = require('ar-drone');
var client  = arDrone.createClient();
client.land();