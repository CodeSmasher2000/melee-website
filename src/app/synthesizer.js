import * as Tone from "tone";

let audioStarted = false;

export async function ensureAudioStarted() {
  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }
}

export async function createSynthesizer() {
  // Create a reverb effect and wait for it to be ready before connecting
  const reverb = new Tone.Reverb({ decay: 2.5 });
  await reverb.ready;
  reverb.toDestination();

  // Create a polyphonic synthesizer connected through reverb
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "square" },
    envelope: {
      attack: 0.005,
      decay: 0.4,
      sustain: 0,
      release: 0.3,
    },
  });

  synth.connect(reverb);

  const notes = [
    "C4",
    "D4",
    "E4",
    "F4",
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F5",
    "G5",
    "A5",
    "B5",
    "C6",
  ];

  const keyboardMap = {
    a: notes[0],
    s: notes[1],
    d: notes[2],
    f: notes[3],
    g: notes[4],
    h: notes[5],
    j: notes[6],
    k: notes[7],
    l: notes[8],
    ";": notes[9],
    "'": notes[10],
    z: notes[11],
    x: notes[12],
    c: notes[13],
    v: notes[14],
  };

  const activeNotes = new Set();

  function playNote(note) {
    if (!activeNotes.has(note)) {
      activeNotes.add(note);
      synth.triggerAttack(note);
    }
  }

  function stopNote(note) {
    activeNotes.delete(note);
    if (activeNotes.size === 0) {
      synth.triggerRelease();
    } else {
      synth.triggerRelease(note);
    }
  }

  function startAllNotes(notesToPlay) {
    notesToPlay.forEach((note) => activeNotes.add(note));
    synth.triggerAttack(notesToPlay);
  }

  function stopAllNotes() {
    activeNotes.clear();
    synth.triggerRelease();
  }

  // Keyboard event listeners
  document.addEventListener("keydown", async (e) => {
    const key = e.key.toLowerCase();
    if (keyboardMap[key] && !e.repeat) {
      await ensureAudioStarted();
      playNote(keyboardMap[key]);
    }
  });

  document.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (keyboardMap[key]) {
      stopNote(keyboardMap[key]);
    }
  });

  return {
    playNote,
    stopNote,
    startAllNotes,
    stopAllNotes,
    synth,
    notes,
    keyboardMap,
  };
}
