import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { rateLimit } from "express-rate-limit";

const mediaRoot = path.resolve(process.env.PUBLIC_MEDIA_STORAGE_PATH || "./public-media");
const imageLimit = 8 * 1024 * 1024;
const videoLimit = 20 * 1024 * 1024;
const formats = {
  "image/jpeg": { extension: "jpg", limit: imageLimit },
  "image/png": { extension: "png", limit: imageLimit },
  "image/webp": { extension: "webp", limit: imageLimit },
  "video/mp4": { extension: "mp4", limit: videoLimit },
};

function matchesFormat(bytes, mimeType) {
  if (mimeType === "image/jpeg")
    return bytes.length > 4 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) && bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9]));
  if (mimeType === "image/png")
    return bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString("ascii", 12, 16) === "IHDR" && bytes.subarray(-12).equals(Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]));
  if (mimeType === "image/webp")
    return bytes.length > 20 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.readUInt32LE(4) === bytes.length - 8 && bytes.toString("ascii", 8, 12) === "WEBP" && ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16));
  if (mimeType === "video/mp4") {
    if (bytes.length < 24 || bytes.toString("ascii", 4, 8) !== "ftyp") return false;
    const boxSize = bytes.readUInt32BE(0);
    if (boxSize < 16 || boxSize > Math.min(bytes.length, 1024) || boxSize % 4) return false;
    const allowedBrands = new Set(["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "MSNV"]);
    for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
      if (offset === 12) continue;
      if (allowedBrands.has(bytes.toString("ascii", offset, offset + 4))) return true;
    }
  }
  return false;
}

export function installPublicMedia(app, { requireWebRequest, requireAuth, requireAdmin, audit, getPrisma }) {
  const uploadLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    keyGenerator: (req) => req.user.id,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many media uploads. Please wait before uploading more files." },
  });
  app.post("/api/admin/public-media", requireWebRequest, requireAuth, requireAdmin, uploadLimit, express.json({ limit: "29mb" }), async (req, res, next) => {
    try {
      const { mimeType, data } = req.body || {};
      const format = formats[mimeType];
      if (!format || typeof data !== "string" || !data.length || data.length > Math.ceil(format.limit / 3) * 4 || data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data))
        return res.status(400).json({ error: "Choose a JPEG, PNG or WebP image (up to 8 MB), or an MP4 video (up to 20 MB)." });
      const bytes = Buffer.from(data, "base64");
      if (!bytes.length || bytes.length > format.limit || bytes.toString("base64") !== data || !matchesFormat(bytes, mimeType))
        return res.status(400).json({ error: "The file does not match a supported image or MP4 video. Choose another file." });
      await fs.mkdir(mediaRoot, { recursive: true, mode: 0o750 });
      const filename = `${crypto.randomUUID()}.${format.extension}`;
      const destination = path.join(mediaRoot, filename);
      await fs.writeFile(destination, bytes, { flag: "wx", mode: 0o640 });
      try {
        await audit(getPrisma(), req.user.email, "public_media_uploaded", "website_content", filename.slice(0, 36), { mimeType, size: bytes.length });
      } catch (error) {
        await fs.unlink(destination).catch(() => {});
        throw error;
      }
      res.status(201).json({ url: `/api/public-media/${filename}`, mimeType, size: bytes.length });
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/public-media/:filename", (req, res, next) => {
    const { filename } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|mp4)$/.test(filename))
      return res.status(404).json({ error: "Media could not be found." });
    const extension = path.extname(filename).slice(1);
    const mimeType = Object.entries(formats).find(([, value]) => value.extension === extension)[0];
    res.set({ "Content-Type": mimeType, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Cross-Origin-Resource-Policy": "same-origin", "Cache-Control": "public, max-age=31536000, immutable" });
    res.sendFile(filename, { root: mediaRoot, dotfiles: "deny", acceptRanges: true }, (error) => {
      if (error && !res.headersSent) {
        if (error.code === "ENOENT" || error.status === 404) return res.status(404).json({ error: "Media could not be found." });
        next(error);
      }
    });
  });
}
