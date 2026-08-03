(function () {
  'use strict';

  if (window.__virtual_ringlight_injected__) return;
  window.__virtual_ringlight_injected__ = true;

  const HOST_ID = '__vrl_ringlight_host__';

  let shadowRoot = null;
  let frameElement = null;
  let widgetElement = null;
  let currentState = { ...DEFAULT_SETTINGS };
  let isFullscreenActive = false;

  function hexToRgb(hex) {
    let normalized = hex.replace(/^#/, '');
    if (normalized.length === 3) {
      normalized = normalized.split('').map((c) => c + c).join('');
    }
    const num = parseInt(normalized, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function getStyles() {
    return `
      :host {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .vrl-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none !important;
        box-sizing: border-box;
        transition: opacity 0.2s ease-out, box-shadow 0.2s ease-out, border 0.2s ease-out;
        opacity: 0;
        visibility: hidden;
      }
      .vrl-overlay.vrl-active {
        opacity: var(--vrl-opacity, 0.9);
        visibility: visible;
      }

      /* Shape: Perimeter Frame */
      .vrl-overlay[data-shape="frame"] {
        border-style: solid;
        border-color: var(--vrl-color, #ffffff);
        border-width: var(--vrl-thickness, 100px);
        box-shadow:
          inset 0 0 calc(var(--vrl-thickness, 100px) * 0.9) var(--vrl-rgba),
          0 0 calc(var(--vrl-thickness, 100px) * 0.6) var(--vrl-rgba);
      }

      /* Shape: Top Bar */
      .vrl-overlay[data-shape="top-strip"] {
        border: none;
        height: calc(var(--vrl-thickness, 100px) * 2.8);
        background: linear-gradient(180deg, var(--vrl-color, #ffffff) 0%, var(--vrl-rgba-transparent) 100%);
        box-shadow: 0 0 calc(var(--vrl-thickness, 100px) * 1.5) var(--vrl-rgba);
      }

      /* Shape: Side Bars */
      .vrl-overlay[data-shape="side-strips"] {
        border-top: none;
        border-bottom: none;
        border-left: var(--vrl-thickness, 100px) solid var(--vrl-color, #ffffff);
        border-right: var(--vrl-thickness, 100px) solid var(--vrl-color, #ffffff);
        box-shadow:
          inset calc(var(--vrl-thickness, 100px) * 0.6) 0 calc(var(--vrl-thickness, 100px) * 0.9) var(--vrl-rgba),
          inset calc(var(--vrl-thickness, 100px) * -0.6) 0 calc(var(--vrl-thickness, 100px) * 0.9) var(--vrl-rgba);
      }

      /* Shape: Full Diffusion Vignette Box (Maximum Lumens) */
      .vrl-overlay[data-shape="diffusion"] {
        border: none;
        background: radial-gradient(
          circle at center,
          rgba(0, 0, 0, 0) 35%,
          var(--vrl-rgba) 85%,
          var(--vrl-color, #ffffff) 100%
        );
        box-shadow: inset 0 0 calc(var(--vrl-thickness, 100px) * 1.2) var(--vrl-rgba);
      }

      .vrl-widget {
        position: absolute;
        top: 14px;
        right: 14px;
        pointer-events: auto !important;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(18, 20, 26, 0.85);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 30px;
        padding: 6px 12px;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
        opacity: 0.3;
      }
      .vrl-widget:hover {
        opacity: 1.0;
        transform: scale(1.05);
        background: rgba(18, 20, 26, 0.95);
      }
      .vrl-widget-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--vrl-color, #ffffff);
        box-shadow: 0 0 6px var(--vrl-color, #ffffff);
      }
    `;
  }

  function initOverlay() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      document.documentElement.appendChild(host);
    }

    shadowRoot = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = getStyles();
    shadowRoot.appendChild(styleEl);

    frameElement = document.createElement('div');
    frameElement.className = 'vrl-overlay';
    shadowRoot.appendChild(frameElement);

    widgetElement = document.createElement('div');
    widgetElement.className = 'vrl-widget';
    widgetElement.title = 'Virtual Ring Light Quick Switch (Click to cycle colors)';

    const dotEl = document.createElement('span');
    dotEl.className = 'vrl-widget-dot';

    const labelEl = document.createElement('span');
    labelEl.textContent = 'Light Controls';

    widgetElement.append(dotEl, labelEl);

    widgetElement.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleColorPreset();
    });

    shadowRoot.appendChild(widgetElement);

    document.addEventListener('fullscreenchange', () => {
      isFullscreenActive = !!document.fullscreenElement;
      updateOverlay(currentState);
    });
  }

  async function cycleColorPreset() {
    const currentIndex = COLOR_PRESETS.findIndex((p) => p.preset === currentState.preset);
    const nextPreset = COLOR_PRESETS[(currentIndex + 1) % COLOR_PRESETS.length];

    currentState.preset = nextPreset.preset;
    currentState.color = nextPreset.color;

    try {
      await chrome.storage.local.set({ preset: currentState.preset, color: currentState.color });
    } catch (error) {
      console.warn('Virtual Ring Light: failed to persist color preset', error);
    }
    updateOverlay(currentState);
  }

  function updateOverlay(settings) {
    currentState = { ...currentState, ...settings };
    if (!frameElement) return;

    const { enabled, shape } = currentState;

    if (!enabled || isFullscreenActive) {
      frameElement.classList.remove('vrl-active');
      if (widgetElement) widgetElement.style.display = 'none';
      return;
    }

    if (widgetElement) widgetElement.style.display = 'flex';

    const brightness = clampNumber(
      currentState.brightness,
      SETTINGS_BOUNDS.brightness.min,
      SETTINGS_BOUNDS.brightness.max,
      DEFAULT_SETTINGS.brightness
    );
    const thickness = clampNumber(
      currentState.thickness,
      SETTINGS_BOUNDS.thickness.min,
      SETTINGS_BOUNDS.thickness.max,
      DEFAULT_SETTINGS.thickness
    );
    const color = isValidHexColor(currentState.color) ? currentState.color : DEFAULT_SETTINGS.color;

    const opacityVal = brightness / 100;
    const rgb = hexToRgb(color);
    const rgbaStr = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacityVal})`;
    const rgbaTrans = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`;

    frameElement.style.setProperty('--vrl-color', color);
    frameElement.style.setProperty('--vrl-opacity', opacityVal.toString());
    frameElement.style.setProperty('--vrl-thickness', `${thickness}px`);
    frameElement.style.setProperty('--vrl-rgba', rgbaStr);
    frameElement.style.setProperty('--vrl-rgba-transparent', rgbaTrans);

    frameElement.setAttribute('data-shape', shape || 'frame');
    frameElement.classList.add('vrl-active');
  }

  async function loadAndApplyState() {
    try {
      const state = await chrome.storage.local.get(DEFAULT_SETTINGS);
      updateOverlay(state);
    } catch (error) {
      console.warn('Virtual Ring Light: failed to load state', error);
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      loadAndApplyState();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initOverlay();
      loadAndApplyState();
    });
  } else {
    initOverlay();
    loadAndApplyState();
  }
})();
