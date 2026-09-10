import { getStore } from '@netlify/blobs';

// Cada usuario autenticado tiene su propio documento JSON, guardado bajo
// su correo como clave, así que las tarjetas/carpetas/eventos de una
// cuenta nunca se mezclan con los de otra.
async function getEmailFromRequest(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const sessionsStore = getStore('studydeck-sessions');
  const session = await sessionsStore.get(token, { type: 'json' });
  return session ? session.email : null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async (req) => {
  const email = await getEmailFromRequest(req);
  if (!email) {
    return json({ error: 'No autenticado.' }, 401);
  }

  const dataStore = getStore('studydeck-data');

  if (req.method === 'GET') {
    const data = await dataStore.get(email, { type: 'json' });
    return json(data || null);
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return json({ error: 'JSON inválido' }, 400);
    }
    await dataStore.setJSON(email, body);
    return json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config = {
  path: '/api/state'
};
