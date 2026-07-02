'use client'

/**
 * Runs the mic input through a small Web Audio graph that mixes in
 * subtle tape hiss (looped white noise, high-passed) and a low motor
 * hum, both very quiet — texture, not noise. Returns a MediaStream with
 * a single processed audio track to swap in for the raw mic track
 * before handing it to MediaRecorder.
 *
 * Call dispose() when recording stops to tear down the AudioContext and
 * oscillators — otherwise they leak.
 */
export interface TapeAudioResult {
  stream: MediaStream
  dispose: () => void
}

export function createTapeAudioStream(micStream: MediaStream): TapeAudioResult | null {
  if (typeof window === 'undefined') return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioContextCtor = window.AudioContext ?? (window as any).webkitAudioContext
  if (!AudioContextCtor) return null

  if (micStream.getAudioTracks().length === 0) return null

  const ctx = new AudioContextCtor()

  // --- Mic passthrough ---
  const micSource = ctx.createMediaStreamSource(micStream)
  const micGain = ctx.createGain()
  micGain.gain.value = 1.0
  micSource.connect(micGain)

  // --- Tape hiss: looped white noise, high-passed so it sits in the
  // "hiss" band instead of muddying the voice ---
  const hissDuration = 2 // seconds, looped seamlessly enough for hiss
  const hissBuffer = ctx.createBuffer(1, ctx.sampleRate * hissDuration, ctx.sampleRate)
  const hissData = hissBuffer.getChannelData(0)
  for (let i = 0; i < hissData.length; i++) {
    hissData[i] = Math.random() * 2 - 1
  }
  const hissSource = ctx.createBufferSource()
  hissSource.buffer = hissBuffer
  hissSource.loop = true

  const hissFilter = ctx.createBiquadFilter()
  hissFilter.type = 'highpass'
  hissFilter.frequency.value = 4000

  const hissGain = ctx.createGain()
  hissGain.gain.value = 0.015 // quiet — texture, not noise

  hissSource.connect(hissFilter)
  hissFilter.connect(hissGain)

  // --- Motor hum: quiet low oscillator + faint harmonic ---
  const humOsc = ctx.createOscillator()
  humOsc.type = 'sine'
  humOsc.frequency.value = 60

  const humHarmonicOsc = ctx.createOscillator()
  humHarmonicOsc.type = 'sine'
  humHarmonicOsc.frequency.value = 120

  const humGain = ctx.createGain()
  humGain.gain.value = 0.006

  const humHarmonicGain = ctx.createGain()
  humHarmonicGain.gain.value = 0.003

  humOsc.connect(humGain)
  humHarmonicOsc.connect(humHarmonicGain)

  // --- Slow wobble on hiss level so it doesn't read as a flat tone ---
  const wobbleOsc = ctx.createOscillator()
  wobbleOsc.type = 'sine'
  wobbleOsc.frequency.value = 0.3
  const wobbleGain = ctx.createGain()
  wobbleGain.gain.value = 0.004
  wobbleOsc.connect(wobbleGain)
  wobbleGain.connect(hissGain.gain)

  // --- Mix bus ---
  const destination = ctx.createMediaStreamDestination()
  micGain.connect(destination)
  hissGain.connect(destination)
  humGain.connect(destination)
  humHarmonicGain.connect(destination)

  hissSource.start()
  humOsc.start()
  humHarmonicOsc.start()
  wobbleOsc.start()

  const dispose = () => {
    try { hissSource.stop() } catch {}
    try { humOsc.stop() } catch {}
    try { humHarmonicOsc.stop() } catch {}
    try { wobbleOsc.stop() } catch {}
    try { ctx.close() } catch {}
  }

  return { stream: destination.stream, dispose }
}