const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/;

export function extractYouTubeVideoId(text: string): string | null {
  const match = text.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export interface YouTubeEmbed {
  url: string;
  video_id: string;
  thumbnail_url: string;
}

export function detectYouTubeEmbed(text: string): YouTubeEmbed | null {
  const match = text.match(YOUTUBE_REGEX);
  if (!match) return null;
  const videoId = match[1];
  return {
    url: match[0].startsWith("http") ? match[0] : `https://${match[0]}`,
    video_id: videoId,
    thumbnail_url: getYouTubeThumbnail(videoId),
  };
}
