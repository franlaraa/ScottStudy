import { getStore } from '@netlify/blobs';

// Almacén compartido único: la app no tiene autenticación real, así que
// todas las tarjetas, carpetas y eventos viven en un mismo documento JSON.
export default async (req) => {
  const store = getStore('studydeck');

  if (req.method === 'GET') {
    const data = await store.get('state', { type: 'json' });
    return new Response(JSON.stringify(data || null), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    await store.setJSON('state', body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config = {
  path: '/api/state'
};
