# Karaoke kit

Turns a local audio file into a karaoke backing track and plays it with timed lyrics.

> Use only recordings you own or have permission to use. Don't commit copyrighted audio or lyrics to this repository.

## 1. Remove the vocals

```bash
pip install -r requirements.txt   # needs ffmpeg on PATH for mp3 input/output
python make_karaoke.py song.mp3
```

Produces `output/song/instrumental.mp3` (backing track) and `output/song/vocals.mp3`.
For higher quality (slower), add `--model htdemucs_ft`.

## 2. Write timed lyrics

Create an `.lrc` file with one timestamped line per lyric line:

```
[00:12.50] first line
[00:17.80] second line
```

Play `vocals.mp3` in any player and note the time each line starts.

## 3. Sing

Open `player.html` in a browser, load `instrumental.mp3` and the `.lrc` file, and press play.
