import subprocess
from pathlib import Path


def trim_clip(source_path: Path, start_sec: float, end_sec: float, dest_path: Path) -> None:
    """Extracts [start_sec, end_sec) from source_path into dest_path as a standalone mp4.

    -ss/-t placed after -i for frame-accurate seeking (decodes from the start of the file
    rather than snapping to the nearest keyframe) — these clips are short enough that the
    extra decode time is negligible, and accuracy matters more than speed here.
    """
    duration = max(end_sec - start_sec, 0.1)
    result = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i", str(source_path),
            "-ss", f"{start_sec}",
            "-t", f"{duration}",
            "-c:v", "libx264",
            "-c:a", "aac",
            "-movflags", "+faststart",
            str(dest_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[-2000:]}")
