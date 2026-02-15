(function () {
  var RT_NS = "rtSlider";
  if (window[RT_NS] && window[RT_NS].__initialized) return;

  var lenisLoadingPromise = null;

  function loadLenis() {
    if (typeof window.Lenis !== "undefined") return Promise.resolve();
    if (lenisLoadingPromise) return lenisLoadingPromise;
    lenisLoadingPromise = new Promise(function (resolve, reject) {
      var existing =
        document.querySelector('script[data-rt-lenis="true"]') ||
        document.querySelector('script[src*="lenis"]');
      if (existing) {
        if (typeof window.Lenis !== "undefined") {
          resolve();
          return;
        }
        existing.addEventListener("load", function () {
          resolve();
        });
        existing.addEventListener("error", function (e) {
          reject(e);
        });
      } else {
        var s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/lenis@1.3.16/dist/lenis.min.js";
        s.async = true;
        s.dataset.rtLenis = "true";
        s.onload = function () {
          resolve();
        };
        s.onerror = function (e) {
          reject(e);
        };
        document.head.appendChild(s);
      }
    });
    return lenisLoadingPromise;
  }

  var LenisHub = (function () {
    var set = new Set();
    var rafId = 0;
    function loop(t) {
      set.forEach(function (l) {
        try {
          l.raf(t);
        } catch (e) {}
      });
      rafId = set.size ? requestAnimationFrame(loop) : 0;
    }
    return {
      add: function (lenis) {
        if (!lenis) return;
        set.add(lenis);
        if (!rafId) rafId = requestAnimationFrame(loop);
      },
      remove: function (lenis) {
        if (!lenis) return;
        set.delete(lenis);
        if (!set.size && rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
    };
  })();

  function uid() {
    return "s" + Math.random().toString(36).slice(2);
  }

  function assignUID(el, attr) {
    if (!el.getAttribute(attr)) el.setAttribute(attr, uid());
    return el.getAttribute(attr);
  }

  function injectOnce(key, css) {
    var s = document.head.querySelector('[data-rt-injected="' + key + '"]');
    if (!s) {
      s = document.createElement("style");
      s.setAttribute("data-rt-injected", key);
      document.head.appendChild(s);
    }
    if (s.textContent !== css) s.textContent = css;
    return s;
  }

  function removeInjected(key) {
    var s = document.head.querySelector('[data-rt-injected="' + key + '"]');
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }

  function toSel(v) {
    return typeof v === "string" ? v.trim() : "";
  }

  function parseBool(v, def) {
    if (v === null || v === undefined) return def;
    var s = String(v).trim().toLowerCase();
    if (s === "") return true;
    if (s === "true" || s === "1" || s === "yes" || s === "y" || s === "on")
      return true;
    if (s === "false" || s === "0" || s === "no" || s === "n" || s === "off")
      return false;
    return def;
  }

  function parseNum(v, def) {
    if (v === null || v === undefined) return def;
    var s = String(v).trim();
    if (!s.length) return def;
    var n = Number(s);
    return Number.isFinite(n) ? n : def;
  }

  function parseStr(v, def) {
    if (v === null || v === undefined) return def;
    var s = String(v);
    return s.length ? s : def;
  }

  function clamp(i) {
    return i < 0 ? 0 : i > 1 ? 1 : i;
  }

  function parseEasing(name) {
    var n = String(name || "").trim();
    if (!n) return null;
    var map = {
      linear: function (t) {
        return clamp(t);
      },
      easeInQuad: function (t) {
        t = clamp(t);
        return t * t;
      },
      easeOutQuad: function (t) {
        t = clamp(t);
        return t * (2 - t);
      },
      easeInOutQuad: function (t) {
        t = clamp(t);
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      },
      easeInCubic: function (t) {
        t = clamp(t);
        return t * t * t;
      },
      easeOutCubic: function (t) {
        t = clamp(t);
        return 1 - Math.pow(1 - t, 3);
      },
      easeInOutCubic: function (t) {
        t = clamp(t);
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      },
      easeInOutSine: function (t) {
        t = clamp(t);
        return -(Math.cos(Math.PI * t) - 1) / 2;
      },
      easeOutExpo: function (t) {
        t = clamp(t);
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      },
    };
    return map[n] || null;
  }

  function isTransparentColor(val) {
    if (!val) return true;
    var v = String(val).trim().toLowerCase();
    if (v === "transparent") return true;
    if (v.startsWith("rgba(")) {
      var parts = v
        .slice(5, -1)
        .split(",")
        .map(function (x) {
          return x.trim();
        });
      var a = parts.length === 4 ? Number(parts[3]) : 1;
      return !Number.isFinite(a) ? false : a === 0;
    }
    return false;
  }

  function findNearestOpaqueBgColor(el) {
    var n = el;
    while (n && n !== document.documentElement) {
      var cs = getComputedStyle(n);
      var bg = cs.backgroundColor;
      if (!isTransparentColor(bg)) return bg;
      n = n.parentElement;
    }
    var rootBg = getComputedStyle(document.body).backgroundColor;
    return isTransparentColor(rootBg) ? "rgb(255, 255, 255)" : rootBg;
  }

  function isOverflowingX(el) {
    if (!el) return false;
    try {
      return el.scrollWidth > el.clientWidth + 1;
    } catch (e) {
      return false;
    }
  }

  function findScrollableAncestor(el) {
    var n = el;
    while (n && n !== document.body) {
      var cs = getComputedStyle(n);
      var ox = cs.overflowX;
      var scrollable = ox === "auto" || ox === "scroll" || ox === "overlay";
      if (scrollable && isOverflowingX(n)) return n;
      n = n.parentElement;
    }
    return el;
  }

  function resolveControl(root, selector, sliderId) {
    if (!selector) return null;
    var local = root.querySelector(selector);
    if (local) return local;
    var byFor = document.querySelector(
      selector + '[data-rt-slider-for="' + sliderId + '"]',
    );
    if (byFor) return byFor;
    var all = Array.from(document.querySelectorAll(selector));
    if (all.length === 1) return all[0];
    var scoped = all.filter(function (el) {
      var owner = el.closest("[data-rt-slider]");
      return owner === root;
    });
    if (scoped.length === 1) return scoped[0];
    return null;
  }

  function isVisibleNode(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    return el.getClientRects().length > 0;
  }

  function getConf(root) {
    return {
      list: toSel(root.getAttribute("data-rt-list")),
      item: toSel(root.getAttribute("data-rt-item")),
      spacer: toSel(root.getAttribute("data-rt-spacer")),
      btnPrev: toSel(root.getAttribute("data-rt-btn-prev")),
      btnNext: toSel(root.getAttribute("data-rt-btn-next")),
      scrollTrack: toSel(root.getAttribute("data-rt-scroll-track")),
      scrollBar: toSel(root.getAttribute("data-rt-scroll-bar")),
      marginRef: toSel(root.getAttribute("data-rt-margin-ref")),
      overlayStart: toSel(root.getAttribute("data-rt-overlay-start")),
      overlayEnd: toSel(root.getAttribute("data-rt-overlay-end")),
    };
  }

  function Slider(root, id) {
    this.root = root;
    this.id = id;
    this.conf = getConf(root);
    this.valid = !!(this.conf.list && this.conf.item);
    if (!this.valid) return;

    this.sliderId = assignUID(this.root, "data-rt-slider-id");
    this.list = this.root.querySelector(this.conf.list);
    if (!this.list) {
      this.valid = false;
      return;
    }

    this.list.style.overflowX = "auto";
    this.list.style.webkitOverflowScrolling = "touch";
    this.list.style.scrollbarWidth = "none";
    this.list.style.msOverflowStyle = "none";

    this.scroller = findScrollableAncestor(this.list);
    this.scroller.style.scrollbarWidth = "none";
    this.scroller.style.msOverflowStyle = "none";
    try {
      this.scroller.style.webkitOverflowScrolling = "touch";
    } catch (e) {}
    try {
      this.scroller.style.overscrollBehaviorX = "contain";
    } catch (e) {}

    this._basePaddingBottomPx = null;
    this._basePaddingCaptured = false;
    this._touchClampTimer = 0;

    this.btnPrev = this.conf.btnPrev
      ? resolveControl(this.root, this.conf.btnPrev, this.sliderId)
      : null;
    this.btnNext = this.conf.btnNext
      ? resolveControl(this.root, this.conf.btnNext, this.sliderId)
      : null;
    this.overlayStart = this.conf.overlayStart
      ? resolveControl(this.root, this.conf.overlayStart, this.sliderId)
      : null;
    this.overlayEnd = this.conf.overlayEnd
      ? resolveControl(this.root, this.conf.overlayEnd, this.sliderId)
      : null;

    if (this.overlayStart) {
      this.overlayStart.style.transition = "opacity 0.3s ease";
      this.overlayStart.style.willChange = "opacity";
    }
    if (this.overlayEnd) {
      this.overlayEnd.style.transition = "opacity 0.3s ease";
      this.overlayEnd.style.willChange = "opacity";
    }

    this.scrollTrack = this.conf.scrollTrack
      ? this.root.querySelector(this.conf.scrollTrack)
      : null;
    this.scrollBar = this.conf.scrollBar
      ? this.root.querySelector(this.conf.scrollBar)
      : null;
    this.firstItem = this.list.querySelector(this.conf.item + ":first-child");
    this.lastItem = this.list.querySelector(this.conf.item + ":last-child");

    this.dragging = false;
    this.maybeDrag = false;
    this.draggingBar = false;
    this.barPointerId = null;
    this.barOffsetX = 0;
    this.startX = 0;
    this.startScroll = 0;
    this.lastX = 0;
    this.lastT = 0;
    this.velocity = 0;
    this.inertiaId = 0;
    this.ticking = false;
    this.didDrag = false;
    this.didDragTs = 0;
    this.dragMovedPx = 0;
    this.cursorBindings = [];
    this.imgHandlers = [];
    this._roTicking = false;
    this.lenis = null;
    this._lenisWasStopped = false;
    this.mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    this._injectedKey = null;
    this._lastGutterPx = 0;
    this._lastGapPx = 0;

    var self = this;
    this.ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(function () {
            if (self._roTicking) return;
            self._roTicking = true;
            requestAnimationFrame(function () {
              self._roTicking = false;
              self.rafUpdate();
              self.setupCursorMode();
              self.applyIOSScrollIndicatorMask();
              self.applyListStyles();
            });
          })
        : null;
  }

  Slider.prototype.devicePixelEpsilon = function () {
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    return 1 / dpr;
  };

  Slider.prototype.listGap = function () {
    var cs = getComputedStyle(this.list);
    var g1 = parseFloat(cs.columnGap || "0") || 0;
    var g2 = parseFloat(cs.gap || "0") || 0;
    return Math.max(g1, g2);
  };

  Slider.prototype.pickVisibleMarginRef = function () {
    if (!this.conf.marginRef) return null;
    var nodes = this.root.querySelectorAll(this.conf.marginRef);
    if (nodes.length === 0)
      nodes = document.querySelectorAll(this.conf.marginRef);
    for (var i = 0; i < nodes.length; i++) {
      if (isVisibleNode(nodes[i])) return nodes[i];
    }
    return null;
  };

  Slider.prototype.isFlex = function () {
    return getComputedStyle(this.list).display.indexOf("flex") !== -1;
  };

  Slider.prototype.isGrid = function () {
    return getComputedStyle(this.list).display.indexOf("grid") !== -1;
  };

  Slider.prototype.ensureSpacers = function () {
    var kids = Array.from(this.list.children);
    var className = this.conf.spacer
      ? this.conf.spacer.replace(/^[.#]/, "")
      : "awards-slider-spacer";
    var needStart = !(
      kids[0] &&
      kids[0].classList &&
      kids[0].classList.contains(className)
    );
    var needEnd = !(
      kids[kids.length - 1] &&
      kids[kids.length - 1].classList &&
      kids[kids.length - 1].classList.contains(className)
    );

    if (needStart) {
      var el = document.createElement("div");
      el.className = className;
      el.setAttribute("aria-hidden", "true");
      el.style.pointerEvents = "none";
      el.style.height = "1px";
      el.style.minHeight = "1px";
      if (this.isFlex()) el.style.flex = "0 0 auto";
      this.list.insertBefore(el, this.list.firstChild);
    }
    if (needEnd) {
      var el2 = document.createElement("div");
      el2.className = className;
      el2.setAttribute("aria-hidden", "true");
      el2.style.pointerEvents = "none";
      el2.style.height = "1px";
      el2.style.minHeight = "1px";
      if (this.isFlex()) el2.style.flex = "0 0 auto";
      this.list.appendChild(el2);
    }
  };

  Slider.prototype.resetEdgeItemMargins = function () {
    if (this.firstItem) this.firstItem.style.marginLeft = "0px";
    if (this.lastItem) this.lastItem.style.marginRight = "0px";
  };

  Slider.prototype.updateSpacers = function () {
    this.ensureSpacers();
    this.resetEdgeItemMargins();

    var kids = Array.from(this.list.children);
    var cls = this.conf.spacer
      ? this.conf.spacer.replace(/^[.#]/, "")
      : "awards-slider-spacer";
    var spacerStart =
      kids[0] && kids[0].classList.contains(cls) ? kids[0] : null;
    var spacerEnd =
      kids[kids.length - 1] && kids[kids.length - 1].classList.contains(cls)
        ? kids[kids.length - 1]
        : null;
    if (!spacerStart || !spacerEnd) return;

    var marginRef = this.pickVisibleMarginRef();
    var eps = this.devicePixelEpsilon();
    var gap = this.listGap();
    this._lastGapPx = gap;

    spacerStart.style.marginRight = "";
    spacerEnd.style.marginLeft = "";

    if (gap > 0.0001) {
      spacerStart.style.marginRight = "-" + gap + "px";
      spacerEnd.style.marginLeft = "-" + gap + "px";
    }

    if (!marginRef) {
      spacerStart.style.width = eps + "px";
      spacerEnd.style.width = eps + "px";
      this._lastGutterPx = eps;
      return;
    }

    var sRect = this.scroller.getBoundingClientRect();
    var rRect = marginRef.getBoundingClientRect();
    var scrollerCS = getComputedStyle(this.scroller);
    var listCS = getComputedStyle(this.list);
    var scrollerBorderL = parseFloat(scrollerCS.borderLeftWidth || "0") || 0;
    var scrollerPadL = parseFloat(scrollerCS.paddingLeft || "0") || 0;
    var listPadL = parseFloat(listCS.paddingLeft || "0") || 0;
    var scrollerInnerLeft = sRect.left + scrollerBorderL + scrollerPadL;
    var desiredLeft = rRect.left;
    var raw = desiredLeft - scrollerInnerLeft - listPadL;
    var width = raw <= 0 ? eps : Math.round(raw);

    spacerStart.style.width = width + "px";
    spacerEnd.style.width = width + "px";

    if (this.isGrid()) {
      spacerStart.style.justifySelf = "start";
      spacerEnd.style.justifySelf = "start";
      spacerStart.style.gridColumn = "auto";
      spacerEnd.style.gridColumn = "auto";
    }
    this._lastGutterPx = width;
  };

  Slider.prototype.maxScroll = function () {
    return Math.max(0, this.scroller.scrollWidth - this.scroller.clientWidth);
  };

  Slider.prototype.updateOverlays = function () {
    if (!this.overlayStart && !this.overlayEnd) return;
    var total = this.scroller.scrollWidth;
    var visible = this.scroller.clientWidth;
    var scrollable = total > visible + 1;
    function setVis(el, show) {
      if (!el) return;
      el.style.opacity = show ? "1" : "0";
      el.style.pointerEvents = show ? "" : "none";
    }
    if (!scrollable) {
      setVis(this.overlayStart, false);
      setVis(this.overlayEnd, false);
      return;
    }
    var m = this.maxScroll();
    var current = this.scroller.scrollLeft;
    var tolerance = 10;
    var atStart = current <= tolerance;
    var atEnd = current >= m - tolerance;
    setVis(this.overlayStart, !atStart);
    setVis(this.overlayEnd, !atEnd);
  };

  Slider.prototype.updateButtons = function () {
    if (!this.btnPrev && !this.btnNext) return;
    var total = this.scroller.scrollWidth;
    var visible = this.scroller.clientWidth;
    var scrollable = total > visible + 1;

    if (!scrollable) {
      if (this.btnPrev) {
        this.btnPrev.classList.add("inactive");
        this.btnPrev.style.display = "none";
      }
      if (this.btnNext) {
        this.btnNext.classList.add("inactive");
        this.btnNext.style.display = "none";
      }
      return;
    }
    if (this.btnPrev) this.btnPrev.style.display = "";
    if (this.btnNext) this.btnNext.style.display = "";

    var m = this.maxScroll();
    var current = this.scroller.scrollLeft;
    var tolerance = 10;
    var atStart = current <= tolerance;
    var atEnd = current >= m - tolerance;

    if (this.btnPrev) {
      if (atStart) this.btnPrev.classList.add("inactive");
      else this.btnPrev.classList.remove("inactive");
    }
    if (this.btnNext) {
      if (atEnd) this.btnNext.classList.add("inactive");
      else this.btnNext.classList.remove("inactive");
    }
  };

  Slider.prototype.computeScrollbarMetrics = function () {
    if (!this.scrollTrack || !this.scrollBar) return null;
    var total = this.scroller.scrollWidth;
    var visible = this.scroller.clientWidth;
    var items = this.list.querySelectorAll(this.conf.item).length;
    if (total <= visible || items === 0) return null;
    var trackWidth = this.scrollTrack.clientWidth;
    var avgItemWidth = total / Math.max(1, items + 2);
    var visibleItems = Math.max(1, Math.round(visible / avgItemWidth));
    var barWidth = Math.max(8, (visibleItems / (items + 2)) * trackWidth);
    var maxS = Math.max(1, total - visible);
    var maxX = Math.max(0, trackWidth - barWidth);
    var progress = Math.min(1, Math.max(0, this.scroller.scrollLeft / maxS));
    var x = maxX * progress;
    return {
      trackWidth: trackWidth,
      barWidth: barWidth,
      maxS: maxS,
      maxX: maxX,
      x: x,
    };
  };

  Slider.prototype.updateScrollbar = function () {
    if (!this.scrollTrack || !this.scrollBar) return;
    var m = this.computeScrollbarMetrics();
    if (!m) {
      this.scrollTrack.style.display = "none";
      return;
    }
    this.scrollTrack.style.display = "";
    this.scrollBar.style.width = m.barWidth + "px";
    if (!this.draggingBar) {
      this.scrollBar.style.transform = "translateX(" + m.x + "px)";
    }
  };

  Slider.prototype.rafUpdate = function () {
    this.updateSpacers();
    this.updateScrollbar();
    this.updateButtons();
    this.updateOverlays();
  };

  Slider.prototype.safeClampScroll = function (x) {
    var clamped = Math.min(Math.max(x, 0), this.maxScroll());
    return Number.isFinite(clamped) ? clamped : 0;
  };

  Slider.prototype.setScroll = function (x, opts) {
    var target = this.safeClampScroll(x);
    if (this.lenis) {
      var o = opts || {};
      try {
        this.lenis.scrollTo(target, {
          immediate: !!o.immediate,
          lock: !!o.lock,
          force: o.force !== false,
        });
      } catch (e) {
        this.scroller.scrollLeft = target;
      }
    } else {
      this.scroller.scrollLeft = target;
    }
    this.updateScrollbar();
    this.updateButtons();
    this.updateOverlays();
  };

  Slider.prototype.scheduleTouchClamp = function () {
    var self = this;
    if (this._touchClampTimer) clearTimeout(this._touchClampTimer);
    this._touchClampTimer = setTimeout(function () {
      self._touchClampTimer = 0;
      var cur = self.scroller.scrollLeft;
      var max = self.maxScroll();
      var eps = 1;
      if (!Number.isFinite(cur)) {
        self.scroller.scrollLeft = 0;
      } else if (cur < -eps || cur > max + eps) {
        self.scroller.scrollLeft = self.safeClampScroll(cur);
      } else if (cur < 0) {
        self.scroller.scrollLeft = 0;
      } else if (cur > max) {
        self.scroller.scrollLeft = max;
      }
      self.updateScrollbar();
      self.updateButtons();
      self.updateOverlays();
    }, 90);
  };

  Slider.prototype.onScroll = function () {
    var self = this;
    if (!this.mq.matches) {
      this.updateScrollbar();
      this.updateButtons();
      this.updateOverlays();
      this.scheduleTouchClamp();
      return;
    }
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(function () {
      var clamped = self.safeClampScroll(self.scroller.scrollLeft);
      if (clamped !== self.scroller.scrollLeft) {
        if (self.lenis)
          self.setScroll(clamped, {
            immediate: true,
            lock: false,
            force: true,
          });
        else self.scroller.scrollLeft = clamped;
      }
      self.updateScrollbar();
      self.updateButtons();
      self.updateOverlays();
      self.ticking = false;
    });
  };

  Slider.prototype.itemStepWidth = function () {
    if (!this.conf.item)
      return Math.max(1, Math.floor(this.scroller.clientWidth * 0.9));
    var item = this.list.querySelector(this.conf.item);
    if (!item) return Math.max(1, Math.floor(this.scroller.clientWidth * 0.9));
    var cs = getComputedStyle(item);
    var w = item.getBoundingClientRect().width;
    var mr = parseFloat(cs.marginRight) || 0;
    return Math.max(1, Math.round(w + mr));
  };

  Slider.prototype.scrollByItems = function (n) {
    var step = this.itemStepWidth();
    var target =
      n > 0
        ? this.scroller.scrollLeft + step * n
        : this.scroller.scrollLeft - step * Math.abs(n);
    var clamped = this.safeClampScroll(target);
    if (this.lenis) {
      try {
        this.lenis.scrollTo(clamped, {
          duration: 1.2,
          easing: function (t) {
            return Math.min(1, 1.001 - Math.pow(2, -10 * t));
          },
          immediate: false,
          lock: false,
          force: true,
        });
      } catch (e) {
        this.scroller.scrollTo({ left: clamped, behavior: "smooth" });
      }
    } else {
      this.scroller.scrollTo({ left: clamped, behavior: "smooth" });
    }
  };

  Slider.prototype.onPrevClick = function (e) {
    e.preventDefault();
    this.scrollByItems(-1);
  };

  Slider.prototype.onNextClick = function (e) {
    e.preventDefault();
    this.scrollByItems(1);
  };

  Slider.prototype.stopInertia = function () {
    if (this.inertiaId) {
      cancelAnimationFrame(this.inertiaId);
      this.inertiaId = 0;
    }
  };

  Slider.prototype.startDrag = function (e) {
    if (this.dragging) return;
    this.dragging = true;
    this.didDrag = true;
    this.didDragTs = performance.now();
    this.dragMovedPx = Math.max(
      this.dragMovedPx,
      Math.abs(e.clientX - this.startX),
    );

    if (this.lenis) {
      try {
        this.lenis.stop();
        this._lenisWasStopped = true;
      } catch (err) {
        this._lenisWasStopped = false;
      }
    }
    try {
      this.scroller.setPointerCapture(e.pointerId);
    } catch (err) {}
    this.scroller.classList.add("is-dragging");
    this.scroller.style.userSelect = "none";
    this.stopInertia();
    this.lastX = e.clientX;
    this.lastT = performance.now();
    this.velocity = 0;
  };

  Slider.prototype.endDrag = function (e) {
    if (!this.dragging) return;
    this.dragging = false;
    this.scroller.classList.remove("is-dragging");
    this.scroller.style.userSelect = "";
    if (e && e.pointerId != null) {
      try {
        this.scroller.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
    var minVel = 0.2;
    if (this.lenis) {
      if (this._lenisWasStopped) {
        try {
          this.lenis.start();
        } catch (err) {}
      }
      this._lenisWasStopped = false;
      if (Math.abs(this.velocity) >= minVel) {
        var throwDist = this.velocity * 24;
        var target = this.safeClampScroll(this.scroller.scrollLeft + throwDist);
        var speed = Math.min(2.0, Math.max(0.35, Math.abs(this.velocity) / 18));
        var duration = Math.min(1.35, Math.max(0.35, 0.85 / speed));
        try {
          this.lenis.scrollTo(target, {
            duration: duration,
            easing: function (t) {
              return Math.min(1, 1.001 - Math.pow(2, -10 * t));
            },
            immediate: false,
            lock: false,
            force: true,
          });
        } catch (err) {
          this.scroller.scrollTo({ left: target, behavior: "smooth" });
        }
      }
      return;
    }
    var decay = 0.92;
    var self = this;
    var step = function () {
      var next = self.safeClampScroll(self.scroller.scrollLeft + self.velocity);
      self.scroller.scrollLeft = next;
      self.velocity *= decay;
      var atEdge = next <= 0 || next >= self.maxScroll();
      if (Math.abs(self.velocity) < minVel || atEdge) {
        self.inertiaId = 0;
        return;
      }
      self.inertiaId = requestAnimationFrame(step);
    };
    if (Math.abs(this.velocity) >= minVel) {
      this.inertiaId = requestAnimationFrame(step);
    }
  };

  Slider.prototype.onPointerDown = function (e) {
    var total = this.scroller.scrollWidth;
    var visible = this.scroller.clientWidth;
    if (total <= visible + 1) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.maybeDrag = true;
    this.dragging = false;
    this.didDrag = false;
    this.didDragTs = 0;
    this.dragMovedPx = 0;
    this.startX = e.clientX;
    this.startScroll = this.scroller.scrollLeft;
    this.lastX = e.clientX;
    this.lastT = performance.now();
    this.velocity = 0;
  };

  Slider.prototype.onPointerMove = function (e) {
    if (!this.maybeDrag && !this.dragging) return;
    var dxFromStart = e.clientX - this.startX;
    this.dragMovedPx = Math.max(this.dragMovedPx, Math.abs(dxFromStart));
    if (!this.dragging) {
      if (Math.abs(dxFromStart) >= 6) this.startDrag(e);
      else return;
    }
    var now = performance.now();
    var dx = e.clientX - this.lastX;
    var dt = Math.max(1, now - this.lastT);
    var target = this.startScroll - (e.clientX - this.startX);
    this.setScroll(target, { immediate: true, lock: true, force: true });
    this.velocity = -(dx / dt) * 16;
    this.lastX = e.clientX;
    this.lastT = now;
  };

  Slider.prototype.onPointerUp = function (e) {
    var self = this;
    if (this.dragging) this.endDrag(e);
    this.maybeDrag = false;
    if (this.dragMovedPx < 6) {
      this.didDrag = false;
      this.didDragTs = 0;
    } else {
      this.didDrag = true;
      this.didDragTs = performance.now();
    }
    setTimeout(function () {
      self.didDrag = false;
      self.didDragTs = 0;
      self.dragMovedPx = 0;
    }, 420);
  };

  Slider.prototype.onPointerCancel = function () {
    var self = this;
    if (this.dragging) {
      this.dragging = false;
      this.scroller.classList.remove("is-dragging");
      this.scroller.style.userSelect = "";
      this.stopInertia();
      if (this.lenis && this._lenisWasStopped) {
        try {
          this.lenis.start();
        } catch (e) {}
      }
      this._lenisWasStopped = false;
    }
    this.maybeDrag = false;
    setTimeout(function () {
      self.didDrag = false;
      self.didDragTs = 0;
      self.dragMovedPx = 0;
    }, 0);
  };

  Slider.prototype.trackMetrics = function () {
    if (!this.scrollTrack || !this.scrollBar) {
      return {
        trackWidth: 0,
        barWidth: 0,
        maxX: 0,
        m: Math.max(1, this.maxScroll()),
      };
    }
    var trackWidth = this.scrollTrack.clientWidth;
    var m = Math.max(1, this.maxScroll());
    var barWidth = 0;
    var computed = this.computeScrollbarMetrics();
    if (computed) barWidth = computed.barWidth;
    else barWidth = this.scrollBar.getBoundingClientRect().width || 0;
    var maxX = Math.max(0, trackWidth - barWidth);
    return { trackWidth: trackWidth, barWidth: barWidth, maxX: maxX, m: m };
  };

  Slider.prototype.setScrollFromTrackX = function (x, opts) {
    var met = this.trackMetrics();
    var nx = Math.min(Math.max(x, 0), met.maxX);
    if (this.scrollBar)
      this.scrollBar.style.transform = "translateX(" + nx + "px)";
    var progress = met.maxX === 0 ? 0 : nx / met.maxX;
    var target = progress * met.m;
    this.setScroll(
      target,
      opts || { immediate: true, lock: true, force: true },
    );
  };

  Slider.prototype.startBarDrag = function (e) {
    if (!this.scrollTrack || !this.scrollBar) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (this.lenis) {
      try {
        this.lenis.stop();
        this._lenisWasStopped = true;
      } catch (err) {
        this._lenisWasStopped = false;
      }
    }
    this.draggingBar = true;
    this.barPointerId = e.pointerId != null ? e.pointerId : null;
    var barRect = this.scrollBar.getBoundingClientRect();
    this.barOffsetX = e.clientX - barRect.left;
    this.scrollBar.style.cursor = "grabbing";
    this.scrollTrack.style.cursor = "grabbing";
    try {
      this.scrollTrack.setPointerCapture(e.pointerId);
    } catch (err) {}
    var trackRect = this.scrollTrack.getBoundingClientRect();
    var x = e.clientX - trackRect.left - this.barOffsetX;
    this.setScrollFromTrackX(x, { immediate: true, lock: true, force: true });
  };

  Slider.prototype.onTrackPointerDown = function (e) {
    if (!this.scrollTrack || !this.scrollBar) return;
    this.updateScrollbar();
    this.startBarDrag(e);
  };

  Slider.prototype.onTrackPointerMove = function (e) {
    if (!this.draggingBar || !this.scrollTrack) return;
    if (
      this.barPointerId != null &&
      e.pointerId != null &&
      e.pointerId !== this.barPointerId
    )
      return;
    e.preventDefault();
    var trackRect = this.scrollTrack.getBoundingClientRect();
    var x = e.clientX - trackRect.left - this.barOffsetX;
    this.setScrollFromTrackX(x, { immediate: true, lock: true, force: true });
  };

  Slider.prototype.endBarDrag = function (e) {
    if (!this.draggingBar) return;
    this.draggingBar = false;
    if (this.scrollBar) this.scrollBar.style.cursor = "grab";
    if (this.scrollTrack) this.scrollTrack.style.cursor = "pointer";
    if (this.scrollTrack && e && e.pointerId != null) {
      try {
        this.scrollTrack.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
    if (this.lenis && this._lenisWasStopped) {
      try {
        this.lenis.start();
      } catch (err) {}
    }
    this._lenisWasStopped = false;
    this.updateScrollbar();
    this.updateButtons();
    this.updateOverlays();
    this.barPointerId = null;
  };

  Slider.prototype.detectLinksInItems = function () {
    if (!this.conf.item) return false;
    return !!this.list.querySelector(this.conf.item + " a[href]");
  };

  Slider.prototype.clearCursorBindings = function () {
    for (var i = 0; i < this.cursorBindings.length; i++) {
      var b = this.cursorBindings[i];
      b.el.removeEventListener(b.type, b.fn);
    }
    this.cursorBindings = [];
  };

  Slider.prototype.setupCursorMode = function () {
    this.clearCursorBindings();
    var total = this.scroller.scrollWidth;
    var visible = this.scroller.clientWidth;
    var scrollable = total > visible + 1;
    if (!scrollable) {
      this.scroller.style.cursor = "";
      return;
    }
    if (!this.mq.matches) {
      this.scroller.style.cursor = "";
      return;
    }
    this.hasLinks = this.detectLinksInItems();
    if (this.hasLinks) {
      this.scroller.style.cursor = "";
      return;
    }
    var self = this;
    var onEnter = function () {
      if (!self.scroller.classList.contains("is-dragging")) {
        self.scroller.style.cursor = "grab";
      }
    };
    var onLeave = function () {
      self.scroller.style.cursor = "";
    };
    this.scroller.addEventListener("mouseenter", onEnter);
    this.scroller.addEventListener("mouseleave", onLeave);
    this.cursorBindings.push({
      el: this.scroller,
      type: "mouseenter",
      fn: onEnter,
    });
    this.cursorBindings.push({
      el: this.scroller,
      type: "mouseleave",
      fn: onLeave,
    });
  };

  Slider.prototype.captureBasePaddingBottomOnce = function () {
    if (this._basePaddingCaptured) return;
    var cs = getComputedStyle(this.scroller);
    var pb = parseFloat(cs.paddingBottom || "0") || 0;
    this._basePaddingBottomPx = pb;
    this._basePaddingCaptured = true;
  };

  Slider.prototype.applyIOSScrollIndicatorMask = function () {
    if (!this._basePaddingCaptured) this.captureBasePaddingBottomOnce();
    if (this.mq.matches) {
      this.scroller.style.removeProperty("--rt-slider-mask-bg");
      this.scroller.style.removeProperty("--rt-slider-mask-h");
      this.scroller.style.removeProperty("--rt-slider-base-pb");
      return;
    }
    var bg = findNearestOpaqueBgColor(this.scroller);
    this.scroller.style.setProperty("--rt-slider-mask-bg", bg);
    this.scroller.style.setProperty("--rt-slider-mask-h", "12px");
    this.scroller.style.setProperty(
      "--rt-slider-base-pb",
      (this._basePaddingBottomPx || 0) + "px",
    );
  };

  Slider.prototype.applyListStyles = function () {
    var listUID = assignUID(this.list, "data-rt-ss-id");
    var scrollerUID = assignUID(this.scroller, "data-rt-ss-scroller-id");
    var isDesktop = this.mq.matches;
    var scrollbarStyles = "";
    if (this.scrollTrack && this.scrollBar) {
      var trackUID = assignUID(this.scrollTrack, "data-rt-track-id");
      var barUID = assignUID(this.scrollBar, "data-rt-bar-id");
      if (isDesktop) {
        scrollbarStyles =
          '[data-rt-track-id="' +
          trackUID +
          '"]{position:relative; touch-action:none; overflow: visible !important;}' +
          '[data-rt-track-id="' +
          trackUID +
          '"]::before{content:"";position:absolute;top:-30px;bottom:-30px;left:0;right:0;z-index:0; cursor:pointer; pointer-events:auto;}' +
          '[data-rt-bar-id="' +
          barUID +
          '"]{position:relative; z-index:2; touch-action:none;}' +
          '[data-rt-bar-id="' +
          barUID +
          '"]::after{content:"";position:absolute;top:-30px;bottom:-30px;left:0;right:0;z-index:3; cursor:grab; pointer-events:auto;}';
      } else {
        scrollbarStyles =
          '[data-rt-track-id="' +
          trackUID +
          '"]{position:relative; touch-action:auto; overflow: visible !important; pointer-events:none !important; user-select:none !important;}' +
          '[data-rt-track-id="' +
          trackUID +
          '"]::before{content:"";position:absolute;top:-30px;bottom:-30px;left:0;right:0;z-index:0; pointer-events:none !important;}' +
          '[data-rt-bar-id="' +
          barUID +
          '"]{position:relative; z-index:2; touch-action:auto; pointer-events:none !important; user-select:none !important;}' +
          '[data-rt-bar-id="' +
          barUID +
          '"]::after{content:"";position:absolute;top:-30px;bottom:-30px;left:0;right:0;z-index:3; pointer-events:none !important;}';
      }
    }
    var hideNativeScrollbarCSS =
      '[data-rt-ss-id="' +
      listUID +
      '"]::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important;background:transparent !important;}' +
      '[data-rt-ss-id="' +
      listUID +
      '"]::-webkit-scrollbar-thumb{background:transparent !important;}' +
      '[data-rt-ss-id="' +
      listUID +
      '"]::-webkit-scrollbar-track{background:transparent !important;}' +
      '[data-rt-ss-id="' +
      listUID +
      '"]{scrollbar-width:none !important;-ms-overflow-style:none !important;}' +
      '[data-rt-ss-scroller-id="' +
      scrollerUID +
      '"]::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important;background:transparent !important;}' +
      '[data-rt-ss-scroller-id="' +
      scrollerUID +
      '"]::-webkit-scrollbar-thumb{background:transparent !important;}' +
      '[data-rt-ss-scroller-id="' +
      scrollerUID +
      '"]::-webkit-scrollbar-track{background:transparent !important;}' +
      '[data-rt-ss-scroller-id="' +
      scrollerUID +
      '"]{scrollbar-width:none !important;-ms-overflow-style:none !important;}';

    var iosMaskCSS = isDesktop
      ? ""
      : '[data-rt-ss-scroller-id="' +
        scrollerUID +
        '"]{position:relative;padding-bottom:calc(var(--rt-slider-base-pb, 0px) + var(--rt-slider-mask-h, 12px));}' +
        '[data-rt-ss-scroller-id="' +
        scrollerUID +
        '"]::after{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--rt-slider-mask-h, 12px);pointer-events:none;z-index:2147483647;background:var(--rt-slider-mask-bg, transparent);}';

    var draggingCSS =
      '[data-rt-ss-scroller-id="' +
      scrollerUID +
      '"].is-dragging{cursor:grabbing !important;user-select:none}' +
      '[data-rt-ss-id="' +
      listUID +
      '"].is-dragging{cursor:grabbing !important;user-select:none}' +
      '[data-rt-ss-scroller-id="' +
      scrollerUID +
      '"].is-dragging img,[data-rt-ss-scroller-id="' +
      scrollerUID +
      '"].is-dragging a,[data-rt-ss-scroller-id="' +
      scrollerUID +
      '"].is-dragging ' +
      this.conf.item +
      "{user-select:none;-webkit-user-drag:none}" +
      '[data-rt-ss-id="' +
      listUID +
      '"] img{-webkit-user-drag:none}';

    this._injectedKey = "rt-ss-" + listUID;
    injectOnce(
      this._injectedKey,
      hideNativeScrollbarCSS + draggingCSS + scrollbarStyles + iosMaskCSS,
    );
  };

  Slider.prototype.onResize = function () {
    this.stopInertia();
    this.rafUpdate();
    this.setupCursorMode();
    this.applyIOSScrollIndicatorMask();
    this.applyListStyles();
  };

  Slider.prototype.onClickCapture = function (e) {
    if (!this.didDragTs) return;
    if (performance.now() - this.didDragTs > 420) return;
    var a =
      e.target && e.target.closest
        ? e.target.closest(
            "a,button,[role='button'],input,textarea,select,label",
          )
        : null;
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
  };

  Slider.prototype.getLenisOptions = function () {
    var prefix = "data-rt-slider-";
    var el = this.root;
    function getAttr(name) {
      return el.getAttribute(prefix + name);
    }

    var options = {
      wrapper: this.scroller,
      content: this.list,
      orientation: "horizontal",
      gestureOrientation: "horizontal",
      smoothWheel: true,
      syncTouch: false,
    };

    var lerp = parseNum(getAttr("lerp"), undefined);
    var duration = parseNum(getAttr("duration"), undefined);
    var easing = parseStr(getAttr("easing"), "");
    var easingFn = parseEasing(easing);

    if (lerp !== undefined) options.lerp = lerp;
    else if (duration !== undefined) options.duration = duration;
    if (easingFn) options.easing = easingFn;

    var orientation = parseStr(getAttr("orientation"), "");
    if (orientation) options.orientation = orientation;
    var gestureOrientation = parseStr(getAttr("gesture-orientation"), "");
    if (gestureOrientation) options.gestureOrientation = gestureOrientation;

    var smoothWheel = getAttr("smooth-wheel");
    if (smoothWheel !== null)
      options.smoothWheel = parseBool(smoothWheel, true);

    var wheelMultiplier = parseNum(getAttr("wheel-multiplier"), undefined);
    if (wheelMultiplier !== undefined)
      options.wheelMultiplier = wheelMultiplier;
    var touchMultiplier = parseNum(getAttr("touch-multiplier"), undefined);
    if (touchMultiplier !== undefined)
      options.touchMultiplier = touchMultiplier;

    var infinite = parseBool(getAttr("infinite"), false);
    if (infinite) options.infinite = true;
    var autoResize = parseBool(getAttr("auto-resize"), true);
    if (autoResize === false) options.autoResize = false;

    var jsonStr = getAttr("options-json");
    if (jsonStr) {
      try {
        var jsonOpts = JSON.parse(jsonStr);
        if (jsonOpts && typeof jsonOpts === "object") {
          for (var key in jsonOpts) options[key] = jsonOpts[key];
        }
      } catch (e) {}
    }
    return options;
  };

  Slider.prototype.setupLenisInstance = function () {
    if (!this.mq.matches) return;
    if (this.lenis) return;
    var options = this.getLenisOptions();
    try {
      this.lenis = new window.Lenis(options);
      LenisHub.add(this.lenis);
    } catch (e) {
      this.lenis = null;
    }
  };

  Slider.prototype.bindEvents = function () {
    this._onScroll = this.onScroll.bind(this);
    this.scroller.addEventListener("scroll", this._onScroll, { passive: true });

    this._onResize = this.onResize.bind(this);
    window.addEventListener("resize", this._onResize);

    if (this.mq.matches) {
      this._onPD = this.onPointerDown.bind(this);
      this.scroller.addEventListener("pointerdown", this._onPD);
      this._onPM = this.onPointerMove.bind(this);
      this.scroller.addEventListener("pointermove", this._onPM);
      this._onPU = this.onPointerUp.bind(this);
      this.scroller.addEventListener("pointerup", this._onPU);
      this._onPC = this.onPointerCancel.bind(this);
      this.scroller.addEventListener("pointercancel", this._onPC);
      this._onPL = this.onPointerCancel.bind(this);
      this.scroller.addEventListener("pointerleave", this._onPL);
      this._onClickCap = this.onClickCapture.bind(this);
      this.scroller.addEventListener("click", this._onClickCap, true);
    }

    if (this.btnPrev) {
      this._onPrev = this.onPrevClick.bind(this);
      this.btnPrev.addEventListener("click", this._onPrev);
    }
    if (this.btnNext) {
      this._onNext = this.onNextClick.bind(this);
      this.btnNext.addEventListener("click", this._onNext);
    }

    if (this.mq.matches) {
      if (this.scrollBar) {
        this.scrollBar.style.touchAction = "none";
        this.scrollBar.style.cursor = "grab";
      }
      if (this.scrollTrack) {
        this.scrollTrack.style.userSelect = "none";
        this.scrollTrack.style.cursor = "pointer";
        this.scrollTrack.style.touchAction = "none";
        this._onTPD = this.onTrackPointerDown.bind(this);
        this.scrollTrack.addEventListener("pointerdown", this._onTPD);
        this._onTPM = this.onTrackPointerMove.bind(this);
        this.scrollTrack.addEventListener("pointermove", this._onTPM);
        this._onTPU = this.onTrackPointerUp.bind(this);
        this.scrollTrack.addEventListener("pointerup", this._onTPU);
        this._onTPC = this.onTrackPointerCancel.bind(this);
        this.scrollTrack.addEventListener("pointercancel", this._onTPC);
        this._onTPL = this.onTrackPointerCancel.bind(this);
        this.scrollTrack.addEventListener("pointerleave", this._onTPL);
      }
    } else {
      if (this.scrollBar) {
        this.scrollBar.style.touchAction = "";
        this.scrollBar.style.cursor = "";
      }
      if (this.scrollTrack) {
        this.scrollTrack.style.userSelect = "";
        this.scrollTrack.style.cursor = "";
        this.scrollTrack.style.touchAction = "";
      }
    }

    var self = this;
    this._onMQ = function () {
      self.applyIOSScrollIndicatorMask();
      self.applyListStyles();
      self.setupCursorMode();
      self.rafUpdate();
    };
    if (this.mq.addEventListener)
      this.mq.addEventListener("change", this._onMQ);
    else if (this.mq.addListener) this.mq.addListener(this._onMQ);

    var imgs = Array.from(this.list.querySelectorAll("img"));
    imgs.forEach(function (img) {
      if (img.complete) return;
      var update = function () {
        self.rafUpdate();
        self.setupCursorMode();
        self.applyIOSScrollIndicatorMask();
        self.applyListStyles();
      };
      img.addEventListener("load", update, { once: true });
      img.addEventListener("error", update, { once: true });
      self.imgHandlers.push({ img: img, onL: update, onE: update });
    });

    if (this.ro) {
      this.ro.observe(this.list);
      this.ro.observe(this.scroller);
      if (this.scrollTrack) this.ro.observe(this.scrollTrack);
    }

    this._onPH = this.destroy.bind(this);
    window.addEventListener("pagehide", this._onPH);
    this._onBU = this.destroy.bind(this);
    window.addEventListener("beforeunload", this._onBU);
  };

  Slider.prototype.init = function () {
    this.captureBasePaddingBottomOnce();
    this.applyIOSScrollIndicatorMask();
    this.applyListStyles();

    var self = this;
    if (this.mq.matches) {
      loadLenis()
        .then(function () {
          self.setupLenisInstance();
        })
        .catch(function (e) {});
    }

    this.rafUpdate();
    this._onWL = function () {
      self.rafUpdate();
      self.applyIOSScrollIndicatorMask();
      self.applyListStyles();
    };
    window.addEventListener("load", this._onWL);
    this.setupCursorMode();
    this.bindEvents();
  };

  Slider.prototype.destroy = function () {
    this.stopInertia();
    if (this._touchClampTimer) clearTimeout(this._touchClampTimer);

    if (this.lenis) {
      try {
        LenisHub.remove(this.lenis);
      } catch (e) {}
      try {
        this.lenis.destroy();
      } catch (e) {}
      this.lenis = null;
    }

    if (this._onScroll)
      this.scroller.removeEventListener("scroll", this._onScroll);
    if (this._onResize) window.removeEventListener("resize", this._onResize);

    if (this._onPD)
      this.scroller.removeEventListener("pointerdown", this._onPD);
    if (this._onPM)
      this.scroller.removeEventListener("pointermove", this._onPM);
    if (this._onPU) this.scroller.removeEventListener("pointerup", this._onPU);
    if (this._onPC)
      this.scroller.removeEventListener("pointercancel", this._onPC);
    if (this._onPL)
      this.scroller.removeEventListener("pointerleave", this._onPL);
    if (this._onClickCap)
      this.scroller.removeEventListener("click", this._onClickCap, true);

    if (this._onPrev && this.btnPrev)
      this.btnPrev.removeEventListener("click", this._onPrev);
    if (this._onNext && this.btnNext)
      this.btnNext.removeEventListener("click", this._onNext);

    if (this.scrollTrack) {
      if (this._onTPD)
        this.scrollTrack.removeEventListener("pointerdown", this._onTPD);
      if (this._onTPM)
        this.scrollTrack.removeEventListener("pointermove", this._onTPM);
      if (this._onTPU)
        this.scrollTrack.removeEventListener("pointerup", this._onTPU);
      if (this._onTPC)
        this.scrollTrack.removeEventListener("pointercancel", this._onTPC);
      if (this._onTPL)
        this.scrollTrack.removeEventListener("pointerleave", this._onTPL);
    }

    if (this.mq.removeEventListener)
      this.mq.removeEventListener("change", this._onMQ);
    else if (this.mq.removeListener) this.mq.removeListener(this._onMQ);

    if (this._onWL) window.removeEventListener("load", this._onWL);
    if (this._onPH) window.removeEventListener("pagehide", this._onPH);
    if (this._onBU) window.removeEventListener("beforeunload", this._onBU);

    this.imgHandlers.forEach(function (h) {
      h.img.removeEventListener("load", h.onL);
      h.img.removeEventListener("error", h.onE);
    });
    this.imgHandlers = [];

    this.clearCursorBindings();

    this.scroller.style.cursor = "";
    this.scroller.style.removeProperty("--rt-slider-mask-bg");
    this.scroller.style.removeProperty("--rt-slider-mask-h");
    this.scroller.style.removeProperty("--rt-slider-base-pb");

    if (this.ro) this.ro.disconnect();
    if (this._injectedKey) {
      removeInjected(this._injectedKey);
      this._injectedKey = null;
    }
  };

  var state = {
    instances: {},
    order: [],
  };

  function init() {
    var roots = document.querySelectorAll("[data-rt-slider]");
    var autoCount = 0;
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      var id = root.getAttribute("data-rt-slider-id");
      if (!id) {
        autoCount++;
        id = "slider-" + autoCount;
        root.setAttribute("data-rt-slider-id", id);
      }
      if (state.instances[id]) continue;

      var inst = new Slider(root, id);
      if (inst.valid) {
        state.instances[id] = inst;
        state.order.push(id);
        inst.init();
      }
    }
  }

  function makeApi() {
    return {
      __initialized: true,
      ids: function () {
        return state.order.slice();
      },
      get: function (id) {
        return state.instances[id] || null;
      },
      refresh: function () {
        var keys = state.order;
        for (var i = 0; i < keys.length; i++) {
          var inst = state.instances[keys[i]];
          if (inst) inst.onResize();
        }
      },
      destroy: function (id) {
        if (typeof id === "string") {
          var inst = state.instances[id];
          if (inst) {
            inst.destroy();
            delete state.instances[id];
            var idx = state.order.indexOf(id);
            if (idx > -1) state.order.splice(idx, 1);
          }
          return;
        }
        for (var i = 0; i < state.order.length; i++) {
          var k = state.order[i];
          if (state.instances[k]) state.instances[k].destroy();
        }
        state.instances = {};
        state.order = [];
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window[RT_NS] = makeApi();
})();
