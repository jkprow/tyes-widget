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
  const FILES = ['beachboiz.wav', 'dnb.wav'];
  
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  
  async function rest() {
    const nodeGroups = await Promise.all(
      await FILES.map(async loop => {
        const response = await fetch(S3_ROOT + loop);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const gainNode = ctx.createGain();
        const bufferSourceNode = ctx.createBufferSource();
        gainNode.gain.value = 0;
        bufferSourceNode.buffer = audioBuffer;
        bufferSourceNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        bufferSourceNode.loop = true;
        return {
          gain: gainNode,
          bufferSource: bufferSourceNode,
        };
      })
    );
  
    const gains = nodeGroups.map(({gain, bufferSource}) => {
      bufferSource.start(0);
      return gain;
    });
  
    const top = document.getElementById('top');
    const middle = document.getElementById('middle');
    const bottom = document.getElementById('bottom');
  
    top.addEventListener('click', () => {
      console.log('Layer 1');
      gains[0].gain.value = 1 - gains[0].gain.value;
    });
  
    middle.addEventListener('click', () => {
      console.log('Layer 2');
    });
  
    bottom.addEventListener('click', () => {
      console.log('Layer 3');
      gains[1].gain.value = 1 - gains[1].gain.value;
    });
  }
  
  if (ctx.state !== 'suspended') return;
  const b = document.body;
  const events = ['touchstart','touchend', 'mousedown','keydown'];
  events.forEach(e => b.addEventListener(e, unlock, false));
  function unlock() { ctx.resume().then(clean).then(rest); }
  function clean() { events.forEach(e => b.removeEventListener(e, unlock)) };
})();