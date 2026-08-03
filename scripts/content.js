(function () {
  'use strict';

  if (window.__virtual_ringlight_injected__) return;
  window.__virtual_ringlight_injected__ = true;

  const HOST_ID = '__vrl_ringlight_host__';

  const DEFAULT_SETTINGS = {
    enabled: false,
    color: '#ffffff',
    brightness: 90,
    thickness: 100,
    preset: 'daylight',
    shape: 'frame',
    showWidget: true
  };

  let shadowRoot = null;
  let frameElement = null;
  let widgetElement = null;
  let currentState = { ...DEFAULT_SETTINGS };

  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
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
      .vrl-overlay[data-shape="frame"] {
        border-style: solid;
        border-color: var(--vrl-color, #ffffff);
        border-width: var(--vrl-thickness, 100px);
        box-shadow: 
          inset 0 0 calc(var(--vrl-thickness, 100px) * 0.9) var(--vrl-rgba),
          0 0 calc(var(--vrl-thickness, 100px) * 0.6) var(--vrl-rgba);
      }
      .vrl-overlay[data-shape="top-strip"] {
        border: none;
        height: calc(var(--vrl-thickness, 100px) * 2.8);
        background: linear-gradient(180deg, var(--vrl-color, #ffffff) 0%, var(--vrl-rgba-transparent) 100%);
        box-shadow: 0 0 calc(var(--vrl-thickness, 100px) * 1.5) var(--vrl-rgba);
      }
      .vrl-overlay[data-shape="side-strips"] {
        border-top: none;
        border-bottom: none;
        border-left: var(--vrl-thickness, 100px) solid var(--vrl-color, #ffffff);
        border-right: var(--vrl-thickness, 100px) solid var(--vrl-color, #ffffff);
        box-shadow: 
          inset calc(var(--vrl-thickness, 100px) * 0.6) 0 calc(var(--vrl-thickness, 100px) * 0.9) var(--vrl-rgba),
          inset calc(var(--vrl-thickness, 100px) * -0.6) 0 calc(var(--vrl-thickness, 100px) * 0.9) var(--vrl-rgba);
      }

      /* Floating Quick Settings Trigger Badge */
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
    widgetElement.innerHTML = `
      <span class="vrl-widget-dot"></span>
      <span>Light Controls</span>
    `;

    widgetElement.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleColorPreset();
    });

    shadowRoot.appendChild(widgetElement);
  }

  async function cycleColorPreset() {
    const presets = [
      { preset: 'warm', color: '#fff1d6' },
      { preset: 'daylight', color: '#ffffff' },
      { preset: 'cool', color: '#e2f1ff' }
    ];

    const currentIndex = presets.findIndex(p => p.preset === currentState.preset);
    const nextIndex = (currentIndex + 1) % presets.length;
    const nextPreset = presets[nextIndex];

    currentState.preset = nextPreset.preset;
    currentState.color = nextPreset.color;

    await chrome.storage.local.set({ preset: currentState.preset, color: currentState.color });
    updateOverlay(currentState);
  }

  function updateOverlay(settings) {
    currentState = { ...currentState, ...settings };
    if (!frameElement) return;

    const { enabled, color, brightness, thickness, shape } = currentState;

    if (!enabled) {
      frameElement.classList.remove('vrl-active');
      if (widgetElement) widgetElement.style.display = 'none';
      return;
    }

    if (widgetElement) widgetElement.style.display = 'flex';

    const opacityVal = Math.min(Math.max(brightness / 100, 0.05), 1.0);
    const rgb = hexToRgb(color || '#ffffff');
    const rgbaStr = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacityVal})`;
    const rgbaTrans = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`;

    frameElement.style.setProperty('--vrl-color', color);
    frameElement.style.setProperty('--vrl-opacity', opacityVal.toString());
    frameElement.style.setProperty('--vrl-thickness', `${thickness || 100}px`);
    frameElement.style.setProperty('--vrl-rgba', rgbaStr);
    frameElement.style.setProperty('--vrl-rgba-transparent', rgbaTrans);

    frameElement.setAttribute('data-shape', shape || 'frame');
    frameElement.classList.add('vrl-active');
  }

  async function loadAndApplyState() {
    try {
      const state = await chrome.storage.local.get(DEFAULT_SETTINGS);
      updateOverlay(state);
    } catch (e) {
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'VIRTUAL_RINGLIGHT_STATE_CHANGE') {
      updateOverlay(message.payload);
    }
  });

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
