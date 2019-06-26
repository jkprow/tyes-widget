class Layer {
  constructor(args) {
    this.el = document.getElementById(args.id);
    this.el.addEventListener('click', () => this.toggle());

    this.imageURLs = args.imageURLs;
    this.imageSourceIndex = 0;
    this.toggleHooks = [];
    
    this.registerToggleHook(() => this.toggleImage());
  }
  
  registerToggleHook(hook) {
    this.toggleHooks.push(hook);
  }
  
  toggle() {
    this.toggleHooks.forEach(hook => hook());
  }

  toggleImage() {
    if (this.imageSourceIndex === this.imageURLs.length - 1) {
      this.imageSourceIndex = 0;
    } else {
      this.imageSourceIndex++;
    }
  
    this.el.src = this.imageURLs[this.imageSourceIndex];
  }
}

export class BufferLayer extends Layer {
  constructor(args) {
    super(args);
    
    this.audioContext = args.audioContext;
    this.audioURL = args.audioURL;
    
    this.loopGain = args.audioContext.createGain();
    this.loopGain.gain.value = 0;

    this.loopBufferSource = args.audioContext.createBufferSource();
    this.loopBufferSource.loop = true;
    
    this.loopBufferSource.connect(this.loopGain);
    
    this.registerToggleHook(() => this.toggleAudio());
  }
  
  async initAudio() {
    const response = await fetch(this.audioURL);
    const arrayBuffer = await response.arrayBuffer();
    this.loopBufferSource.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }
  
  connectAudio(layer) {
    layer.inputs.forEach(input => {
      this.loopGain.connect(input);
    })
  }
  
  startAudio() {
    this.loopBufferSource.start(0);
  }
  
  toggleAudio() {
    this.audioContext.toggleGain(this.loopGain);
  }
}

export class ReverbLayer extends Layer {
  constructor(args) {
    super(args);
    
    this.audioContext = args.audioContext;
    const rate = args.audioContext.sampleRate;
  
    this.reverb = args.audioContext.createConvolver();
    this.decay = args.decay;
    this.length = rate * args.seconds;
    const impulse = args.audioContext.createBuffer(2, this.length, rate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);

    for (let i = 0; i < this.length; i++) {
      impulseL[i] = this.getVerbSample(i);
      impulseR[i] = this.getVerbSample(i);
    }
    
    this.reverb.buffer = impulse;

    // Set up dry and wet gains, and reverb
    this.dryGain = args.audioContext.createGain();
    this.dryGain.gain.value = 1;

    this.wetGain = args.audioContext.createGain();
    this.wetGain.gain.value = 0;

    this.reverb.connect(this.wetGain);
    
    this.inputs = [this.reverb, this.dryGain];
    this.registerToggleHook(() => this.toggleEffect());
  }
  
  getVerbSample(sample) {
    return (Math.random() * 2 - 1) * Math.pow(1 - sample / this.length, this.decay);
  }
  
  connectAudio(node) {
    this.dryGain.connect(node);
    this.wetGain.connect(node);
  }
  
  toggleEffect() {
    this.audioContext.toggleGain(this.wetGain);
    this.audioContext.toggleGain(this.dryGain);
  };
  
  toggleImage() {
    super.toggleImage();
    setTimeout(() => super.toggleImage(), 1500);
  }
}