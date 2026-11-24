/* ==========================================================================
   Stasi Bakolias — site script (no dependencies)
   - "Lights off / on": light and dark themes, remembered per browser
   - Nav lamps: the lamp for the section you're reading lights up
   - Footer clock in Montréal time
   - The cord board: pull a plug off the shelf and patch it into a jack
   - The 404 page's dangling cord
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* ---------- Small helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function round(v) { return Math.round(v * 10) / 10; }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function svg(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  /* ==========================================================================
     Lights (theme)
     ========================================================================== */
  function initLights() {
    var button = $("[data-theme-toggle]");
    if (!button) return;
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

    function isDark() {
      var t = root.dataset.theme;
      return t ? t === "dark" : systemDark.matches;
    }
    function render() {
      var dark = isDark();
      button.innerHTML = (dark ? "Lights on" : "Lights off") +
        '<span class="vh">: switch to the ' + (dark ? "light" : "dark") + " theme</span>";
    }
    button.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* storage blocked: the choice lasts for this visit */ }
      render();
    });
    if (systemDark.addEventListener) systemDark.addEventListener("change", render);
    render();
  }

  /* ==========================================================================
     Masthead rule + nav lamps
     ========================================================================== */
  function initNav() {
    var masthead = $("[data-masthead]");
    var items = $$("[data-nav]").map(function (link) {
      var id = link.hash ? decodeURIComponent(link.hash.slice(1)) : "";
      return { link: link, section: id && link.pathname === location.pathname ? document.getElementById(id) : null };
    }).filter(function (item) { return item.section; });

    var queued = false;
    function update() {
      queued = false;
      if (masthead) masthead.classList.toggle("is-stuck", window.scrollY > 4);
      if (!items.length) return;

      var line = window.innerHeight * 0.38;
      var current = null;
      items.forEach(function (item) {
        if (item.section.getBoundingClientRect().top <= line) current = item;
      });
      var atBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 2;
      if (atBottom && current) current = items[items.length - 1];

      items.forEach(function (item) {
        if (item === current) item.link.setAttribute("aria-current", "location");
        else item.link.removeAttribute("aria-current");
      });
    }
    function queue() {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
  }

  /* ==========================================================================
     Clock and year
     ========================================================================== */
  function initClock() {
    $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

    var el = $("[data-clock]");
    if (!el || !window.Intl) return;
    var format;
    try {
      format = new Intl.DateTimeFormat("en-CA", {
        hour: "numeric", minute: "2-digit", timeZone: el.dataset.tz || "America/Toronto"
      });
    } catch (e) { return; }
    function tick() {
      var now = new Date();
      el.textContent = format.format(now);
      el.setAttribute("datetime", now.toISOString());
    }
    tick();
    setInterval(tick, 20000);
  }

  /* ==========================================================================
     Rope: a chain of points integrated with Verlet steps.
     Ends can be pinned; a floor keeps slack lying on the shelf.
     ========================================================================== */
  var GRAVITY = 2400;   // px per second squared
  var STEP = 1 / 120;   // seconds per physics step
  var ITERATIONS = 14;  // constraint passes per step
  var PLUG = 46;        // plug length, cord end to tip

  function Rope(count, x, y) {
    this.count = count;
    this.seg = 0;
    this.points = [];
    for (var i = 0; i < count; i++) this.points.push({ x: x, y: y, px: x, py: y });
  }

  /* head: how many points at the start are held in place (0, 1 or 2). */
  Rope.prototype.step = function (dt, damping, floor, head, pinEnd) {
    var pts = this.points, n = this.count, g = GRAVITY * dt * dt;
    var i, k, p, a, b, dx, dy, d, diff, aFixed, bFixed;

    for (i = 0; i < n; i++) {
      if (i < head || (i === n - 1 && pinEnd)) continue;
      p = pts[i];
      dx = (p.x - p.px) * damping;
      dy = (p.y - p.py) * damping;
      p.px = p.x; p.py = p.y;
      p.x += dx; p.y += dy + g;
    }

    for (k = 0; k < ITERATIONS; k++) {
      for (i = 0; i < n - 1; i++) {
        a = pts[i]; b = pts[i + 1];
        dx = b.x - a.x; dy = b.y - a.y;
        d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
        diff = (d - this.seg) / d;
        aFixed = i < head;
        bFixed = i + 1 < head || (i + 1 === n - 1 && pinEnd);
        if (aFixed && bFixed) continue;
        if (aFixed) { b.x -= dx * diff; b.y -= dy * diff; }
        else if (bFixed) { a.x += dx * diff; a.y += dy * diff; }
        else {
          dx *= diff * .5; dy *= diff * .5;
          a.x += dx; a.y += dy; b.x -= dx; b.y -= dy;
        }
      }
      if (floor !== null) {
        for (i = head; i < n - 1; i++) if (pts[i].y > floor) pts[i].y = floor;
      }
    }

    if (floor !== null) {
      for (i = head; i < n - 1; i++) {
        p = pts[i];
        if (p.y >= floor - .5) p.px = p.x - (p.x - p.px) * .6; // friction on the shelf
      }
    }
  };

  Rope.prototype.energy = function () {
    var e = 0, pts = this.points;
    for (var i = 1; i < this.count - 1; i++) e += Math.abs(pts[i].x - pts[i].px) + Math.abs(pts[i].y - pts[i].py);
    return e;
  };

  Rope.prototype.path = function () {
    var p = this.points, n = this.count;
    var d = "M" + round(p[0].x) + " " + round(p[0].y);
    for (var i = 1; i < n - 1; i++) {
      d += " Q" + round(p[i].x) + " " + round(p[i].y) + " " +
        round((p[i].x + p[i + 1].x) / 2) + " " + round((p[i].y + p[i + 1].y) / 2);
    }
    return d + " L" + round(p[n - 1].x) + " " + round(p[n - 1].y);
  };

  Rope.prototype.brush = function (x, y, vx, vy, radius, strength) {
    var pts = this.points, r2 = radius * radius;
    for (var i = 1; i < this.count - 1; i++) {
      var dx = pts[i].x - x, dy = pts[i].y - y;
      if (dx * dx + dy * dy < r2) { pts[i].px -= vx * strength; pts[i].py -= vy * strength; }
    }
  };

  /* ---------- Cord and plug drawing ---------- */
  var CORDS = {
    red:   { cord: "#B9262F", body: "#A6212A", boot: "#7C161D", shine: .2 },
    ivory: { cord: "#E3DAC3", body: "#D8CDB2", boot: "#B3A88C", shine: .45 },
    black: { cord: "#2B322E", body: "#272D29", boot: "#151917", shine: .16 }
  };

  function drawCord(layer, style) {
    var g = svg("g", {}, layer);
    return {
      shadow: svg("path", { fill: "none", stroke: "rgba(0,0,0,.32)", "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round", transform: "translate(2 5)" }, g),
      line: svg("path", { fill: "none", stroke: style.cord, "stroke-width": 5.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g),
      shine: svg("path", { fill: "none", stroke: "rgba(255,255,255," + (style.shine * .9) + ")", "stroke-width": 1.4, "stroke-linecap": "round", transform: "translate(-1 -1.3)" }, g)
    };
  }

  /* A plug in its own coordinates: the cord meets it at (0,0) and the tip is at (0,-PLUG). */
  function drawPlug(layer, style) {
    var g = svg("g", {}, layer);
    svg("rect", { x: -4.5, y: -9, width: 9, height: 11, rx: 3, fill: style.boot }, g);
    svg("rect", { x: -7.5, y: -33, width: 15, height: 26, rx: 5.5, fill: style.body }, g);
    svg("rect", { x: -5.2, y: -30, width: 2.4, height: 20, rx: 1.2, fill: "#FFFFFF", opacity: style.shine }, g);
    svg("rect", { x: -6.5, y: -37.5, width: 13, height: 5.5, rx: 1.5, fill: "#B08A3E" }, g);
    svg("rect", { x: -3.6, y: -PLUG, width: 7.2, height: 11, rx: 3.6, fill: "#D9B566" }, g);
    svg("rect", { x: -3.9, y: -PLUG + 5.5, width: 7.8, height: 1.6, fill: "#5C4620" }, g);
    svg("rect", { x: -1.8, y: -PLUG + 1.5, width: 1.4, height: 3.2, rx: .7, fill: "#FFF3D1", opacity: .7 }, g);
    return g;
  }

  /* ==========================================================================
     The cord board
     ========================================================================== */
  var SNAP = 34; // how close a plug tip must be to a socket to patch in

  function Board(el) {
    var self = this;
    this.el = el;
    this.wires = $("[data-wires]", el);
    this.readout = $("[data-readout]");
    this.hint = this.readout ? this.readout.textContent : "";
    this.cordLayer = svg("g", {}, this.wires);
    this.plugLayer = svg("g", {}, this.wires);
    this.running = false;
    this.visible = true;
    this.acc = 0;
    this.pointer = null;

    this.jacks = $$("[data-jack]", el).map(function (node) {
      return {
        el: node,
        label: node.dataset.jack,
        href: node.getAttribute("href"),
        socket: $(".jack__socket", node),
        x: 0, y: 0,
        cord: null
      };
    });

    this.cords = $$(".board__hole", el).map(function (hole) {
      return new Cord(self, hole, CORDS[hole.dataset.cord] || CORDS.red);
    });

    this.frame = this.frame.bind(this);
    this.measure();

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { self.measure(); });
      ro.observe(el);
      ro.observe($(".board__field", el));
    } else {
      window.addEventListener("resize", function () { self.measure(); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.measure(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        if (self.visible) self.wake();
      }).observe(el);
    }

    // Brushing past a cord with the mouse nudges it.
    el.addEventListener("pointermove", function (ev) {
      if (ev.pointerType !== "mouse" || self.dragging) return;
      var pt = self.local(ev);
      if (self.pointer && !reduceMotion.matches) {
        var vx = pt.x - self.pointer.x, vy = pt.y - self.pointer.y;
        self.cords.forEach(function (c) { if (c.state !== "rest") c.rope.brush(pt.x, pt.y, vx, vy, 26, .22); });
        self.wake();
      }
      self.pointer = pt;
    });
    el.addEventListener("pointerleave", function () { self.pointer = null; });

    this.intro();
  }

  Board.prototype.local = function (ev) {
    var r = this.el.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };

  Board.prototype.measure = function () {
    var r = this.el.getBoundingClientRect();
    if (!r.width) return;
    this.w = r.width;
    this.h = r.height;
    this.wires.setAttribute("viewBox", "0 0 " + round(r.width) + " " + round(r.height));

    this.jacks.forEach(function (jack) {
      var s = jack.socket.getBoundingClientRect();
      jack.x = s.left + s.width / 2 - r.left;
      jack.y = s.top + s.height / 2 - r.top;
    });

    var floor = 0;
    this.cords.forEach(function (cord) {
      var h = cord.holeEl.getBoundingClientRect();
      cord.hole = { x: h.left + h.width / 2 - r.left, y: h.top + h.height / 2 - r.top };
      floor = Math.max(floor, cord.hole.y);
    });
    this.floor = floor;

    this.cords.forEach(function (cord) { cord.reseat(); });
    this.render();
    this.wake();
  };

  Board.prototype.plugPoint = function (jack) {
    return { x: jack.x, y: jack.y + PLUG - 1 };
  };

  Board.prototype.nearestJack = function (cord, radius) {
    var tip = cord.tip(), best = null, bestD = radius;
    this.jacks.forEach(function (jack) {
      if (jack.cord && jack.cord !== cord) return;
      var d = Math.hypot(jack.x - tip.x, jack.y - tip.y);
      if (d < bestD) { best = jack; bestD = d; }
    });
    return best;
  };

  Board.prototype.showTarget = function (jack) {
    this.jacks.forEach(function (j) { j.el.classList.toggle("is-target", j === jack); });
  };

  Board.prototype.say = function (jack) {
    var out = this.readout;
    if (!out) return;
    out.textContent = "";
    if (!jack) { out.textContent = this.hint; return; }
    if (jack.href) {
      out.appendChild(document.createTextNode("Connected to " + jack.label + ". "));
      var a = document.createElement("a");
      a.href = jack.href;
      a.tabIndex = -1;
      a.textContent = "Go to " + jack.label;
      out.appendChild(a);
    } else {
      out.textContent = "Line " + jack.label + " is quiet. The labelled jacks go somewhere.";
    }
  };

  /* On load, cords patch into the jacks named in data-patch (default: the first labelled jack).
     With reduced motion they start plugged in; otherwise the first one is carried over. */
  Board.prototype.intro = function () {
    var self = this;
    var names = (this.el.dataset.patch || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var jacks = names.length
      ? names.map(function (name) { return self.jacks.filter(function (j) { return j.label === name; })[0]; }).filter(Boolean)
      : this.jacks.filter(function (j) { return j.href; }).slice(0, 1);

    jacks.slice(0, this.cords.length).forEach(function (jack, i) {
      var cord = self.cords[i];
      if (reduceMotion.matches) {
        cord.patch(jack, true);
        cord.settle();
        return;
      }
      setTimeout(function () {
        if (cord.state !== "rest" || jack.cord) return;
        cord.flyTo(function () { return self.plugPoint(jack); }, function () { cord.patch(jack, true); }, true);
      }, 700 + i * 450);
    });
    this.render();
  };

  Board.prototype.wake = function () {
    if (this.running || !this.visible) return;
    this.running = true;
    this.calm = 0;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  };

  Board.prototype.frame = function (now) {
    if (!this.visible) { this.running = false; return; }
    var elapsed = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += elapsed;
    var cords = this.cords, i;
    while (this.acc >= STEP) {
      for (i = 0; i < cords.length; i++) cords[i].update(STEP);
      this.acc -= STEP;
    }
    this.render();

    var busy = false, energy = 0;
    for (i = 0; i < cords.length; i++) {
      if (cords[i].state === "held" || cords[i].state === "flying") busy = true;
      energy += cords[i].rope.energy();
    }
    if (!busy && energy < .03 * cords.length) {
      if (++this.calm > 40) { this.running = false; return; }
    } else {
      this.calm = 0;
    }
    requestAnimationFrame(this.frame);
  };

  Board.prototype.render = function () {
    for (var i = 0; i < this.cords.length; i++) this.cords[i].render();
  };

  /* ---------- A cord with a plug on the end ---------- */
  function Cord(board, holeEl, style) {
    var self = this;
    this.board = board;
    this.holeEl = holeEl;
    this.hole = { x: 0, y: 0 };
    this.end = { x: 0, y: 0 };   // where the cord meets the plug
    this.lastEnd = { x: 0, y: 0 };
    this.angle = -Math.PI / 2;   // plug direction, cord end to tip (straight up)
    this.tilt = 0;
    this.state = "rest";         // rest | held | flying | patched
    this.jack = null;
    this.flight = null;
    this.rope = new Rope(22, 0, 0);
    this.paths = drawCord(board.cordLayer, style);
    this.plug = drawPlug(board.plugLayer, style);

    this.grip = document.createElement("span");
    this.grip.className = "plug-grip";
    board.el.appendChild(this.grip);

    this.grip.addEventListener("pointerdown", function (ev) { self.grab(ev); });
    this.grip.addEventListener("pointermove", function (ev) { self.move(ev); });
    this.grip.addEventListener("pointerup", function (ev) { self.drop(ev); });
    this.grip.addEventListener("pointercancel", function (ev) { self.drop(ev); });
    this.grip.addEventListener("lostpointercapture", function (ev) { self.drop(ev); });
  }

  Cord.prototype.tip = function () {
    return { x: this.end.x + Math.cos(this.angle) * PLUG, y: this.end.y + Math.sin(this.angle) * PLUG };
  };

  Cord.prototype.reseat = function () {
    if (this.state === "patched" && this.jack) {
      var p = this.board.plugPoint(this.jack);
      this.end.x = p.x; this.end.y = p.y;
    } else if (this.state === "rest") {
      this.end.x = this.hole.x; this.end.y = this.hole.y;
      this.rope.points.forEach(function (pt) { pt.x = pt.px = this.hole.x; pt.y = pt.py = this.hole.y; }, this);
    } else if (this.state === "held") {
      this.end.x = clamp(this.end.x, 10, this.board.w - 10);
      this.end.y = clamp(this.end.y, PLUG + 6, this.board.floor);
    }
  };

  Cord.prototype.length = function () {
    var d = Math.hypot(this.end.x - this.hole.x, this.end.y - this.hole.y);
    return d + Math.min(40, d * .07);
  };

  Cord.prototype.update = function (dt) {
    if (this.state === "flying") this.advance(dt);

    // Plugs hang straight when seated; in the hand they lean with the motion.
    var vx = (this.end.x - this.lastEnd.x) / dt;
    this.lastEnd.x = this.end.x; this.lastEnd.y = this.end.y;
    var target = this.state === "held" || this.state === "flying" ? clamp(vx * .0011, -.55, .55) : 0;
    this.tilt += (target - this.tilt) * (reduceMotion.matches ? 1 : .12);
    this.angle = -Math.PI / 2 + this.tilt;

    var pts = this.rope.points, n = this.rope.count;
    var reach = Math.hypot(this.end.x - this.hole.x, this.end.y - this.hole.y);
    var exit = Math.min(16, reach * .06);  // the cord leaves its hole heading up
    pts[0].x = pts[0].px = this.hole.x;
    pts[0].y = pts[0].py = this.hole.y;
    pts[1].x = pts[1].px = this.hole.x;
    pts[1].y = pts[1].py = this.hole.y - exit;
    pts[n - 1].x = pts[n - 1].px = this.end.x;
    pts[n - 1].y = pts[n - 1].py = this.end.y;
    this.rope.seg = Math.max(0, this.length() - exit) / (n - 2);
    this.rope.step(dt, reduceMotion.matches ? .55 : .992, this.board.floor, 2, true);
  };

  Cord.prototype.settle = function () {
    for (var i = 0; i < 360; i++) this.update(STEP);
    this.rope.points.forEach(function (p) { p.px = p.x; p.py = p.y; });
  };

  Cord.prototype.render = function () {
    var visible = this.length() > 3;
    var d = visible ? this.rope.path() : "";
    this.paths.shadow.setAttribute("d", d);
    this.paths.line.setAttribute("d", d);
    this.paths.shine.setAttribute("d", d);

    var deg = round(this.angle * 180 / Math.PI + 90);
    this.plug.setAttribute("transform", "translate(" + round(this.end.x) + " " + round(this.end.y) + ") rotate(" + deg + ")");

    var mx = this.end.x + Math.cos(this.angle) * PLUG * .5;
    var my = this.end.y + Math.sin(this.angle) * PLUG * .5;
    this.grip.style.transform = "translate(" + round(mx - 22) + "px," + round(my - 29) + "px)";
  };

  Cord.prototype.flyTo = function (to, done, arc) {
    var start = { x: this.end.x, y: this.end.y };
    var target = to();
    var dist = Math.hypot(target.x - start.x, target.y - start.y);
    this.flight = {
      start: start,
      to: to,
      lift: arc ? Math.min(130, dist * .4 + 24) : 0,
      t: 0,
      duration: reduceMotion.matches ? 0 : clamp(dist * 1.5, 160, 820) / 1000,
      done: done
    };
    this.state = "flying";
    this.board.wake();
  };

  Cord.prototype.advance = function (dt) {
    var f = this.flight;
    if (!f) return;
    f.t = f.duration ? Math.min(1, f.t + dt / f.duration) : 1;
    var e = easeInOut(f.t), u = 1 - e;
    var to = f.to();
    var cx = (f.start.x + to.x) / 2;
    var cy = Math.min(f.start.y, to.y) - f.lift;
    this.end.x = u * u * f.start.x + 2 * u * e * cx + e * e * to.x;
    this.end.y = u * u * f.start.y + 2 * u * e * cy + e * e * to.y;
    if (f.t >= 1) {
      this.flight = null;
      f.done();
    }
  };

  Cord.prototype.patch = function (jack, quiet) {
    this.state = "patched";
    this.jack = jack;
    jack.cord = this;
    jack.el.classList.add("is-lit");
    var p = this.board.plugPoint(jack);
    this.end.x = p.x; this.end.y = p.y;
    if (!quiet) this.board.say(jack);
    this.board.wake();
  };

  Cord.prototype.unpatch = function () {
    if (!this.jack) return;
    this.jack.el.classList.remove("is-lit");
    this.jack.cord = null;
    this.jack = null;
  };

  Cord.prototype.goHome = function () {
    var self = this, board = this.board;
    this.unpatch();
    this.flyTo(function () { return self.hole; }, function () {
      self.state = "rest";
      if (!board.cords.some(function (c) { return c.state === "patched"; })) board.say(null);
    }, false);
  };

  Cord.prototype.hop = function () {
    var self = this;
    this.flyTo(function () { return { x: self.hole.x, y: self.hole.y - 34 }; }, function () { self.goHome(); }, false);
  };

  Cord.prototype.grab = function (ev) {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    ev.preventDefault();
    try { this.grip.setPointerCapture(ev.pointerId); } catch (e) { /* capture is a nicety */ }
    var pt = this.board.local(ev);
    this.drag = {
      id: ev.pointerId,
      dx: this.end.x - pt.x, dy: this.end.y - pt.y,
      sx: pt.x, sy: pt.y,
      moved: false,
      wasPatched: this.state === "patched"
    };
    this.unpatch();
    this.flight = null;
    this.state = "held";
    this.board.dragging = this;
    root.classList.add("is-dragging");
    this.board.wake();
  };

  Cord.prototype.move = function (ev) {
    var drag = this.drag;
    if (!drag || ev.pointerId !== drag.id) return;
    var pt = this.board.local(ev);
    if (!drag.moved && Math.hypot(pt.x - drag.sx, pt.y - drag.sy) > 4) drag.moved = true;
    if (!drag.moved) return;
    this.end.x = clamp(pt.x + drag.dx, 10, this.board.w - 10);
    this.end.y = clamp(pt.y + drag.dy, PLUG + 6, this.board.floor);
    this.board.showTarget(this.board.nearestJack(this, SNAP * 1.25));
    this.board.wake();
  };

  Cord.prototype.drop = function (ev) {
    var drag = this.drag;
    if (!drag || ev.pointerId !== drag.id) return;
    this.drag = null;
    this.board.dragging = null;
    root.classList.remove("is-dragging");
    this.board.showTarget(null);

    if (!drag.moved) {
      if (drag.wasPatched) this.goHome(); // a tap on a plugged cord puts it back on the shelf
      else this.hop();                    // a tap on a resting plug shows that it moves
      return;
    }
    var self = this, board = this.board;
    var jack = board.nearestJack(this, SNAP);
    if (jack) {
      this.flyTo(function () { return board.plugPoint(jack); }, function () { self.patch(jack); }, false);
    } else {
      this.goHome();
    }
  };

  /* ==========================================================================
     404: one cord hanging from the top, plug free on the end
     ========================================================================== */
  function initDangle(layer) {
    var host = layer.parentElement;
    var rope = new Rope(26, 0, 0);
    var cordG = svg("g", {}, layer);
    var paths = drawCord(cordG, CORDS.red);
    var plug = drawPlug(layer, CORDS.red);
    var grip = document.createElement("span");
    grip.className = "plug-grip";
    host.appendChild(grip);

    var anchor = { x: 0, y: -8 };
    var held = null, running = false, calm = 0, last = 0, acc = 0, angle = Math.PI / 2;

    var avoid = $("[data-dangle-avoid]", host);

    function layout(first) {
      var w = host.clientWidth, h = host.clientHeight;
      layer.setAttribute("viewBox", "0 0 " + w + " " + h);
      var narrow = w < 760;
      anchor.x = narrow ? w * .8 : w * .74;
      var length = clamp(h * .52, 180, 440);
      if (narrow && avoid) {
        // On small screens the text spans the width, so the cord stops above it.
        var top = avoid.getBoundingClientRect().top - host.getBoundingClientRect().top;
        length = clamp(top - 40, 90, 440);
      }
      rope.seg = length / (rope.count - 1);
      if (first) {
        // Start pulled out to the side so the first thing the cord does is swing.
        var swing = reduceMotion.matches ? 0 : Math.min(w * .18, 180);
        rope.points.forEach(function (p, i) {
          var t = i / (rope.count - 1);
          p.x = p.px = anchor.x - swing * t * t;
          p.y = p.py = anchor.y + length * t * (reduceMotion.matches ? 1 : .92);
        });
      }
    }

    function local(ev) {
      var r = host.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    function render() {
      var d = rope.path();
      paths.shadow.setAttribute("d", d);
      paths.line.setAttribute("d", d);
      paths.shine.setAttribute("d", d);
      var p = rope.points, n = rope.count;
      var a = p[n - 2], b = p[n - 1];
      var target = Math.atan2(b.y - a.y, b.x - a.x);
      angle = target;
      plug.setAttribute("transform", "translate(" + round(b.x) + " " + round(b.y) + ") rotate(" + round(angle * 180 / Math.PI + 90) + ")");
      var mx = b.x + Math.cos(angle) * PLUG * .5, my = b.y + Math.sin(angle) * PLUG * .5;
      grip.style.transform = "translate(" + round(mx - 22) + "px," + round(my - 29) + "px)";
    }

    function frame(now) {
      var elapsed = Math.min(.05, (now - last) / 1000);
      last = now;
      acc += elapsed;
      var pts = rope.points, n = rope.count;
      while (acc >= STEP) {
        pts[0].x = pts[0].px = anchor.x;
        pts[0].y = pts[0].py = anchor.y;
        if (held) {
          var end = pts[n - 1];
          end.px = end.x; end.py = end.y;
          end.x = held.x; end.y = held.y;
        }
        rope.step(STEP, reduceMotion.matches ? .6 : .989, null, 1, !!held);
        acc -= STEP;
      }
      render();
      // Sleep once the swing has died down to well under a pixel per frame.
      if (!held && rope.energy() < .25) {
        if (++calm > 40) { running = false; return; }
      } else calm = 0;
      requestAnimationFrame(frame);
    }

    function wake() {
      if (running) return;
      running = true; calm = 0; last = performance.now();
      requestAnimationFrame(frame);
    }

    grip.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      ev.preventDefault();
      try { grip.setPointerCapture(ev.pointerId); } catch (e) { /* fine */ }
      var pt = local(ev), end = rope.points[rope.count - 1];
      held = { id: ev.pointerId, ox: end.x - pt.x, oy: end.y - pt.y, x: end.x, y: end.y };
      root.classList.add("is-dragging");
      wake();
    });
    grip.addEventListener("pointermove", function (ev) {
      if (!held || ev.pointerId !== held.id) return;
      var pt = local(ev);
      held.x = pt.x + held.ox;
      held.y = pt.y + held.oy;
    });
    function release(ev) {
      if (!held || ev.pointerId !== held.id) return;
      held = null;
      root.classList.remove("is-dragging");
      wake();
    }
    grip.addEventListener("pointerup", release);
    grip.addEventListener("pointercancel", release);
    grip.addEventListener("lostpointercapture", release);
    window.addEventListener("resize", function () { layout(false); wake(); });

    layout(true);
    render();
    wake();
  }

  /* ---------- Start ---------- */
  initLights();
  initNav();
  initClock();
  $$("[data-board]").forEach(function (el) { new Board(el); });
  $$("[data-dangle]").forEach(initDangle);

})();
