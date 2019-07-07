const audio1 = document.getElementById('click_audio_1');
const audio2 = document.getElementById('click_audio_2');

class Layer {
  constructor(args) {
    this.el = document.getElementById(args.id);
    this.el.addEventListener('click', e => this.toggle(e));
  
    this.slider = document.getElementById(args.slider_id);
    this.slider.addEventListener('input', e => this.onSlide(e));
  
    this.imageURLs = args.imageURLs;
    this.imageSourceIndex = 0;
    this.toggleHooks = [];
    this.isToggled = false;
  
    this.registerToggleHook(() => this.toggleImage());
  }
  
  registerToggleHook(hook) {
    this.toggleHooks.push(hook);
  }
  
  toggle(e) {
    this.isToggled = !this.isToggled;
    this.playClickAudio(e);
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
  
  playClickAudio(e) {
    if (this.isToggled) {
      audio1.play();
      return;
    }
    audio2.play();
  }
  
  onSlide() {
    // Override me
  }
}

export class BufferLayer extends Layer {
  constructor(args) {
    super(args);
    
    this.audioContext = args.audioContext;
    this.audioURL = args.audioURL;
    
    this.loopGain = args.audioContext.createRampingGainNode(0, 1);
  
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
    this.loopGain.toggle();
  }
  
  onSlide(e) {
    const newGain = parseInt(e.target.value) / 100;
    this.loopGain.setValue(newGain);
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
    this.dryGain = args.audioContext.createRampingGainNode(1, 0.5);
    this.wetGain = args.audioContext.createRampingGainNode(0, 0.5);
  
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
    this.wetGain.toggle();
    this.dryGain.toggle();
  };
  
  toggleImage() {
    super.toggleImage();
    setTimeout(() => super.toggleImage(), 2000);
  }
  
  onSlide(e) {
    const newGain = e.target.value / 100;
    this.dryGain.setValue(1 - newGain);
    this.wetGain.setValue(newGain);
  }
}