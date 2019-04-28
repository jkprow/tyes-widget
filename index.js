(function() {
  const top = document.getElementById('top');
  const middle = document.getElementById('middle');
  const bottom = document.getElementById('bottom');
  
  top.addEventListener('click', () => {
    console.log('Layer 1');
  });
  
  middle.addEventListener('click', () => {
    console.log('Layer 2');
  });
  
  bottom.addEventListener('click', () => {
    console.log('Layer 3');
  });
})();