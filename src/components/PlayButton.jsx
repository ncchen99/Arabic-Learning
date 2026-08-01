import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlayIcon, VolumeHighIcon } from '@hugeicons/core-free-icons';
import { play } from '../lib/audio.js';
import { DEFAULT_VOICE } from '../lib/voices.js';

/** 播放阿拉伯語發音；第一次會即時產生，之後都從快取來 */
export default function PlayButton({ text, voice = DEFAULT_VOICE, rate = 1, size = 22, label, onError }) {
  const [state, setState] = useState('idle'); // idle | loading | playing

  async function handle(e) {
    e.stopPropagation();
    e.preventDefault();
    if (state === 'loading') return;
    setState('loading');
    try {
      const player = await play(text, voice, rate);
      setState('playing');
      player.onended = () => setState('idle');
      player.onpause = () => setState('idle');
    } catch (err) {
      setState('idle');
      onError?.(err.message || '發音失敗');
    }
  }

  return (
    <button
      className={`icon-btn${state === 'playing' ? ' accent' : ''}`}
      onClick={handle}
      aria-label={label || '播放發音'}
    >
      {state === 'loading' ? (
        <span className="spin" />
      ) : (
        <HugeiconsIcon
          icon={state === 'playing' ? VolumeHighIcon : PlayIcon}
          size={size}
          strokeWidth={2}
        />
      )}
    </button>
  );
}
