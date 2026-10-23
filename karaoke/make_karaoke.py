#!/usr/bin/env python3
"""Make a karaoke backing track from a local audio file.

Uses Demucs (https://github.com/facebookresearch/demucs) to split the song
into a vocals stem and an instrumental ("no_vocals") stem.

Only use audio you own or have permission to use.

Usage:
    pip install -r requirements.txt
    python make_karaoke.py path/to/song.mp3 [--out output] [--model htdemucs]

Output:
    <out>/<song>/instrumental.mp3   backing track for karaoke
    <out>/<song>/vocals.mp3         isolated vocals (useful for practice / timing lyrics)
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def separate(src: Path, out_dir: Path, model: str) -> Path:
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [
            sys.executable, "-m", "demucs",
            "--two-stems", "vocals",
            "-n", model,
            "--mp3", "--mp3-bitrate", "320",
            "-o", tmp,
            str(src),
        ]
        subprocess.run(cmd, check=True)

        stems = Path(tmp) / model / src.stem
        dest = out_dir / src.stem
        dest.mkdir(parents=True, exist_ok=True)
        shutil.move(str(stems / "no_vocals.mp3"), dest / "instrumental.mp3")
        shutil.move(str(stems / "vocals.mp3"), dest / "vocals.mp3")
        return dest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("audio", type=Path, help="local audio file (mp3, wav, flac, m4a ...)")
    parser.add_argument("--out", type=Path, default=Path("output"), help="output directory")
    parser.add_argument("--model", default="htdemucs", help="Demucs model (htdemucs, htdemucs_ft, mdx_extra)")
    args = parser.parse_args()

    if not args.audio.is_file():
        sys.exit(f"Audio file not found: {args.audio}")

    dest = separate(args.audio, args.out, args.model)
    print(f"Done:\n  {dest / 'instrumental.mp3'}\n  {dest / 'vocals.mp3'}")


if __name__ == "__main__":
    main()
