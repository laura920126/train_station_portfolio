export function createAudio() {
  let ctx = null;
  let master = null;
  let on = false;

  function ensure() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.4;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    source.connect(filter);
    filter.connect(master);
    source.start();

    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 120;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.09;
    hum.connect(humGain);
    humGain.connect(master);
    hum.start();
  }

  function tone(freq, duration, level) {
    if (!on || !ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  return {
    get on() {
      return on;
    },
    async toggle() {
      ensure();
      if (ctx.state === "suspended") await ctx.resume();
      on = !on;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(on ? 0.045 : 0, now + 0.18);
      return on;
    },
    hover(index) {
      tone(520 + index * 70, 0.07, 0.025);
    },
    enter() {
      tone(196, 0.22, 0.04);
      tone(392, 0.28, 0.02);
    },
    exit() {
      tone(164, 0.16, 0.03);
    },
  };
}
