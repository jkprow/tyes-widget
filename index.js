// make safari happy
import './polyfills.js';
import { BufferLayer, ReverbLayer } from './Layer.js';

const S3_ROOT = 'https://s3.us-west-2.amazonaws.com/jkprow/';
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

audioContext.createRampingGainNode = function(startGain, endGain) {
  const node = this.createGain();
  
  node.startGain = startGain;
  node.endGain = endGain;
  node.gain.value = startGain;
  
  node.isToggled = false;
  
  node.toggle = function toggle() {
    console.log('toggling', this);
    const toGain = this.isToggled?
      this.startGain :
      this.endGain;
    this.gain.linearRampToValueAtTime(toGain, this.context.currentTime + 1);
    this.isToggled = !this.isToggled;
  };
  
  return node;
};

// Take user input to resume the AudioContext
(async function() {
  if (audioContext.state === 'suspended') {
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
    await Promise.race(
      events.map(event => new Promise(resolve => {
        document.body.addEventListener(event, resolve, false);
      }))
    );
    events.forEach(e => document.body.removeEventListener(e, this));
    await audioContext.resume();
  }
})();

const keyboardLayer = new BufferLayer({
  audioContext,
  id: 'top',
  audioURL: S3_ROOT + 'beachboiz.wav',
  imageURLs: [
    'img/piano/off.png',
    'img/piano/on.gif',
  ],
});

const mixerLayer = new ReverbLayer({
  audioContext,
  seconds: 1,
  decay: 0.5,
  id: 'middle',
  imageURLs: [
    'img/mixer/off.png',
    'img/mixer/toOn.gif',
    'img/mixer/on.png',
    'img/mixer/toOff.gif',
  ],
});

const treeLayer = new BufferLayer({
  audioContext,
  id: 'bottom',
  audioURL: S3_ROOT + 'dnb.wav',
  imageURLs: [
    'img/trees/off.png',
    'img/trees/on.gif',
  ],
});

keyboardLayer.connectAudio(mixerLayer);
treeLayer.connectAudio(mixerLayer);
mixerLayer.connectAudio(audioContext.destination);

(async function() {
  try {
    await Promise.all([
      await keyboardLayer.initAudio(),
      await treeLayer.initAudio(),
    ]);
  
    keyboardLayer.startAudio();
    treeLayer.startAudio();
  } catch (e) {
    console.log('Could not start audio - Running without audio');
  }
})();