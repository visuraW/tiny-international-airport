// Small page extras: camcorder clock, promo sound toggle, flight-board flip-in
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Camcorder clock: starts at the promo's 07:42:16 AM and keeps ticking
  var timeEl = document.getElementById('osd-time');
  var seconds = 7 * 3600 + 42 * 60 + 16;
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function drawClock() {
    var h = Math.floor(seconds / 3600) % 24, m = Math.floor(seconds / 60) % 60, s = seconds % 60;
    var h12 = h % 12 || 12;
    timeEl.textContent = pad(h12) + ':' + pad(m) + ':' + pad(s) + (h < 12 ? ' AM' : ' PM');
  }
  if (timeEl) { drawClock(); setInterval(function () { seconds++; drawClock(); }, 1000); }

  // Promo video sound toggle (browsers only autoplay muted video)
  var video = document.getElementById('promo');
  var soundBtn = document.getElementById('sound-btn');
  if (video && soundBtn) {
    soundBtn.addEventListener('click', function () {
      video.muted = !video.muted;
      if (!video.muted) { video.currentTime = 0; video.play(); }
      soundBtn.textContent = video.muted ? 'Sound off' : 'Sound on';
      soundBtn.setAttribute('aria-pressed', video.muted ? 'false' : 'true');
    });
  }

  // Flight board: letters shuffle before settling, like a split-flap display
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function flip(el, delay) {
    var final = el.textContent, steps = 10, i = 0;
    setTimeout(function () {
      var t = setInterval(function () {
        i++;
        el.textContent = final.split('').map(function (c, k) {
          if (c === ' ' || k < (i / steps) * final.length) return c;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join('');
        if (i >= steps) { clearInterval(t); el.textContent = final; }
      }, 45);
    }, delay);
  }
  var board = document.querySelector('.board');
  if (board && !reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      board.querySelectorAll('.flap').forEach(function (el, n) { flip(el, n * 35); });
    }, { threshold: 0.3 });
    io.observe(board);
  }
})();
