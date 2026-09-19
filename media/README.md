# Media

| File | Use |
| --- | --- |
| `docket-demo.mp4` | 1920×1080, 66s, ~4.2 MB — the master. LinkedIn, X, YouTube. |
| `docket-demo-720p.mp4` | 1280×720, ~2.0 MB — where upload size is capped. |
| `docket-demo.gif` | 800px, 6s, ~1.2 MB — the opening national view, for places that want a GIF. |
| `social-captions.md` | Long-form, thread and short captions. |

Silent, with no narration — it needs captions or surrounding copy on any feed
that autoplays muted.

## How it was made

Scripted with Puppeteer against the **deployed** site, not a local dev server,
so the live SAPS banner shows its real state: the recording opens on "SAPS feed
live" naming the `2026-2027_-_1st_Quarter_WEB.xlsm` release it found. That is
the whole point of the project and it could not be captured locally, where the
serverless function does not run.

Frames are captured one at a time at 15 fps with eased programmatic scrolling.
A screen recorder would have given juddery scrolling and a variable frame rate.
JPEG rather than PNG: at 1080p the PNG encode dominates capture time, and the
source goes into a lossy video regardless.

Each page load waits ~1.8s before capture so the live check and the lazy
station chunks have landed — otherwise the banner is caught mid-"connecting"
and the station tables render empty.

The encode forces `yuv420p` at limited range and tags BT.709. Straight from
JPEG frames ffmpeg produces `yuvj420p` (full range), which some players stretch
enough to wash out a dark interface like this one.

## Storyboard

Live feed banner → national headline (24 692 murders, 68 a day) → ten-year
trend, then the monthly rolling-year view through June 2026 → what the crime is
→ biggest movers → **provinces by murder rate**, where Gauteng records the most
and ranks fourth → all 49 categories → murder in full, down to provinces and
stations → a province → all 1 172 stations → the Method page, and what "live"
honestly means.

The recording setup lives outside this repo; only the output is kept here.
