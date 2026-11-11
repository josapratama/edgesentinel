import os
import math
import wave
import struct
import shutil
import asyncio
import logging
import subprocess
from pathlib import Path

logger = logging.getLogger("edgesentinel.siren")

SIREN_DIR = Path(__file__).resolve().parent.parent.parent / "data"
SIREN_WAV = SIREN_DIR / "siren.wav"


def _generate_siren_wav(filepath: Path, duration_sec: float = 2.0, sample_rate: int = 44100):
    """Generates an authentic dual-tone rising & falling security siren wav file."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    total_samples = int(sample_rate * duration_sec)
    
    with wave.open(str(filepath), "w") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)

        phase = 0.0
        frames = bytearray()
        for i in range(total_samples):
            t = i / sample_rate
            # Sweeps between 650 Hz and 1350 Hz with 1 Hz cycle (1 up, 1 down per sec)
            freq = 1000.0 + 350.0 * math.sin(2.0 * math.pi * 1.5 * t)
            phase += 2.0 * math.pi * freq / sample_rate
            sample_val = int(32767.0 * 0.9 * math.sin(phase))
            sample_val = max(-32768, min(32767, sample_val))
            frames.extend(struct.pack("<h", sample_val))

        wav_file.writeframes(frames)
    logger.info(f"Synthesized security siren WAV at {filepath}")


class PhysicalSirenService:
    def __init__(self):
        self.is_playing = False
        self.stop_requested = False
        self.current_task: asyncio.Task | None = None
        self.proc: subprocess.Popen | None = None
        self.wav_path = SIREN_WAV

        # Ensure WAV file exists
        if not self.wav_path.exists():
            try:
                _generate_siren_wav(self.wav_path)
            except Exception as e:
                logger.warning(f"Could not synthesize siren WAV: {e}")

    def _find_audio_player(self) -> str | None:
        """Finds suitable CLI audio player on host (aplay on RPi, paplay, ffplay)."""
        for player in ["aplay", "paplay", "ffplay"]:
            if shutil.which(player):
                return player
        return None

    async def trigger(self, duration_seconds: float = 10.0) -> bool:
        """Triggers the physical audio siren for specified duration."""
        if self.is_playing:
            # Already active, extend/keep running
            logger.info(f"Siren already active, extending for {duration_seconds}s")
            return True

        if not self.wav_path.exists():
            try:
                _generate_siren_wav(self.wav_path)
            except Exception as e:
                logger.error(f"Cannot generate siren WAV: {e}")
                return False

        self.is_playing = True
        self.stop_requested = False
        self.current_task = asyncio.create_task(self._playback_loop(duration_seconds))
        logger.info(f"🚨 Physical siren triggered for {duration_seconds} seconds!")
        return True

    async def _playback_loop(self, duration_seconds: float):
        player = self._find_audio_player()
        start_time = asyncio.get_event_loop().time()

        try:
            while not self.stop_requested and (asyncio.get_event_loop().time() - start_time) < duration_seconds:
                if player == "aplay":
                    cmd = ["aplay", "-q", str(self.wav_path)]
                elif player == "paplay":
                    cmd = ["paplay", str(self.wav_path)]
                elif player == "ffplay":
                    cmd = ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", str(self.wav_path)]
                else:
                    logger.info("Simulated siren audio cycle (no aplay/ffplay binary installed in container)")
                    await asyncio.sleep(2.0)
                    continue

                try:
                    self.proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    while self.proc.poll() is None:
                        if self.stop_requested or (asyncio.get_event_loop().time() - start_time) >= duration_seconds:
                            self.proc.terminate()
                            break
                        await asyncio.sleep(0.1)
                except Exception as e:
                    logger.warning(f"Audio playback error: {e}")
                    await asyncio.sleep(2.0)

        finally:
            self.is_playing = False
            self.stop_requested = False
            if self.proc and self.proc.poll() is None:
                try:
                    self.proc.terminate()
                except Exception:
                    pass
            self.proc = None
            logger.info("Physical siren stopped.")

    async def stop(self):
        """Stops the siren immediately."""
        self.stop_requested = True
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.terminate()
            except Exception:
                pass
        self.is_playing = False
        logger.info("Physical siren stop requested.")

    def get_status(self) -> dict:
        return {
            "is_playing": self.is_playing,
            "has_audio_device": self._find_audio_player() is not None,
            "wav_exists": self.wav_path.exists()
        }


siren_service = PhysicalSirenService()
