exports.handler = async function() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(
      'https://www.youtube.com/feeds/videos.xml?channel_id=UCrFe-00l7g0urHbXMDsTweA'
    );
    const xml = await res.text();

    const getTag = (str, tag) => { const m = str.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`)); return m ? m[1].trim() : ''; };
    const getAttr = (str, tag, attr) => { const m = str.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`)); return m ? m[1] : ''; };

    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    if (!entries.length) return { statusCode: 200, headers, body: JSON.stringify(null) };

    // Skip Shorts: oEmbed returns portrait aspect (thumbnail_width < thumbnail_height) for Shorts
    let result = null;
    for (const e of entries) {
      const rawId = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      if (!rawId) continue;

      try {
        const check = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${rawId}&format=json`);
        if (check.ok) {
          const oembed = await check.json();
          if (oembed.thumbnail_width < oembed.thumbnail_height) continue;
        }
      } catch (_) { /* assume long-form if check fails */ }

      const title = getTag(e, 'title');
      const published = getTag(e, 'published');
      const thumbnail = getAttr(e, 'media:thumbnail', 'url') || `https://img.youtube.com/vi/${rawId}/maxresdefault.jpg`;
      result = { id: rawId, title, published, thumbnail };
      break;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
