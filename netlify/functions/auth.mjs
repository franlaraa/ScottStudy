import { getStore } from '@netlify/blobs';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const candidateBuffer = scryptSync(password, salt, 64);
  return hashBuffer.length === candidateBuffer.length && timingSafeEqual(hashBuffer, candidateBuffer);
}

function generateToken() {
  return randomBytes(24).toString('hex');
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function createSession(sessionsStore, email) {
  const token = generateToken();
  await sessionsStore.setJSON(token, {
    email,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  return token;
}

export default async (req) => {
  const usersStore = getStore('studydeck-users');
  const sessionsStore = getStore('studydeck-sessions');

  if (req.method === 'DELETE') {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (token) await sessionsStore.delete(token);
    return json({ ok: true });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    return json({ error: 'JSON inválido' }, 400);
  }

  const action = body.action;
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!email || !password) {
    return json({ error: 'Correo y contraseña son obligatorios.' }, 400);
  }

  if (action === 'register') {
    if (password.length < 6) {
      return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
    }
    const existing = await usersStore.get(email, { type: 'json' });
    if (existing) {
      return json({ error: 'Ya existe una cuenta con ese correo.' }, 409);
    }

    await usersStore.setJSON(email, {
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    });

    const token = await createSession(sessionsStore, email);
    return json({ token, email });
  }

  if (action === 'login') {
    const user = await usersStore.get(email, { type: 'json' });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return json({ error: 'Correo o contraseña incorrectos.' }, 401);
    }

    const token = await createSession(sessionsStore, email);
    return json({ token, email });
  }

  return json({ error: 'Acción no reconocida.' }, 400);
};

export const config = {
  path: '/api/auth'
};
