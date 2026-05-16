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

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/authenticate_crew_member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          input_username: username,
          input_password: password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return json({ error: data.message || data.error || 'Unable to sign in.' }, response.status);
      }

      const member = Array.isArray(data) ? data[0] : data;
      if (!member) {
        return json({ error: 'No crew member found with that username or password.' }, 401);
      }

      if (member.status === 'Inactive') {
        return json({ error: 'Your account is currently inactive.' }, 403);
      }

      return json({ member });
    }

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
