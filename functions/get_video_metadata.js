
export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);

  // Use ?url= first
const requestUrl = new URL(request.url);

let videoUrl = requestUrl.searchParams.get("url");

if (!videoUrl) {
  const referer = request.headers.get("Referer");

  if (referer) {
    const path = new URL(referer).pathname.slice(1); // "wvrKOwml5t8"

    if (/^[A-Za-z0-9_-]{11}$/.test(path)) {
      // Looks like a YouTube video ID
      videoUrl = `https://www.youtube.com/watch?v=${path}`;
    } else {
      // Fall back to stripping the origin
      videoUrl = referer.replace(/^https:\/\/embed36\.pages\.dev/, "");

      // Convert relative URLs like /watch?v=...
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

  const endpoint =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(videoUrl);

  const res = await fetch(endpoint, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    return Response.json("Error " + videoUrl,
      { status: res.status }
    );
  }

  const data = await res.json();

  return Response.json({
    user_info: {
      channel_logo_url: null,
      username: data.author_name,
      subscriber_count: null,
      external_id: null,
      subscription_button_html: null,
      image_url: null,
      public_name: data.author_name,
      channel_title: data.author_name,
      subscriber_count_string: null,
      channel_banner_url: null,
    },

    video_info: {
      title: data.title,
      author_name: data.author_name,
      author_url: data.author_url,
      thumbnail_url: data.thumbnail_url,
      thumbnail_width: data.thumbnail_width,
      thumbnail_height: data.thumbnail_height,
      type: data.type,
      provider_name: data.provider_name,
      provider_url: data.provider_url,
      html: data.html,
      width: data.width,
      height: data.height,
      version: data.version,

      // Not available from oEmbed
      description: null,
      likes_count_unformatted: null,
      dislikes_count_unformatted: null,
      likes_dislikes_string: null,
      view_count: null,
      view_count_string: null,
      subscription_ajax_token: null,
    },
  });
}
