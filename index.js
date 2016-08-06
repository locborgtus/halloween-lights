'use strict'

// this simple program is a halloween light theme changer with phillips hue
// what it does:
// 1. initialize with hue bridge
// 2. finds all lights available
// 3. loops through all lights and change them periodically according to an
//    algorithm

let async = require('async');
let hue = require("node-hue-api");
let hueApi = require("node-hue-api").HueApi;
let lightState = hue.lightState;

// this is not secured, but this code is meant to be ran on a protected LAN
let username = '3f74bb2634fca0243f4e1972156ed49f';

let api = null;
let numLights = 0;

// runtime parameters

// hsl color array
let colors = [
  [ 52792, 255, 255 ], // purple
  [ 6553, 255, 255 ], // orange
  [ 21845, 255, 255 ], // green
  [ 65535, 255, 255 ], // red

  [ 52792, 255, 127 ], // purple
  [ 6553, 255, 127 ], // orange
  [ 21845, 255, 127 ], // green
  [ 65535, 255, 127 ], // red
];

let interval = 10000;

let random = (low, high) => {
  return Math.floor(Math.random() * (high - low) + low);
}

let changeLight = (light) => {
  // randomly pick a color from the colors array
  let index = random(0, colors.length + 1);

  // define how we want the new light state (color, transition) to be
  let state = lightState.create().transitionSlow().on();

  // using overflow length as trigger for flashing
  // this is a result from the random index picking
  if (index == colors.length) {
    console.log('flash', light);
    state.longAlert();
    api.setLightState(light + 1, state)
      .then()
      .done();
  } else {
    let c = colors[index];

    console.log('changing light', light, 'to color', c);

    state.hue(c[0]).sat(c[1]).bri(c[2]);
    api.setLightState(light + 1, state)
      .then()
      .done();
  }

  // randomly wait
  // the wait time is interval +/- (interval / 2)
  let waitTime = interval + random(-interval / 2, interval / 2)

  // schedule this same function to be called in the future
  setTimeout(changeLight, waitTime, light);
}

async.series({
  find: (cb) => {
    hue.nupnpSearch()
      .then((br) => {
        if (br.length == 0) {
          cb(new Error('No bridges found'));
          return;
        }

        let bridgeAddr = br[0].ipaddress;
        console.log('Bridge Address: %s', bridgeAddr);

        // instantiate API for later use
        api = new hueApi(bridgeAddr, username);

        cb(null);
      })
      .fail((err) => {
        cb(err);
      })
      .done();
  },

  getStatus: (cb) => {
    api.lights()
      .then((res) => {
        let state = lightState.create().off();

        numLights = res.lights.length;

        console.log('Bridge has %d lights', numLights);

        cb(null);
      })
      .fail((err) => {
        cb(err);
      })
      .done();
  },

  loop: (cb) => {
    for (let i = 0; i < numLights; i++) {
      changeLight(i);
    }
  }

}, (err, res) => {
  console.log('error: ', err);
});
