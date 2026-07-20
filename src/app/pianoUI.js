import { ensureAudioStarted } from "./synthesizer.js";

// White key width in px — must match CSS .piano-key.white width
const WHITE_W = 36;

// Each white key: [note, keyboard shortcut label]
const WHITE_KEYS = [
  ["C4", "A"],
  ["D4", "S"],
  ["E4", "D"],
  ["F4", "F"],
  ["G4", "G"],
  ["A4", "H"],
  ["B4", "J"],
  ["C5", "K"],
  ["D5", "L"],
  ["E5", ";"],
  ["F5", "'"],
];

// Each black key: [note, left offset from piano start in px]
// Centered between adjacent white keys: (whiteIndex * WHITE_W) + WHITE_W - (BLACK_W/2)
// BLACK_W = 22, so offset = whiteIndex*36 + 36 - 11 = whiteIndex*36 + 25
const BLACK_KEYS = [
  ["C#4", 1 * WHITE_W - 11], // between C4(0) and D4(1)
  ["D#4", 2 * WHITE_W - 11], // between D4(1) and E4(2)
  ["F#4", 4 * WHITE_W - 11], // between F4(3) and G4(4)
  ["G#4", 5 * WHITE_W - 11], // between G4(4) and A4(5)
  ["A#4", 6 * WHITE_W - 11], // between A4(5) and B4(6)
  ["C#5", 8 * WHITE_W - 11], // between C5(7) and D5(8)
  ["D#5", 9 * WHITE_W - 11], // between D5(8) and E5(9)
];

export function createPianoUI(synth) {
  const container = document.createElement("div");
  container.id = "piano-container";

  const whiteKeysHTML = WHITE_KEYS.map(
    ([note, label]) =>
      `<div class="piano-key white" data-note="${note}">
        <span class="key-shortcut">${label}</span>
        <span class="key-note">${note}</span>
      </div>`,
  ).join("");

  const blackKeysHTML = BLACK_KEYS.map(
    ([note, left]) =>
      `<div class="piano-key black" data-note="${note}" style="left:${left}px"></div>`,
  ).join("");

  container.innerHTML = `
    <div class="piano-panel">
      <h3>Piano Synthesizer</h3>
      <p class="piano-info">Use keyboard (A–;, ') or click keys</p>
      <div class="piano-keys">
        ${whiteKeysHTML}
        ${blackKeysHTML}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Get all piano keys
  const pianoKeys = container.querySelectorAll(".piano-key");
  const activeKeys = new Set();

  pianoKeys.forEach((key) => {
    key.addEventListener("mousedown", async (e) => {
      const note = key.dataset.note;
      if (!activeKeys.has(note)) {
        activeKeys.add(note);
        await ensureAudioStarted();
        synth.playNote(note);
        key.classList.add("active");
      }
    });

    key.addEventListener("mouseup", () => {
      const note = key.dataset.note;
      activeKeys.delete(note);
      synth.stopNote(note);
      key.classList.remove("active");
    });

    key.addEventListener("mouseleave", () => {
      const note = key.dataset.note;
      activeKeys.delete(note);
      synth.stopNote(note);
      key.classList.remove("active");
    });
  });

  return container;
}
