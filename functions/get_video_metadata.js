export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);

  let videoUrl = requestUrl.searchParams.get("url");

  if (!videoUrl) {
    const referer = request.headers.get("Referer");

    if (referer) {
      const path = new URL(referer).pathname.slice(1);

      if (/^[A-Za-z0-9_-]{11}$/.test(path)) {
        videoUrl = path;
      } else {
        videoUrl = referer.replace(/^https:\/\/embed36\.pages\.dev/, "");

        if (videoUrl.startsWith("/")) {
          videoUrl = "https://www.youtube.com" + videoUrl;
        }
      }
    }
  }

  if (!videoUrl) {
    return Response.json(
      {
        error:
          'Missing "url" parameter and no usable Referer header was provided.'
      },
      { status: 400 }
    );
  }

  /*
   * Extract the YouTube video ID.
   */
  let videoId = null;

  if (/^[A-Za-z0-9_-]{11}$/.test(videoUrl)) {
    videoId = videoUrl;
  } else {
    try {
      const parsed = new URL(videoUrl);

      if (
        parsed.hostname === "youtu.be" ||
        parsed.hostname.endsWith(".youtu.be")
      ) {
        videoId = parsed.pathname.slice(1);
      } else if (
        parsed.hostname === "youtube.com" ||
        parsed.hostname.endsWith(".youtube.com") ||
        parsed.hostname === "www.youtube-nocookie.com"
      ) {
        videoId = parsed.searchParams.get("v");

        if (!videoId) {
          const match = parsed.pathname.match(
            /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/
          );

          if (match) {
            videoId = match[1];
          }
        }
      }
    } catch (e) {
      // Not a URL; try treating it as a video ID below.
    }
  }

  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return Response.json(
      {
        error: "Could not determine a valid YouTube video ID.",
        url: videoUrl
      },
      { status: 400 }
    );
  }

  /*
   * Invidious API
   */
  const endpoint =
    "https://www.invidious.frantisekfiala.eu/api/v1/videos/" +
    encodeURIComponent(videoId);

  const res = await fetch(endpoint, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!res.ok) {
    return Response.json(
      {
        error: "Invidious returned an error.",
        video_id: videoId
      },
      { status: res.status }
    );
  }

  const data = await res.json();

  /*
   * Find the author/channel information.
   */
  const authorName =
    data.author ||
    data.authorId ||
    "";

  const authorId =
    data.authorId ||
    null;

  /*
   * Find a thumbnail.
   */
  let thumbnailUrl = null;

  if (Array.isArray(data.videoThumbnails) && data.videoThumbnails.length) {
    const preferredThumbnail =
      data.videoThumbnails.find(
        thumbnail => thumbnail.quality === "maxres"
      ) ||
      data.videoThumbnails.find(
        thumbnail => thumbnail.quality === "high"
      ) ||
      data.videoThumbnails.find(
        thumbnail => thumbnail.quality === "medium"
      ) ||
      data.videoThumbnails[0];

    thumbnailUrl = preferredThumbnail.url;
  }

  /*
   * Find the channel URL.
   */
  const authorUrl = authorId
    ? "https://www.youtube.com/channel/" + authorId
    : null;

  /*
   * Build the same response structure as before.
   */
  return Response.json({
    user_info: {
      channel_logo_url:
        authorName
          ? "https://unavatar.io/youtube/" +
            encodeURIComponent(authorName)
          : null,

      username: authorName,

      subscriber_count:
        data.subCount !== undefined
          ? data.subCount
          : null,

      external_id: authorId,

      subscription_button_html: null,

      image_url: null,

      public_name: authorName,

      channel_title: authorName,

      subscriber_count_string:
        data.subCountText ||
        null,

      channel_banner_url: null
    },

    video_info: {
      title: data.title || "",

      author_name: authorName,

      author_url: authorUrl,

      thumbnail_url: thumbnailUrl,

      thumbnail_width:
        data.videoThumbnails?.find(
          thumbnail => thumbnail.url === thumbnailUrl
        )?.width || null,

      thumbnail_height:
        data.videoThumbnails?.find(
          thumbnail => thumbnail.url === thumbnailUrl
        )?.height || null,

      type: "video",

      provider_name: "YouTube",

      provider_url: "https://www.youtube.com/",

      html:
        '<iframe width="' +
        (data.width || 560) +
        '" height="' +
        (data.height || 315) +
        '" src="https://www.youtube.com/embed/' +
        videoId +
        '" frameborder="0" allowfullscreen></iframe>',

      width: data.width || 560,

      height: data.height || 315,

      version: "1.0",

      description:
        data.description || null,

      likes_count_unformatted:
        data.likeCount !== undefined
          ? data.likeCount
          : null,

      dislikes_count_unformatted: null,

      likes_dislikes_string:
        data.likeCount !== undefined
          ? String(data.likeCount)
          : null,

      view_count:
        data.viewCount !== undefined
          ? data.viewCount
          : null,

      view_count_string:
        data.viewCountText ||
        (
          data.viewCount !== undefined
            ? String(data.viewCount)
            : null
        ),

      subscription_ajax_token: null,

      video_id: videoId,

      length_seconds:
        data.lengthSeconds !== undefined
          ? data.lengthSeconds
          : null,

      published:
        data.published !== undefined
          ? data.published
          : null,

      published_text:
        data.publishedText ||
        null,

      category:
        data.category ||
        null,

      keywords:
        Array.isArray(data.keywords)
          ? data.keywords
          : [],

      is_live:
        data.liveNow === true,

      is_unlisted:
        data.isUnlisted === true,

      is_family_friendly:
        data.isFamilyFriendly !== undefined
          ? data.isFamilyFriendly
          : null
    }
  });
}
