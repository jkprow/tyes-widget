import { BufferLayer, ReverbLayer } from './Layer.js';

const directory = '/tyes-animation/'

const ASSETS = {
  AUDIO_CLICK_ON: directory + 'click_off.wav',
  AUDIO_CLICK_OFF: directory + 'click_on.wav',
  
  AUDIO_KEYS: directory + 'keys.wav',
  AUDIO_TREES: directory + 'trees.wav',
  
  IMAGE_KEYS_OFF: directory + 'keys_off.png',
  IMAGE_KEYS_ON: directory + 'keys_on.gif',
  
  IMAGE_MIXER_OFF: directory + 'mixer_off.png',
  IMAGE_MIXER_TO_ON: directory + 'mixer_to_on.gif',
  IMAGE_MIXER_ON: directory + 'mixer_on.png',
  IMAGE_MIXER_TO_OFF: directory + 'mixer_to_off.gif',
  
  IMAGE_TREES_OFF: directory + 'trees_off.png',
  IMAGE_TREES_ON: directory + 'trees_on.gif',
  
  STYLESHEET: directory + 'styles.css',
};


const head = document.getElementsByTagName('HEAD')[0];
const link = document.createElement('link');
link.rel = 'stylesheet';
link.type = 'text/css';
link.href = ASSETS.STYLESHEET;
head.appendChild(link);

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
