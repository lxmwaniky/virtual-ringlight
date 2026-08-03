'use strict';

const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  color: '#ffffff',
  brightness: 90,
  thickness: 100,
  preset: 'daylight',
  shape: 'frame',
  autoTrigger: false
});

const COLOR_PRESETS = Object.freeze([
  Object.freeze({ preset: 'warm', color: '#fff1d6' }),
  Object.freeze({ preset: 'daylight', color: '#ffffff' }),
  Object.freeze({ preset: 'cool', color: '#e2f1ff' })
]);

const WEBINAR_DOMAINS = Object.freeze([
  'meet.google.com',
  'teams.microsoft.com',
  'teams.live.com',
  'zoom.us'
]);

const SETTINGS_BOUNDS = Object.freeze({
  brightness: { min: 10, max: 100 },
  thickness: { min: 20, max: 250 }
});

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

function isValidHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}
