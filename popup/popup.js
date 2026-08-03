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

  let currentState = { ...DEFAULT_SETTINGS };
  let debounceTimer = null;

  async function loadState() {
    try {
      const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
      currentState = { ...DEFAULT_SETTINGS, ...data };
      renderUI(currentState);
    } catch (error) {
      console.warn('Virtual Ring Light: failed to load state', error);
    }
  }

  function renderUI(state) {
    powerToggle.checked = state.enabled;
    logoRing.classList.toggle('active', state.enabled);
    if (autoTriggerToggle) autoTriggerToggle.checked = !!state.autoTrigger;

    presetBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === state.preset);
    });

    colorPickerWrapper.classList.toggle('active', state.preset === 'custom');
    customColorPicker.value = isValidHexColor(state.color) ? state.color : DEFAULT_SETTINGS.color;

    shapeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.shape === state.shape);
    });

    brightnessSlider.value = state.brightness;
    brightnessVal.textContent = `${state.brightness}%`;

    thicknessSlider.value = state.thickness;
    thicknessVal.textContent = `${state.thickness}px`;
  }

  async function persistState() {
    try {
      await chrome.storage.local.set(currentState);
    } catch (error) {
      console.warn('Virtual Ring Light: failed to persist state', error);
    }
  }

  function debouncedPersist() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(persistState, 40);
  }

  powerToggle.addEventListener('change', (e) => {
    currentState.enabled = e.target.checked;
    renderUI(currentState);
    persistState();
  });

  if (autoTriggerToggle) {
    autoTriggerToggle.addEventListener('change', (e) => {
      currentState.autoTrigger = e.target.checked;
      persistState();
    });
  }

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentState.preset = btn.dataset.preset;
      currentState.color = btn.dataset.color;
      renderUI(currentState);
      persistState();
    });
  });

  customColorPicker.addEventListener('input', (e) => {
    currentState.preset = 'custom';
    currentState.color = e.target.value;
    renderUI(currentState);
    debouncedPersist();
  });

  shapeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentState.shape = btn.dataset.shape;
      renderUI(currentState);
      persistState();
    });
  });

  brightnessSlider.addEventListener('input', (e) => {
    currentState.brightness = clampNumber(
      e.target.value,
      SETTINGS_BOUNDS.brightness.min,
      SETTINGS_BOUNDS.brightness.max,
      DEFAULT_SETTINGS.brightness
    );
    brightnessVal.textContent = `${currentState.brightness}%`;
    debouncedPersist();
  });

  thicknessSlider.addEventListener('input', (e) => {
    currentState.thickness = clampNumber(
      e.target.value,
      SETTINGS_BOUNDS.thickness.min,
      SETTINGS_BOUNDS.thickness.max,
      DEFAULT_SETTINGS.thickness
    );
    thicknessVal.textContent = `${currentState.thickness}px`;
    debouncedPersist();
  });

  loadState();
});
