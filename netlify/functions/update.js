exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  const OWNER = 'Shuroscience';
  const REPO  = 'summer-2026';
  const FILE  = 'data.json';
  const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;
  const HEADERS = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'summer-calendar'
  };

  try {
    const { newData } = JSON.parse(event.body);
    if (!newData) return { statusCode: 400, body: JSON.stringify({ error: 'Missing newData' }) };

    // Get current SHA
    const metaRes = await fetch(API, { headers: HEADERS });
    if (!metaRes.ok) throw new Error('Could not fetch file: ' + metaRes.status);
    const meta = await metaRes.json();

    // Commit updated content
    const content = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');
    const putRes = await fetch(API, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({ message: 'Update calendar data', content, sha: meta.sha })
    });
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || putRes.status);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
