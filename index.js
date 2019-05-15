// make safari happy
if (!window.AudioContext && window.webkitAudioContext) {
  const oldFunc = webkitAudioContext.prototype.decodeAudioData;
  webkitAudioContext.prototype.decodeAudioData = function(arraybuffer) {
    return new Promise((resolve, reject) => {
      oldFunc.call(this, arraybuffer, resolve, reject);
    });
  }
}

(async function() {
  const S3_ROOT = 'https://s3.us-west-2.amazonaws.com/jkprow/';
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Init Context
  if (ctx.state === 'suspended') {
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
    await Promise.race(
      events.map(event => new Promise(resolve => {
        document.body.addEventListener(event, resolve, false);
      }))
    );
    events.forEach(e => document.body.removeEventListener(e, this));
    await ctx.resume();
  }
  
  // Set up gains
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1;
  dryGain.connect(ctx.destination);
  
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0;
  wetGain.connect(ctx.destination);
  
  // Set up reverb
  
  function makeReverb(seconds = 1, decay = 3) {
    const reverb = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = rate * seconds;
    const impulse = ctx.createBuffer(2, length, rate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);
    
    function getVerbSample(sample) {
      return (Math.random() * 2 - 1) * Math.pow(1 - sample / length, decay);
    }
    
    for (let i = 0; i < length; i++) {
      impulseL[i] = getVerbSample(i);
      impulseR[i] = getVerbSample(i);
    }
    
    reverb.buffer = impulse;
    return reverb;
  }
  
  const reverb = makeReverb();
  reverb.connect(wetGain);
  
  class Layer {
    static toggleGain(gain) {
      gain.linearRampToValueAtTime(1 - gain.value, ctx.currentTime + 1);
    }
    
    constructor(args) {
      this.el = document.getElementById(args.id);
      this.el.addEventListener('click', () => this.toggle());
  
      this.audioURL = args.audioURL;
      this.loopGain = null;
      this.loopBufferSource = null;
  
      this.imageURLs = args.imageURLs;
      this.imageSourceIndex = 0;
    }
    
    async initAudio() {
      this.loopBufferSource = ctx.createBufferSource();
      this.loopBufferSource.loop = true;
      
      try {
        const response = await fetch(this.audioURL);
        const arrayBuffer = await response.arrayBuffer();
        this.loopBufferSource = await ctx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.log("Couldn't fetch audio data.");
      }
      
      this.loopGain = ctx.createGain();
      this.loopGain.gain.value = 0;
  
      this.loopBufferSource.connect(this.loopGain);
      this.loopGain.connect(reverb);
      this.loopGain.connect(dryGain);
    }
    
    startLoop() {
      this.loopBufferSource.start(0);
    }
    
    toggle() {
      console.log('toggle');
      this.toggleImage();
      this.toggleAudio();
    }
    
    toggleAudio() {
      Layer.toggleGain(this.loopGain.gain);
    }
    
    toggleImage() {
      if (this.imageSourceIndex === this.imageURLs.length - 1) {
        this.imageSourceIndex = 0;
      } else {
        this.imageSourceIndex++;
      }
      
      const nextImage = this.imageURLs[this.imageSourceIndex];
      this.el.src = nextImage.url;
      
      if (nextImage.isTransition) {
        setTimeout(() => this.toggleImage(), 1500);
      }
    }
  }
  
  const keyboardLayer = new Layer({
    id: 'top',
    audioURL: S3_ROOT + 'beachboiz.wav',
    imageURLs: [
      { url: 'img/piano/off.png' },
      { url: 'img/piano/on.gif' },
    ],
  });
  
  const treeLayer = new Layer({
    id: 'bottom',
    audioURL: S3_ROOT + 'dnb.wav',
    imageURLs: [
      { url: 'img/trees/off.png' },
      { url: 'img/trees/on.gif' },
    ],
  });
  
  const mixerLayer = new Layer({
    id: 'middle',
    imageURLs: [
      { url: 'img/mixer/off.png' },
      { url: 'img/mixer/toOn.gif', isTransition: true },
      { url: 'img/mixer/on.png' },
      { url: 'img/mixer/toOff.gif', isTransition: true },
    ],
  });
  
  mixerLayer.toggleAudio = function() {
    Layer.toggleGain(wetGain.gain);
    Layer.toggleGain(dryGain.gain);
  };

  await Promise.all([
    keyboardLayer.initAudio(),
    treeLayer.initAudio(),
  ]);

  keyboardLayer.startLoop();
  treeLayer.startLoop();
})();