exports.handler = async () => {
  const token = process.env.GH_TOKEN;
  const OWNER = 'Shuroscience';
  const REPO  = 'summer-2026';
  const FILE  = 'data.json';
  const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

  try {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'summer-calendar',
      'Cache-Control': 'no-cache'
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(API, { headers });
    if (!res.ok) throw new Error('GitHub API error: ' + res.status);
    const meta = await res.json();
    const data = JSON.parse(Buffer.from(meta.content, 'base64').toString('utf8'));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
