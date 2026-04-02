import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to fetch video info
  // For this clone, we'll use a public API or a mock for now, but we'll try to find a real one.
  // Many of these downloaders use a specific backend.
  app.post("/api/fetch-video", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    let backendUrl = "https://nayan-video-downloader.vercel.app/alldown?url=";
    
    // Determine which API to use based on the URL
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      backendUrl = "https://nayan-video-downloader.vercel.app/ytdown?url=";
    } else if (url.includes("instagram.com")) {
      backendUrl = "https://nayan-video-downloader.vercel.app/instagram?url=";
    } else if (url.includes("tiktok.com")) {
      backendUrl = "https://nayan-video-downloader.vercel.app/tikdown?url=";
    } else if (url.includes("capcut.com")) {
      backendUrl = "https://nayan-video-downloader.vercel.app/capcut?url=";
    } else if (url.includes("likee.video")) {
      backendUrl = "https://nayan-video-downloader.vercel.app/likee?url=";
    } else if (url.includes("terabox.com") || url.includes("nephobox.com")) {
      backendUrl = "https://nayan-video-downloader.vercel.app/terbox?url=";
    }

    try {
      const response = await axios.get(`${backendUrl}${encodeURIComponent(url)}`);
      const data = response.data;

      // Map the API response to our frontend format
      const videoData = data.data || data;
      
      const result = {
        title: videoData.title || videoData.caption || "Video Download",
        thumbnail: videoData.thumbnail || videoData.image || videoData.cover || "https://placehold.co/800x450/2563eb/white?text=Video+Preview",
        duration: videoData.duration || "N/A",
        formats: [] as any[]
      };

      // 1. Try to find links in 'links' array
      if (videoData.links && Array.isArray(videoData.links)) {
        videoData.links.forEach((link: any) => {
          result.formats.push({
            quality: link.quality || "Download",
            resolution: link.resolution || link.quality || "HD",
            size: link.size || "N/A",
            url: link.link || link.url
          });
        });
      } 
      
      // 2. Try to find direct video/audio links (common in some APIs)
      if (videoData.video || videoData.nowatermark || videoData.watermark) {
        if (videoData.nowatermark) {
          result.formats.push({ quality: "High Quality", resolution: "No Watermark", size: "N/A", url: videoData.nowatermark });
        }
        if (videoData.watermark) {
          result.formats.push({ quality: "Low Quality", resolution: "Watermark", size: "N/A", url: videoData.watermark });
        }
        if (videoData.video && !videoData.nowatermark) {
          result.formats.push({ quality: "High Quality", resolution: "HD", size: "N/A", url: videoData.video });
        }
      }

      // 3. Try to find audio link
      if (videoData.audio || videoData.music) {
        result.formats.push({
          quality: "Audio Only",
          resolution: "MP3",
          size: "N/A",
          url: videoData.audio || videoData.music
        });
      }

      // 4. Fallback for direct URL/Link at top level
      if (result.formats.length === 0) {
        const directLink = videoData.url || videoData.link || data.url || data.link;
        if (directLink) {
          result.formats.push({
            quality: "Download",
            resolution: "Original",
            size: "N/A",
            url: directLink
          });
        }
      }

      // Remove any formats without a URL
      result.formats = result.formats.filter(f => f.url && f.url !== "#");

      res.json(result);
    } catch (error: any) {
      console.error("API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch video information from the server" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
