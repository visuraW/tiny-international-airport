/*
 * 360° object viewer
 * Turns a numbered image sequence (01.webp ... 36.webp) into a spinning object.
 *
 * Usage:
 *   <div class="spin360" data-folder="assets/360/plane" data-frames="36" data-name="Plane"></div>
 *
 * Drag (or swipe) left/right to rotate by hand, or use the arrow buttons or
 * keyboard arrows to step one frame (10°). There is no auto-rotation.
 */
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function Spin360(el) {
    this.el = el;
    this.folder = el.getAttribute('data-folder');
    this.count = parseInt(el.getAttribute('data-frames') || '36', 10);
    this.ext = el.getAttribute('data-ext') || 'webp';
    this.name = el.getAttribute('data-name') || 'object';
    this.speed = parseInt(el.getAttribute('data-speed') || '90', 10); // ms per frame
    this.frame = 0;
    this.images = [];
    this.loaded = 0;
    this.ready = false;
    this.playing = false; // hand rotation only
    this.visible = true;
    this.timer = null;
    this.build();
    this.load();
  }

  Spin360.prototype.src = function (i) {
    return this.folder + '/' + pad(i + 1) + '.' + this.ext;
  };

  Spin360.prototype.build = function () {
    var el = this.el;
    el.innerHTML =
      '<div class="spin-stage" tabindex="0" role="img" aria-label="360 degree view of the ' + this.name + '. Drag or use arrow keys to rotate.">' +
        '<img class="spin-img" alt="" draggable="false">' +
        '<div class="spin-loading"><span class="spin-bar"></span><span class="spin-load-text">Loading 0 / ' + this.count + '</span></div>' +
        '<div class="spin-hint">Drag to rotate</div>' +
      '</div>' +
      '<div class="spin-controls">' +
        '<button type="button" class="spin-btn spin-prev" aria-label="Rotate back 10 degrees">&#8249;</button>' +
        '<button type="button" class="spin-btn spin-next" aria-label="Rotate forward 10 degrees">&#8250;</button>' +
        '<span class="spin-count">01 / ' + pad(this.count) + '</span>' +
        '<span class="spin-angle">0°</span>' +
      '</div>';

    this.stage = el.querySelector('.spin-stage');
    this.img = el.querySelector('.spin-img');
    this.bar = el.querySelector('.spin-bar');
    this.loadText = el.querySelector('.spin-load-text');
    this.loading = el.querySelector('.spin-loading');
    this.hint = el.querySelector('.spin-hint');
    this.countEl = el.querySelector('.spin-count');
    this.angleEl = el.querySelector('.spin-angle');

    var self = this;
    el.querySelector('.spin-prev').addEventListener('click', function () { self.pause(); self.show(self.frame - 1); });
    el.querySelector('.spin-next').addEventListener('click', function () { self.pause(); self.show(self.frame + 1); });

    this.stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { self.pause(); self.show(self.frame - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { self.pause(); self.show(self.frame + 1); e.preventDefault(); }
    });

    // Drag / swipe: dragging across the full width of the stage = one full turn
    var startX = 0, startFrame = 0, dragging = false;
    this.stage.addEventListener('pointerdown', function (e) {
      if (!self.ready) return;
      dragging = true; startX = e.clientX; startFrame = self.frame;
      self.pause(); self.hint.hidden = true;
      self.stage.setPointerCapture(e.pointerId);
      self.stage.classList.add('is-dragging');
    });
    this.stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var step = Math.round(dx / self.stage.clientWidth * self.count);
      self.show(startFrame - step);
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      self.stage.classList.remove('is-dragging');
      try { self.stage.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    this.stage.addEventListener('pointerup', end);
    this.stage.addEventListener('pointercancel', end);

    // Pause auto-rotation while the viewer is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        self.tick();
      }).observe(el);
    }
  };

  // Preload every frame first so rotation is smooth
  Spin360.prototype.load = function () {
    var self = this;
    for (var i = 0; i < this.count; i++) {
      var im = new Image();
      im.onload = im.onerror = function () {
        self.loaded++;
        self.bar.style.width = (self.loaded / self.count * 100) + '%';
        self.loadText.textContent = 'Loading ' + self.loaded + ' / ' + self.count;
        if (self.loaded === self.count) self.onReady();
      };
      im.src = this.src(i);
      this.images.push(im);
    }
  };

  Spin360.prototype.onReady = function () {
    this.ready = true;
    var first = this.images[0];
    if (first.naturalWidth) this.stage.style.aspectRatio = first.naturalWidth + ' / ' + first.naturalHeight;
    this.loading.hidden = true;
    this.show(0);
    this.tick();
  };

  Spin360.prototype.show = function (i) {
    if (!this.ready) return;
    this.frame = ((i % this.count) + this.count) % this.count;
    this.img.src = this.images[this.frame].src;
    this.countEl.textContent = pad(this.frame + 1) + ' / ' + pad(this.count);
    this.angleEl.textContent = Math.round(this.frame * 360 / this.count) + '°';
  };

  Spin360.prototype.tick = function () {
    var self = this;
    var shouldRun = this.ready && this.playing && this.visible;
    if (shouldRun && !this.timer) {
      this.timer = setInterval(function () { self.show(self.frame + 1); }, this.speed);
    } else if (!shouldRun && this.timer) {
      clearInterval(this.timer); this.timer = null;
    }
  };

  Spin360.prototype.play = function () { this.playing = true; this.updatePlayButton(); this.tick(); };
  Spin360.prototype.pause = function () { this.playing = false; this.updatePlayButton(); this.tick(); };
  Spin360.prototype.updatePlayButton = function () {
    if (!this.playBtn) return;
    this.playBtn.textContent = this.playing ? 'Pause' : 'Play';
    this.playBtn.setAttribute('aria-label', this.playing ? 'Pause rotation' : 'Play rotation');
  };

  document.querySelectorAll('.spin360').forEach(function (el) { new Spin360(el); });
})();
