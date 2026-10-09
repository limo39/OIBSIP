export async function api(path, options = {}) {
  const token = localStorage.getItem('forno-token');
  let response;
  try {
    response = await fetch(path, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    const error = new Error('Cannot reach the kitchen. Is the server running?');
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.code = data.code;
    error.errors = data.errors;
    throw error;
  }
  return data;
}
