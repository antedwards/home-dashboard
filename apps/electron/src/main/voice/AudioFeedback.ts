/**
 * Provides audio feedback for voice command results
 * Plays success pings and error sounds
 */
export class AudioFeedback {
  /**
   * Play success sound
   */
  async playSuccess(): Promise<void> {
    // Generate a pleasant success tone (two ascending notes)
    await this.playTone(800, 100); // First note (E5)
    await this.sleep(50);
    await this.playTone(1000, 150); // Second note (C6)
  }

  /**
   * Play error sound
   */
  async playError(): Promise<void> {
    // Generate a descending error tone
    await this.playTone(400, 200); // Lower frequency for error
    await this.sleep(50);
    await this.playTone(300, 200); // Even lower
  }

  /**
   * Play listening started sound
   */
  async playListeningStarted(): Promise<void> {
    // Short single beep
    await this.playTone(600, 100);
  }

  /**
   * Play a tone using the system beep
   * In a full implementation, this would use a proper audio API
   */
  private async playTone(frequency: number, duration: number): Promise<void> {
    // For now, we'll use console.beep or system notification sounds
    // In production, you'd use a library like 'node-wav-player' or 'play-sound'
    // or generate actual WAV files

    // Fallback: Log for now (will be replaced with actual audio)
    console.log(`🔊 Playing tone: ${frequency}Hz for ${duration}ms`);

    // You can replace this with actual audio playback using:
    // - node-wav-player
    // - play-sound
    // - Generate WAV buffers and play them
    // - Use Electron's built-in audio APIs

    return this.sleep(duration);
  }

  /**
   * Helper to sleep for a duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Play a system notification sound (if available)
   */
  playSystemSound(soundName: 'success' | 'error' | 'notification'): void {
    // On macOS: afplay /System/Library/Sounds/[sound].aiff
    // On Windows: rundll32 user32.dll,MessageBeep
    // On Linux: paplay /usr/share/sounds/...

    // For now, just log
    console.log(`🔊 System sound: ${soundName}`);
  }
}

/**
 * Generate a simple WAV file buffer for a tone
 * This is a helper function that can be used to create actual audio
 */
export function generateToneBuffer(
  frequency: number,
  duration: number,
  sampleRate: number = 44100
): Buffer {
  const numSamples = Math.floor(sampleRate * (duration / 1000));
  const buffer = Buffer.alloc(44 + numSamples * 2); // WAV header + 16-bit samples

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Format chunk size
  buffer.writeUInt16LE(1, 20); // Audio format (1 = PCM)
  buffer.writeUInt16LE(1, 22); // Number of channels
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generate samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * frequency * t);
    // Apply fade in/out envelope
    const envelope =
      i < sampleRate * 0.01
        ? i / (sampleRate * 0.01)
        : i > numSamples - sampleRate * 0.01
          ? (numSamples - i) / (sampleRate * 0.01)
          : 1;
    const sample = Math.floor(value * envelope * 32767);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}
