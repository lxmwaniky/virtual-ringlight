document.addEventListener('DOMContentLoaded', async () => {
  const powerToggle = document.getElementById('power-toggle');
  const logoRing = document.getElementById('logo-ring');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const customColorPicker = document.getElementById('custom-color-picker');
  const colorPickerWrapper = customColorPicker.closest('.color-picker-wrapper');
  const shapeBtns = document.querySelectorAll('.shape-btn');
  const brightnessSlider = document.getElementById('brightness-slider');
  const brightnessVal = document.getElementById('brightness-val');
  const thicknessSlider = document.getElementById('thickness-slider');
  const thicknessVal = document.getElementById('thickness-val');
  const autoTriggerToggle = document.getElementById('auto-trigger-toggle');

  const DEFAULT_SETTINGS = {
    enabled: false,
    color: '#ffffff',
    brightness: 90,
    thickness: 100,
    preset: 'daylight',
    shape: 'frame',
    autoTrigger: false
  };

  let currentState = { ...DEFAULT_SETTINGS };
  let debounceTimer = null;

  async function loadState() {
    try {
      const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
      currentState = { ...DEFAULT_SETTINGS, ...data };
      renderUI(currentState);
    } catch (e) {
    }
  }

  function renderUI(state) {
    powerToggle.checked = state.enabled;
    logoRing.classList.toggle('active', state.enabled);
    if (autoTriggerToggle) autoTriggerToggle.checked = !!state.autoTrigger;

    presetBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === state.preset);
    });

    colorPickerWrapper.classList.toggle('active', state.preset === 'custom');
    customColorPicker.value = state.color || '#ffffff';

    shapeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === state.shape);
    });

    brightnessSlider.value = state.brightness;
    brightnessVal.textContent = `${state.brightness}%`;

    thicknessSlider.value = state.thickness;
    thicknessVal.textContent = `${state.thickness}px`;
  }

  async function persistAndNotifyState() {
    try {
      await chrome.storage.local.set(currentState);

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'VIRTUAL_RINGLIGHT_STATE_CHANGE',
              payload: currentState
            });
          } catch (err) {
          }
        }
      }
    } catch (e) {
    }
  }

  function debouncedPersist() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      persistAndNotifyState();
    }, 40);
  }

  powerToggle.addEventListener('change', (e) => {
    currentState.enabled = e.target.checked;
    renderUI(currentState);
    persistAndNotifyState();
  });

  if (autoTriggerToggle) {
    autoTriggerToggle.addEventListener('change', (e) => {
      currentState.autoTrigger = e.target.checked;
      persistAndNotifyState();
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentState.preset = btn.dataset.preset;
      currentState.color = btn.dataset.color;
      renderUI(currentState);
      persistAndNotifyState();
    });
  });

  customColorPicker.addEventListener('input', (e) => {
    currentState.preset = 'custom';
    currentState.color = e.target.value;
    renderUI(currentState);
    debouncedPersist();
  });

  shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentState.shape = btn.dataset.shape;
      renderUI(currentState);
      persistAndNotifyState();
    });
  });

  brightnessSlider.addEventListener('input', (e) => {
    currentState.brightness = parseInt(e.target.value, 10);
    brightnessVal.textContent = `${currentState.brightness}%`;
    debouncedPersist();
  });

  thicknessSlider.addEventListener('input', (e) => {
    currentState.thickness = parseInt(e.target.value, 10);
    thicknessVal.textContent = `${currentState.thickness}px`;
    debouncedPersist();
  });

  loadState();
});
