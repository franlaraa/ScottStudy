import { getStore } from '@netlify/blobs';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutos

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

// Tras un cambio de contraseña, cierra cualquier sesión abierta con la
// contraseña antigua (en este u otro dispositivo).
async function invalidateSessionsForEmail(sessionsStore, email) {
  try {
    const { blobs } = await sessionsStore.list();
    for (const b of blobs) {
      const session = await sessionsStore.get(b.key, { type: 'json' });
      if (session && session.email === email) {
        await sessionsStore.delete(b.key);
      }
    }
  } catch (err) {
    // No crítico: si el listado falla, seguimos sin invalidar sesiones antiguas.
  }
}

async function sendResetEmail(email, resetUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no configurada');
  }
  const fromAddress = process.env.RESEND_FROM || 'StudyDeck <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromAddress,
      to: email,
      subject: 'Restablece tu contraseña de StudyDeck',
      html: `
        <p>Has pedido restablecer tu contraseña en StudyDeck.</p>
        <p><a href="${resetUrl}">Haz clic aquí para elegir una contraseña nueva</a></p>
        <p>El enlace caduca en 30 minutos. Si no has sido tú, puedes ignorar este correo.</p>
      `
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend error ${res.status}: ${errText}`);
  }
}

export default async (req) => {
  const usersStore = getStore('studydeck-users');
  const sessionsStore = getStore('studydeck-sessions');
  const resetsStore = getStore('studydeck-resets');

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

  // ---- Pedir enlace de restablecimiento (solo necesita el correo) ----
  if (action === 'request-reset') {
    const email = normalizeEmail(body.email);
    if (!email) {
      return json({ error: 'Indica tu correo electrónico.' }, 400);
    }

    const user = await usersStore.get(email, { type: 'json' });
    if (user) {
      const resetToken = generateToken();
      await resetsStore.setJSON(resetToken, { email, expiresAt: Date.now() + RESET_TTL_MS });

      const origin = new URL(req.url).origin;
      const resetUrl = `${origin}/?reset=${resetToken}`;

      try {
        await sendResetEmail(email, resetUrl);
      } catch (err) {
        return json({ error: 'No se pudo enviar el correo de restablecimiento. Inténtalo más tarde.' }, 502);
      }
    }

    // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
    return json({ ok: true });
  }

  // ---- Confirmar nueva contraseña con el token del correo ----
  if (action === 'confirm-reset') {
    const token = String(body.token || '').trim();
    const newPassword = String(body.password || '');

    if (!token || !newPassword) {
      return json({ error: 'Faltan datos.' }, 400);
    }
    if (newPassword.length < 6) {
      return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
    }

    const resetData = await resetsStore.get(token, { type: 'json' });
    if (!resetData || Date.now() > resetData.expiresAt) {
      if (resetData) await resetsStore.delete(token);
      return json({ error: 'El enlace no es válido o ha caducado. Pide uno nuevo.' }, 400);
    }

    const user = await usersStore.get(resetData.email, { type: 'json' });
    if (!user) {
      await resetsStore.delete(token);
      return json({ error: 'No se encontró la cuenta asociada.' }, 404);
    }

    user.passwordHash = hashPassword(newPassword);
    await usersStore.setJSON(resetData.email, user);
    await resetsStore.delete(token);
    await invalidateSessionsForEmail(sessionsStore, resetData.email);

    const sessionToken = await createSession(sessionsStore, resetData.email);
    return json({ token: sessionToken, email: resetData.email });
  }

  // ---- Registro / login (requieren correo y contraseña) ----
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
