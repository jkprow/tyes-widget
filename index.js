// make safari happy
import './polyfills.js';
import { BufferLayer, ReverbLayer } from './Layer.js';

const ASSETS = {
  AUDIO_CLICK_ON: 'audio/UI_1.wav',
  AUDIO_CLICK_OFF: 'audio/UI_2.wav',
  
  AUDIO_KEYS: 'https://s3.us-west-2.amazonaws.com/jkprow/beachboiz.wav',
  AUDIO_TREES: 'https://s3.us-west-2.amazonaws.com/jkprow/dnb.wav',
  
  IMAGE_KEYS_OFF: 'img/piano/off.png',
  IMAGE_KEYS_ON: 'img/piano/on.gif',
  
  IMAGE_MIXER_OFF: 'img/mixer/off.png',
  IMAGE_MIXER_TO_ON: 'img/mixer/toOn.gif',
  IMAGE_MIXER_ON: 'img/mixer/on.png',
  IMAGE_MIXER_TO_OFF: 'img/mixer/toOff.gif',
  
  IMAGE_TREES_OFF: 'img/trees/off.png',
  IMAGE_TREES_ON: 'img/trees/on.gif',
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const main = document.getElementById('animation-main');

const clickOn = document.createElement('audio');
clickOn.src = ASSETS.AUDIO_CLICK_ON;
main.appendChild(clickOn);

const clickOff = document.createElement('audio');
clickOff.src = ASSETS.AUDIO_CLICK_OFF;
main.appendChild(clickOff);


audioContext.createRampingGainNode = function(startGain, endGain) {
  const node = this.createGain();
  
  node.startGain = startGain;
  node.endGain = endGain;
  node.gain.value = startGain;
  
  node.isToggled = false;
  
  node.toggle = function toggle() {
    const toGain = this.isToggled?
      this.startGain :
      this.endGain;
    this.gain.linearRampToValueAtTime(toGain, this.context.currentTime + 1);
    this.isToggled = !this.isToggled;
  };
  
  node.setValue = function setValue(v) {
    if (this.isToggled) {
      this.gain.setValueAtTime(v, this.context.currentTime);
    }
    this.endGain = v;
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

const keysLayer = new BufferLayer(audioContext, main,{
  id: 'top',
  slider_id: 'top_slider',
  audioURL: ASSETS.AUDIO_KEYS,
  imageURLs: [
    ASSETS.IMAGE_KEYS_OFF,
    ASSETS.IMAGE_KEYS_ON,
  ],
  clickOn,
  clickOff,
});

const mixerLayer = new ReverbLayer(audioContext, main,{
  seconds: 1,
  decay: 0.5,
  id: 'middle',
  slider_id: 'middle_slider',
  imageURLs: [
    ASSETS.IMAGE_MIXER_OFF,
    ASSETS.IMAGE_MIXER_TO_ON,
    ASSETS.IMAGE_MIXER_ON,
    ASSETS.IMAGE_MIXER_TO_OFF,
  ],
  clickOn,
  clickOff,
});

const treeLayer = new BufferLayer(audioContext, main,{
  id: 'bottom',
  slider_id: 'bottom_slider',
  audioURL: ASSETS.AUDIO_TREES,
  imageURLs: [
    ASSETS.IMAGE_TREES_OFF,
    ASSETS.IMAGE_TREES_ON,
  ],
  clickOn,
  clickOff,
});

keysLayer.connectAudio(mixerLayer);
treeLayer.connectAudio(mixerLayer);
mixerLayer.connectAudio(audioContext.destination);

(async function() {
  try {
    await Promise.all([
      await keysLayer.initAudio(),
      await treeLayer.initAudio(),
    ]);
  
    keysLayer.startAudio();
    treeLayer.startAudio();
  } catch (e) {
    console.log('Could not start audio - Running without audio');
  }
})();