// Shared auth helper — loaded before page-specific scripts
let apiKey = localStorage.getItem('app_api_key') || '';

async function checkAuthRequired() {
  try {
    const res = await fetch('/api/auth-status');
    const data = await res.json();
    if (data.authEnabled && !apiKey) {
      promptForApiKey();
    }
  } catch (e) {
    // Auth check failed, proceed — will get 401 if needed
  }
}

function promptForApiKey() {
  const key = prompt('This application requires an API key. Please enter it:');
  if (key) {
    apiKey = key;
    localStorage.setItem('app_api_key', key);
  }
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (apiKey) headers['X-API-Key'] = apiKey;
  return headers;
}

async function authFetch(url, options = {}) {
  const opts = { ...options };
  opts.headers = authHeaders(opts.headers || {});
  let res = await fetch(url, opts);
  if (res.status === 401) {
    promptForApiKey();
    opts.headers = authHeaders(opts.headers || {});
    res = await fetch(url, opts);
  }
  return res;
}

checkAuthRequired();
