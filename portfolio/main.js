class CyberCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.isIdle = true;
    this.lastTime = performance.now();
    this.animFrameId = null;
    
    this.gridSize = 40;
    this.offscreenGrid = document.createElement('canvas');
    this.offscreenCtx = this.offscreenGrid.getContext('2d');

    this.mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      lastMovedTime: 0
    };

    this.ripples = [];
    this.particles = [];
    this.maxParticles = 80;
    this.chars = '01010101XYZ89ABCDEF</>{}';

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    const handleMove = (x, y) => {
      this.mouse.targetX = x;
      this.mouse.targetY = y;
      this.mouse.lastMovedTime = performance.now();

      this.addRipple(x, y);
      this.spawnParticles(x, y, 2);

      if (this.isIdle) {
        this.isIdle = false;
        this.loop(performance.now());
      }
    };

    window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    this.loop(performance.now());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.createOffscreenGrid();

    if (this.isIdle) {
      this.render();
    }
  }

  createOffscreenGrid() {
    this.offscreenGrid.width = this.width;
    this.offscreenGrid.height = this.height;

    const ctx = this.offscreenCtx;
    // Subdued grid color matching #F9FAFB background
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.05)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x < this.width; x += this.gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y < this.height; y += this.gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
    for (let x = 0; x < this.width; x += this.gridSize) {
      for (let y = 0; y < this.height; y += this.gridSize) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  addRipple(x, y) {
    if (this.ripples.length > 6) return;
    this.ripples.push({
      x, y,
      radius: 0,
      maxRadius: 160,
      alpha: 0.5,
      speed: 4
    });
  }

  spawnParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const char = this.chars[Math.floor(Math.random() * this.chars.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vy: 1.5 + Math.random() * 2.5,
        char: char,
        alpha: 0.8,
        fade: 0.015 + Math.random() * 0.015
      });
    }
  }

  update() {
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.2;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.2;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed;
      r.alpha = 0.5 * (1 - r.radius / r.maxRadius);

      if (r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy;
      p.alpha -= p.fade;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    const now = performance.now();
    if (
      now - this.mouse.lastMovedTime > 2000 &&
      this.ripples.length === 0 &&
      this.particles.length === 0
    ) {
      this.isIdle = true;
    }
  }

  render() {
    // Fill light background #F9FAFB
    this.ctx.fillStyle = '#F9FAFB';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Render offscreen grid
    this.ctx.drawImage(this.offscreenGrid, 0, 0);

    // Mouse Glow (Primary Blue)
    if (this.mouse.x > 0 && this.mouse.y > 0) {
      const gradient = this.ctx.createRadialGradient(
        this.mouse.x, this.mouse.y, 0,
        this.mouse.x, this.mouse.y, 200
      );
      gradient.addColorStop(0, 'rgba(37, 99, 235, 0.1)');
      gradient.addColorStop(0.5, 'rgba(37, 99, 235, 0.02)');
      gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.x, this.mouse.y, 200, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Ripples (Primary Blue)
    this.ctx.lineWidth = 1.5;
    for (const r of this.ripples) {
      this.ctx.strokeStyle = `rgba(37, 99, 235, ${r.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Floating Code Particles (Accent Emerald #10B981)
    this.ctx.font = '12px "Courier New", monospace';
    for (const p of this.particles) {
      this.ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
      this.ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(p.char, p.x, p.y);
    }
    this.ctx.shadowBlur = 0;
  }

  loop(timestamp) {
    if (this.isIdle) return;

    this.update();
    this.render();

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CyberCanvas('cyber-canvas');
});