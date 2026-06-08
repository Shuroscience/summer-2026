const OWNER = 'Shuroscience';
const REPO  = 'summer-2026';
const FILE  = 'data.json';
const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'summer-calendar'
  };
}

async function getCurrentFile(token) {
  const res = await fetch(API, { headers: ghHeaders(token) });
  if (!res.ok) throw new Error('Could not fetch file: ' + res.status);
  const meta = await res.json();
  const data = JSON.parse(Buffer.from(meta.content, 'base64').toString('utf8'));
  return { data, sha: meta.sha };
}

async function writeFile(token, data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const res = await fetch(API, {
    method: 'PUT',
    headers: ghHeaders(token),
    body: JSON.stringify({ message: 'Update calendar data', content, sha })
  });
  if (res.status === 409) return { conflict: true };
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.status);
  }
  return { conflict: false };
}

function applyPatch(currentData, patch) {
  // patch = { personName, away, color? }
  const people = [...(currentData.people || [])];
  const idx = people.findIndex(p => p.name === patch.personName);
  if (idx >= 0) {
    people[idx] = { ...people[idx], away: patch.away, confirmed: true };
  } else {
    people.push({ name: patch.personName, color: patch.color || '#888', away: patch.away, confirmed: true });
  }
  return { ...currentData, people };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    const body = JSON.parse(event.body);

    // Support both old full-state writes and new person-patch writes
    const isPatch = !!body.personName;

    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      const { data: current, sha } = await getCurrentFile(token);

      const newData = isPatch ? applyPatch(current, body) : body.newData;
      if (!newData) throw new Error('Missing data');

      const result = await writeFile(token, newData, sha);
      if (result.conflict) {
        // SHA changed under us — loop and retry with fresh SHA
        continue;
      }

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    throw new Error('Could not save after 3 attempts — please try again');
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
