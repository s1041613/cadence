export interface FocusAudio {
  start(): void
  mix(rising: boolean, breath: number): void
  enterCalm(): void
  toggleMute(): boolean
  pause(): void
  resume(): void
  fadeOut(): void
  stop(): void
}

export function makeFocusAudio(): FocusAudio {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let muted = false
  let on = false
  let nodes: Array<{ stop?: () => void; disconnect?: () => void }> = []
  let birdTimer: ReturnType<typeof setInterval> | null = null
  let birdGain: GainNode | null = null
  let birdLP: BiquadFilterNode | null = null
  let waveGain: GainNode | null = null
  let waveFilter: BiquadFilterNode | null = null
  let wind: GainNode | null = null
  let rising = true

  const ensure = () => {
    if (ctx) return
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new C()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
  }

  const noiseBuf = (): AudioBuffer => {
    const len = ctx!.sampleRate * 2
    const b = ctx!.createBuffer(1, len, ctx!.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return b
  }

  const chirp = () => {
    if (!ctx || muted) return
    const t = ctx.currentTime + Math.random() * 0.16
    const base = 1400 + Math.random() * 900
    const o = ctx.createOscillator()
    o.type = 'sine'
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    o.frequency.setValueAtTime(base, t)
    o.frequency.linearRampToValueAtTime(base * 1.14, t + 0.08)
    o.frequency.linearRampToValueAtTime(base * 0.94, t + 0.16)
    o.frequency.linearRampToValueAtTime(base * 1.04, t + 0.23)
    g.gain.linearRampToValueAtTime(0.08, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34)
    o.connect(g)
    g.connect(birdGain!)
    o.start(t)
    o.stop(t + 0.38)
  }

  const cricket = () => {
    if (!ctx || muted) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = 2900
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    for (let i = 0; i < 5; i++) {
      g.gain.linearRampToValueAtTime(0.01, t + i * 0.038 + 0.01)
      g.gain.linearRampToValueAtTime(0, t + i * 0.038 + 0.026)
    }
    o.connect(g)
    g.connect(birdGain!)
    o.start(t)
    o.stop(t + 0.24)
  }

  return {
    start() {
      ensure()
      if (ctx!.state === 'suspended') void ctx!.resume()
      if (on) return
      on = true

      const vn = ctx!.createBufferSource()
      vn.buffer = noiseBuf()
      vn.loop = true
      const vf = ctx!.createBiquadFilter()
      vf.type = 'lowpass'
      vf.frequency.value = 380
      vf.Q.value = 0.4
      waveFilter = vf
      waveGain = ctx!.createGain()
      waveGain.gain.value = 0.05
      vn.connect(vf)
      vf.connect(waveGain)
      waveGain.connect(master!)
      vn.start()
      nodes.push(vn, vf, waveGain)

      const wnn = ctx!.createBufferSource()
      wnn.buffer = noiseBuf()
      wnn.loop = true
      const wf1 = ctx!.createBiquadFilter()
      wf1.type = 'bandpass'
      wf1.frequency.value = 440
      wf1.Q.value = 0.5
      const wf2 = ctx!.createBiquadFilter()
      wf2.type = 'lowpass'
      wf2.frequency.value = 900
      wind = ctx!.createGain()
      wind.gain.value = 0.09
      wnn.connect(wf1)
      wf1.connect(wf2)
      wf2.connect(wind)
      wind.connect(master!)
      wnn.start()
      nodes.push(wnn, wf1, wf2, wind)

      const wlfo = ctx!.createOscillator()
      wlfo.frequency.value = 0.09
      const wlg = ctx!.createGain()
      wlg.gain.value = 0.04
      wlfo.connect(wlg)
      wlg.connect(wind.gain)
      wlfo.start()
      nodes.push(wlfo, wlg)

      birdLP = ctx!.createBiquadFilter()
      birdLP.type = 'lowpass'
      birdLP.frequency.value = 2400
      birdLP.Q.value = 0.4
      birdGain = ctx!.createGain()
      birdGain.gain.value = 0
      birdGain.connect(birdLP)
      birdLP.connect(master!)
      nodes.push(birdGain, birdLP)

      master!.gain.linearRampToValueAtTime(muted ? 0 : 0.85, ctx!.currentTime + 1.2)
      birdTimer = setInterval(() => {
        if (!rising) return
        if (Math.random() < 0.6) chirp()
        if (Math.random() < 0.2) cricket()
      }, 560)
    },

    mix(r: boolean, breath: number) {
      const flip = r !== rising
      rising = r
      if (!ctx || !on) return
      const now = ctx.currentTime
      const birdVol = r ? 0.3 + 0.45 * breath : 0.0
      const waveVol = r ? 0.03 : 0.55 + 0.45 * (1 - breath)
      const tc = flip ? 0.05 : 0.18
      birdGain!.gain.setTargetAtTime(muted ? 0 : birdVol, now, tc)
      wind!.gain.setTargetAtTime(muted ? 0 : r ? 0.13 : 0.08, now, 0.4)
      waveGain!.gain.setTargetAtTime(muted ? 0 : 0.32 * waveVol, now, tc)
      if (waveFilter) {
        const f = r ? 480 : 420 + 260 * (1 - breath)
        waveFilter.frequency.setTargetAtTime(f, now, flip ? 0.08 : 0.25)
      }
    },

    enterCalm() {
      if (!ctx) return
      const now = ctx.currentTime
      if (birdTimer) {
        clearInterval(birdTimer)
        birdTimer = null
      }
      if (birdGain) birdGain.gain.setTargetAtTime(0, now, 1.2)
      if (waveGain) waveGain.gain.setTargetAtTime(0, now, 1.2)
      if (wind) wind.gain.setTargetAtTime(0.03, now, 1.5)
    },

    toggleMute() {
      muted = !muted
      if (ctx) master!.gain.linearRampToValueAtTime(muted ? 0 : 0.85, ctx.currentTime + 0.4)
      return muted
    },

    pause() {
      if (ctx && ctx.state === 'running') void ctx.suspend()
    },

    resume() {
      if (ctx && ctx.state === 'suspended') void ctx.resume()
    },

    fadeOut() {
      if (!ctx) return
      const now = ctx.currentTime
      if (birdTimer) {
        clearInterval(birdTimer)
        birdTimer = null
      }
      if (birdGain) birdGain.gain.setTargetAtTime(0, now, 1.0)
      if (waveGain) waveGain.gain.setTargetAtTime(0, now, 1.0)
      if (wind) wind.gain.setTargetAtTime(0, now, 1.2)
      master!.gain.setTargetAtTime(0, now, 1.2)
    },

    stop() {
      if (!ctx) return
      if (birdTimer) clearInterval(birdTimer)
      master!.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
      const n = nodes
      setTimeout(() => {
        n.forEach((x) => {
          try {
            x.stop?.()
          } catch {
            // already stopped
          }
          try {
            x.disconnect?.()
          } catch {
            // already disconnected
          }
        })
      }, 700)
      nodes = []
      on = false
    }
  }
}
