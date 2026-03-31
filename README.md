# rt-slider

![Platform: Web](https://img.shields.io/badge/platform-web-000000)
![JavaScript](https://img.shields.io/badge/language-JavaScript-F7DF1E?logo=javascript)
[![npm version](https://img.shields.io/npm/v/%40rethink-js%2Frt-slider.svg)](https://www.npmjs.com/package/@rethink-js/rt-slider)
[![jsDelivr hits](https://data.jsdelivr.com/v1/package/npm/@rethink-js/rt-slider/badge)](https://www.jsdelivr.com/package/npm/@rethink-js/rt-slider)
[![License: MIT](https://img.shields.io/badge/License-MIT-FFD632.svg)](https://opensource.org/licenses/MIT)

`rt-slider` is a lightweight JavaScript utility that creates touch-friendly sliders with smooth inertia scrolling and physics with:

- **Automatic dependency loading** (loads Lenis automatically)
- **Zero-config defaults** (works out of the box with basic selectors)
- Attribute-driven configuration
- Support for **multiple instances**
- A clean global API under `window.rtSlider`
- Defensive fallbacks to native scrolling on mobile
- Built-in **slide state tracking**, DOM attributes, and custom events for advanced UI sync

**Primary dependency (GitHub):** <https://github.com/darkroomengineering/lenis>

---

# Table of Contents

- [1. Installation](#1-installation)
  - [1.1 CDN (jsDelivr)](#11-cdn-jsdelivr)
  - [1.2 npm](#12-npm)
- [2. Quick Start](#2-quick-start)
- [3. Activation Rules](#3-activation-rules)
- [4. Configuration (HTML Attributes)](#4-configuration-html-attributes)
- [5. Multiple Instances](#5-multiple-instances)
- [6. Global API](#6-global-api)
- [7. Console Logging](#7-console-logging)
- [8. Troubleshooting](#8-troubleshooting)
- [9. License](#9-license)

---

## 1. Installation

### 1.1 CDN (jsDelivr)

```html
<script src="https://cdn.jsdelivr.net/npm/@rethink-js/rt-slider@latest/dist/index.min.js"></script>
```

### 1.2 npm

```bash
npm install @rethink-js/rt-slider
```

Then bundle or load `dist/index.min.js` as appropriate for your build setup.

---

## 2. Quick Start

Add the script to your page. To create a slider, add the `data-rt-slider` attribute to a container and specify the child selectors.

`rt-slider` will:

- Auto-initialize on DOM ready
- Load Lenis dynamically for desktop inertia
- Apply native touch scrolling styles for mobile
- Compute active slide state and progress automatically
- Expose slider state through attributes, events, and the global API

Example:

```html
<div data-rt-slider data-rt-list=".cms-list" data-rt-item=".cms-item">
  <div class="cms-list">
    <div class="cms-item">Slide 1</div>
    <div class="cms-item">Slide 2</div>
    <div class="cms-item">Slide 3</div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@rethink-js/rt-slider@latest/dist/index.min.js"></script>
```

> Note: If you do not provide `data-rt-list` and `data-rt-item`, the slider will not initialize.

---

## 3. Activation Rules

The library activates when **all** of the following are true:

- An element with the attribute `data-rt-slider` is found in the DOM.
- The required `data-rt-list` and `data-rt-item` selectors are present on that container.
- The `data-rt-list` selector resolves to a valid element within that container.

If these conditions are met, the library initializes the instance automatically.

---

## 4. Configuration (HTML Attributes)

### Basic Setup

```html
<div data-rt-slider data-rt-list=".list-class" data-rt-item=".item-class">
  ...
</div>
```

### UI Controls (Optional)

```html
<div
  data-rt-slider
  data-rt-btn-prev=".prev-button"
  data-rt-btn-next=".next-button"
  data-rt-scroll-bar=".custom-scrollbar"
  data-rt-scroll-track=".custom-track"
>
  ...
</div>
```

### Core Attributes (Selectors)

| Attribute               | Description                                                | Required |
| ----------------------- | ---------------------------------------------------------- | -------- |
| `data-rt-slider`        | Activates the slider instance                              | **Yes**  |
| `data-rt-slider-id`     | Optional identifier (auto-generated if missing)            | No       |
| `data-rt-list`          | Selector for the scrollable wrapper                        | **Yes**  |
| `data-rt-item`          | Selector for individual slides                             | **Yes**  |
| `data-rt-spacer`        | Selector/Class for edge spacers (padding)                  | No       |
| `data-rt-btn-prev`      | Selector for "Previous" button                             | No       |
| `data-rt-btn-next`      | Selector for "Next" button                                 | No       |
| `data-rt-scroll-track`  | Selector for custom scrollbar track                        | No       |
| `data-rt-scroll-bar`    | Selector for custom scrollbar thumb                        | No       |
| `data-rt-margin-ref`    | Selector used to align slide anchors to a layout reference | No       |
| `data-rt-overlay-start` | Selector for the leading edge overlay                      | No       |
| `data-rt-overlay-end`   | Selector for the trailing edge overlay                     | No       |

---

### Physics & Behavior Configuration

These attributes control the Lenis instance used on desktop.

```html
<div
  data-rt-slider
  data-rt-slider-lerp="0.1"
  data-rt-slider-infinite="false"
></div>
```

| Attribute                            | Description                            | Default       |
| ------------------------------------ | -------------------------------------- | ------------- |
| `data-rt-slider-lerp`                | Inertia interpolation (lower = slower) | Lenis default |
| `data-rt-slider-duration`            | Scroll duration (alt to lerp)          | Lenis default |
| `data-rt-slider-easing`              | Easing function (e.g., `easeOutExpo`)  | Lenis default |
| `data-rt-slider-orientation`         | Scroll orientation                     | `horizontal`  |
| `data-rt-slider-gesture-orientation` | Gesture orientation                    | `horizontal`  |
| `data-rt-slider-smooth-wheel`        | Enable mouse wheel smoothing           | `true`        |
| `data-rt-slider-wheel-multiplier`    | Multiplier for wheel-based scrolling   | Lenis default |
| `data-rt-slider-touch-multiplier`    | Multiplier for touch-based scrolling   | Lenis default |
| `data-rt-slider-infinite`            | Infinite scrolling                     | `false`       |
| `data-rt-slider-auto-resize`         | Recalculate on window resize           | `true`        |

---

### Advanced JSON Options

```html
<div
  data-rt-slider
  data-rt-slider-options-json='{"lerp":0.05, "wheelMultiplier": 2}'
></div>
```

Used to pass complex configuration objects directly to the underlying Lenis instance.

---

### Slide State Output

As the slider moves, `rt-slider` writes state back to the DOM automatically.

#### Root attributes

| Attribute                                 | Description                                |
| ----------------------------------------- | ------------------------------------------ |
| `data-rt-slider-active-index`             | Current nearest active slide index         |
| `data-rt-slider-from-index`               | Current segment start slide index          |
| `data-rt-slider-to-index`                 | Current segment end slide index            |
| `data-rt-slider-segment-progress`         | Current segment progress from `0` to `1`   |
| `data-rt-slider-segment-progress-percent` | Current segment progress from `0` to `100` |
| `data-rt-slider-scroll-progress`          | Overall slider progress from `0` to `1`    |
| `data-rt-slider-scroll-progress-percent`  | Overall slider progress from `0` to `100`  |
| `data-rt-slider-scroll-direction`         | `forward`, `backward`, or `none`           |

#### Per-item attributes

| Attribute                                     | Description                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `data-rt-slider-item-index`                   | Slide index                                                                |
| `data-rt-slider-item-active`                  | `true` when this item is the active slide                                  |
| `data-rt-slider-item-from`                    | `true` when this item is the current segment start                         |
| `data-rt-slider-item-to`                      | `true` when this item is the current segment end                           |
| `data-rt-slider-item-previous`                | `true` when this item is immediately before the active slide               |
| `data-rt-slider-item-next`                    | `true` when this item is immediately after the active slide                |
| `data-rt-slider-item-before-active`           | `true` when this item is before the active slide                           |
| `data-rt-slider-item-after-active`            | `true` when this item is after the active slide                            |
| `data-rt-slider-item-anchor-progress`         | This slide's anchor position from `0` to `1`                               |
| `data-rt-slider-item-anchor-progress-percent` | This slide's anchor position from `0` to `100`                             |
| `data-rt-slider-item-distance`                | Distance in pixels from the current scroll position to this slide's anchor |

These attributes are useful for CSS-driven animations, slide-aware UI, progress indicators, and syncing other interface elements to the slider.

---

### Custom Events

Each slider instance dispatches events from the root element.

| Event             | Description                                 |
| ----------------- | ------------------------------------------- |
| `rtSlider:slide`  | Fires when the computed slide state changes |
| `rtSlider:active` | Fires when the active slide index changes   |

Example:

```js
const slider = document.querySelector("[data-rt-slider]");

slider.addEventListener("rtSlider:slide", function (event) {
  console.log(event.detail);
});

slider.addEventListener("rtSlider:active", function (event) {
  console.log("Active slide:", event.detail.active.index);
});
```

Both events include a full cloned slide-state object in `event.detail`.

---

### Dependency Loader Overrides

The library automatically loads Lenis from a CDN if not present. You can rely on the default or load your own version before `rt-slider`.

| Attribute                     | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `data-rt-slider-lenis="true"` | Add this to a script tag to identify external Lenis |

---

## 5. Multiple Instances

`rt-slider` supports multiple independent instances on the same page.

Each instance:

- Has its own independent scroll physics
- Calculates its own progress bars and button states
- Tracks its own active slide and segment state
- Dispatches its own custom events
- Is registered internally with a unique ID

---

## 6. Global API

Once initialized:

```js
window.rtSlider;
```

### Common Methods

| Method              | Description                                         |
| ------------------- | --------------------------------------------------- |
| `ids()`             | Returns an array of active slider IDs               |
| `get(id)`           | Returns the slider instance object                  |
| `getSlideState(id)` | Returns a cloned slide-state object for an instance |
| `refresh()`         | Forces a recalculation of layout (all instances)    |
| `destroy(id?)`      | Destroys specific instance or all if no ID given    |

Example usage:

```js
// Refresh layout after an AJAX load
window.rtSlider.refresh();

// Get computed slide state
const ids = window.rtSlider.ids();
const firstSliderState = window.rtSlider.getSlideState(ids[0]);

// Destroy a specific slider
window.rtSlider.destroy("my-slider-id");
```

### Instance Helpers

When using `window.rtSlider.get(id)`, each instance also exposes helper methods:

| Method               | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `getSlideState()`    | Returns a cloned slide-state object for that instance |
| `getActiveIndex()`   | Returns the current active slide index                |
| `getActiveElement()` | Returns the current active slide element              |

---

## 7. Console Logging

`rt-slider` operates silently by default.

It does not rely on console output during normal use. If initialization fails, the most common causes are invalid selectors, missing required attributes, or invalid external configuration.

---

## 8. Troubleshooting

### Slider not initializing

- Ensure `data-rt-slider` is present on the parent.
- **Crucial:** Ensure `data-rt-list` and `data-rt-item` attributes match valid elements inside the container.
- Ensure the `data-rt-list` selector resolves successfully inside the slider root.

### Buttons not working

- Ensure the selectors in `data-rt-btn-prev` and `data-rt-btn-next` match your button elements.
- If buttons are outside the slider container, give them the attribute `data-rt-slider-for="slider-id"`.

### Scrollbar not moving

- Ensure `data-rt-scroll-track` and `data-rt-scroll-bar` are set correctly.
- The "bar" should be inside the "track" for the cleanest result, though the logic handles positioning independently.

### Slide state attributes not updating

- Ensure the slider is actually scrollable. If content does not overflow horizontally, active state will still resolve, but progress and movement-driven changes will be limited.
- Ensure `data-rt-item` matches the actual slide elements and not a wrapper around them.

### Custom events not firing as expected

- `rtSlider:slide` fires when computed slide state changes.
- `rtSlider:active` fires when the active slide changes.
- Both events are dispatched from the element with `data-rt-slider`, not from the list or item elements.

---

## 9. License

MIT License

Package: `@rethink-js/rt-slider` <br>
GitHub: [https://github.com/Rethink-JS/rt-slider](https://github.com/Rethink-JS/rt-slider)

---

by **Rethink JS** <br>
[https://github.com/Rethink-JS](https://github.com/Rethink-JS)
