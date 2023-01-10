class Layer {
  constructor(main, args) {
    const layer = document.createElement('img');
    layer.id = args.id;
    layer.classList.add('layer');
    layer.src = args.imageURLs[0];
    layer.addEventListener('click', e => this.toggle(e));
    main.appendChild(layer);
    
    this.layer = layer;
  
    const slider = document.createElement('input');
    slider.id = `${args.id}_slider`;
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.classList.add('slider');
    slider.addEventListener('input', e => this.onSlide(e));
    main.appendChild(slider);
    
    this.slider = slider;
    
    this.clickOn = args.clickOn;
    this.clickOff = args.clickOff;
  
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
  
    this.layer.src = this.imageURLs[this.imageSourceIndex];
  }
  
  playClickAudio(e) {
    if (this.isToggled) {
      this.clickOff.play();
      return;
    }
    this.clickOn.play();
  }
  
  onSlide() {
    // Override me
  }
}

export class BufferLayer extends Layer {
  constructor(audioContext, main, args) {
    super(main, args);
    
    this.audioContext = audioContext;
    this.audioURL = args.audioURL;
    
    this.loopGain = audioContext.createRampingGainNode(0, 1);
  
    this.loopBufferSource = audioContext.createBufferSource();
    this.loopBufferSource.loop = true;
    
    this.loopBufferSource.connect(this.loopGain);
    
    this.registerToggleHook(() => this.toggleAudio());
    
    this.slider.value = '100';
  }
  
  async initAudio() {
    const response = await fetch(this.audioURL);
    let arrayBuffer;
    try {
      arrayBuffer = await response.arrayBuffer();
    } catch (e) {
      console.log('buffer', e);
    }
    
    try {
      this.loopBufferSource.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.log('error decoding', e)
    }
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
  constructor(audioContext, main, args) {
    super(main, args);
    
    const rate = audioContext.sampleRate;
  
    this.reverb = audioContext.createConvolver();
    this.decay = args.decay;
    this.length = rate * args.seconds;
    const impulse = audioContext.createBuffer(2, this.length, rate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);

    for (let i = 0; i < this.length; i++) {
      impulseL[i] = this.getVerbSample(i);
      impulseR[i] = this.getVerbSample(i);
    }
    
    this.reverb.buffer = impulse;

    // Set up dry and wet gains, and reverb
    this.dryGain = audioContext.createRampingGainNode(1, 0.5);
    this.wetGain = audioContext.createRampingGainNode(0, 0.5);
  
    this.reverb.connect(this.wetGain);
    
    this.inputs = [this.reverb, this.dryGain];
    this.registerToggleHook(() => this.toggleEffect());
    
    this.slider.value = '50';
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
