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
  // Globals
  const S3_ROOT = 'https://s3.us-west-2.amazonaws.com/jkprow/';
  const FILES = ['beachboiz.wav', 'dnb.wav'];
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Wait for user gesture to init AudioContext
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
  
  // Fetch the loop files and set up their audio graph
  const gainBufferPairs = await Promise.all(
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

  // Once both loops are ready, kick them off
  const gains = gainBufferPairs.map(({gain, bufferSource}) => {
    bufferSource.start(0);
    return gain;
  });
  
  /**
   * Given a GainNode, toggle its gain from 0% to 100%
   * over a 1s ramp
   * @param {GainNode} gainNode
   */
  function toggleGain(gainNode) {
    const gain = gainNode.gain;
    gain.linearRampToValueAtTime(1 - gain.value, ctx.currentTime + 1);
  }
  
  // Set up event listeners
  const top = document.getElementById('top');
  const middle = document.getElementById('middle');
  const bottom = document.getElementById('bottom');

  top.addEventListener('click', () => {
    toggleGain(gains[0]);
  });

  middle.addEventListener('click', () => {
    console.log('Layer 2');
  });

  bottom.addEventListener('click', () => {
    toggleGain(gains[1]);
  });
})();