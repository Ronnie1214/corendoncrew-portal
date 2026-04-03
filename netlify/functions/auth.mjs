import { readDb } from './_shared/db.mjs';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const { username = '', password = '' } = await request.json();
    const db = await readDb();
    const member = db.crewMembers.find(
      item => item.username?.toLowerCase() === username.trim().toLowerCase()
    );

    if (!member) {
      return json({ error: 'No crew member found with that username.' }, 404);
    }

    if (member.password !== password) {
      return json({ error: 'Incorrect password.' }, 401);
    }

    if (member.status === 'Inactive') {
      return json({ error: 'Your account is currently inactive.' }, 403);
    }

    return json({ member });
  } catch (error) {
    return json({ error: error.message || 'Unable to sign in.' }, 500);
  }
};
