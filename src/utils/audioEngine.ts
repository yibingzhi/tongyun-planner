export class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch((e) => console.warn("Failed to resume AudioContext", e));
    }
    return this.ctx;
  }

  public startNoise(type: string, volume: number): void {
    this.stopNoise();
    try {
      const ctx = this.init();
      const sampleRate = ctx.sampleRate;
      const bufferSize = 2 * sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      this.gain = ctx.createGain();
      this.gain.gain.setValueAtTime(volume, ctx.currentTime);
      this.gain.connect(ctx.destination);

      this.source = ctx.createBufferSource();
      this.source.loop = true;

      if (type === "brown") {
        // Brownian Noise - 低沉低音
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
        this.source.buffer = buffer;
        this.source.connect(this.gain);
      } else if (type === "pink") {
        // Pink Noise - 近似风吹树叶的白噪音
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11;
          b6 = white * 0.115926;
        }
        this.source.buffer = buffer;
        this.source.connect(this.gain);
      } else if (type === "ocean") {
        // Ocean Waves - 利用 LFO 调制褐噪声频与增益
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
        this.source.buffer = buffer;

        const waveGain = ctx.createGain();
        waveGain.gain.setValueAtTime(0.35, ctx.currentTime);

        this.lfo = ctx.createOscillator();
        this.lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // ~12秒一次呼吸涨退

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.32, ctx.currentTime);

        this.lfo.connect(lfoGain);
        lfoGain.connect(waveGain.gain);
        this.lfo.start();

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(350, ctx.currentTime);

        this.source.connect(filter);
        filter.connect(waveGain);
        waveGain.connect(this.gain);
      } else if (type === "rain") {
        // Rainfall - 高通及带通滤波粉噪，形成天然雨滴淅淅沥沥声
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11;
          b6 = white * 0.115926;
        }
        this.source.buffer = buffer;

        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = "highpass";
        hpFilter.frequency.setValueAtTime(900, ctx.currentTime);

        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = "bandpass";
        bpFilter.frequency.setValueAtTime(1400, ctx.currentTime);
        bpFilter.Q.setValueAtTime(0.7, ctx.currentTime);

        this.source.connect(hpFilter);
        hpFilter.connect(bpFilter);
        bpFilter.connect(this.gain);
      }
      this.source.start();
    } catch (e) {
      console.error("启动白噪音发生器失败:", e);
    }
  }

  public setVolume(volume: number): void {
    if (this.gain && this.ctx) {
      this.gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  public stopNoise(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        // Ignored
      }
      this.source.disconnect();
      this.source = null;
    }
    if (this.lfo) {
      try {
        this.lfo.stop();
      } catch (e) {
        // Ignored
      }
      this.lfo.disconnect();
      this.lfo = null;
    }
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
  }

  public playCompletionSound(soundType: string): void {
    try {
      const ctx = this.init();
      const now = ctx.currentTime;

      if (soundType === "cuckoo") {
        // 布谷鸟叫
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(784.00, now);
        gain1.gain.setValueAtTime(0.1, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(622.25, now + 0.18);
        gain2.gain.setValueAtTime(0.12, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.5);
      } else if (soundType === "meow") {
        // 猫咪喵喵叫
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";

        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.4);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
        filter.frequency.exponentialRampToValueAtTime(900, now + 0.4);
        filter.Q.setValueAtTime(1.5, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.42);
      } else {
        // 默认电子提示音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.45);
      }
    } catch (e) {
      console.warn("无法播放提示音:", e);
    }
  }

  public close(): void {
    this.stopNoise();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const audioEngine = new AudioEngine();
