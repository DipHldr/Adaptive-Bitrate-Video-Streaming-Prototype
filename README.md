# Adaptive Bitrate Video Streaming Backend (Node.js + FFmpeg + Express)

## Overview

This project implements a **basic adaptive bitrate (ABR)** video streaming backend, similar in concept to how YouTube or Netflix deliver video.
It allows users to:

1. **Upload** a raw video file (e.g., `.mp4`)
2. **Process** it using **FFmpeg**, converting it into **multiple resolutions** — 1080p, 720p, and 480p
3. **Segment** each version into small chunks (`.ts` files) with a **playlist (`.m3u8`)**
4. **Serve** the video to the frontend via HTTP, enabling the player to **adaptively switch** between resolutions based on the viewer’s bandwidth.

---

## Tech Stack

| Component        | Technology Used                           |
| ---------------- | ----------------------------------------- |
| Runtime          | Node.js + JavaScript                      |
| Framework        | Express.js                                |
| Video Processing | FFmpeg                                    |
| File Upload      | Multer                                    |
| Streaming Format | HLS (`.m3u8` playlists + `.ts` chunks)    |
| Storage          | Local File System (can be extended to S3) |

---

## Features

* ✅ Upload video via REST API
* ✅ Automatically converts to 1080p, 720p, and 480p resolutions
* ✅ Generates `.m3u8` playlists for each resolution
* ✅ Serves HLS streams over HTTP
* ✅ Adaptive playback supported by modern HTML5 video players

---

## 🧩 Example API Flow

### Upload a Video

**Endpoint:**

```
POST /api/upload
```

**Body (form-data):**

```
video: <your-file.mp4>
```

**Response:**

```json
{
  "message": "Video uploaded and processing started",
  "playlisturl": playlistUrl
}
```

---

### Play the Video

Each processed video has:

```
1080p-->0, 720p-->1, 480p-->2
/processed/<videoId>/0/playlist.m3u8
/processed/<videoId>/1/playlist.m3u8
/processed/<videoId>/2/playlist.m3u8
```

Your frontend can point a video player like **hls.js** to the master `.m3u8`:

```html
<video id="video" controls></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
  const video = document.getElementById('video');
  const hls = new Hls();
  hls.loadSource('/processed/1738409238/master.m3u8');
  hls.attachMedia(video);
</script>
```

---

## FFmpeg Processing Logic

Each uploaded file triggers FFmpeg to:

1. Transcode the video into **3 resolutions**

   * 1080p → `-vf scale=-2:1080`
   * 720p → `-vf scale=-2:720`
   * 480p → `-vf scale=-2:480`
2. Segment into `.ts` chunks and generate an `.m3u8` playlist for each.
3. Create a **master playlist** that references all three resolutions.

Example FFmpeg command:

```bash
ffmpeg -i input.mp4 \
  -map 0 -c:v h264 -c:a aac -strict -2 \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
  -b:v:0 500k -s:v:0 640x360 \
  -b:v:1 1500k -s:v:1 1280x720 \
  -b:v:2 3000k -s:v:2 1920x1080 \
  -master_pl_name master.m3u8 \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "v%v/fileSequence%d.ts" v%v/playlist.m3u8
```

---

## Installation & Setup

### Install Dependencies

```bash
npm install
```

### Build & Run

Development:

```bash
npm run dev
```

Build for Production:

```bash
npm run build
npm start
```

---

## Testing the Upload API (using curl)

```bash
curl -X POST -F "video=@/path/to/video.mp4" http://localhost:3000/api/upload
```

---

## Frontend Integration

Use a frontend player like:

* [hls.js](https://github.com/video-dev/hls.js) (for browsers)
* [video.js](https://videojs.com/)
* Native iOS or Safari player (HLS supported natively)


---

## 🧑‍💻 Author

**Deep Halder**
Building real-time and streaming systems with Node.js, Javascript, TypeScript, and FFmpeg.
