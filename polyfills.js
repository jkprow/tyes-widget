// for Safari

if (!window.AudioContext && window.webkitAudioContext) {
  const oldFunc = webkitAudioContext.prototype.decodeAudioData;
  webkitAudioContext.prototype.decodeAudioData = function(arraybuffer) {
    return new Promise((resolve, reject) => {
      oldFunc.call(this, arraybuffer, resolve, reject);
    });
  }
}