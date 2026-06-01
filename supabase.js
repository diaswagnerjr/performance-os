export const SUPABASE_URL = "https://reebavnvftfibyhhjxat.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_WksWBZLsVc1f4JBmQiRK5A_6swUYr-Z";

const rememberKey = "performance-os-remember";
const storageAdapter = {
  getItem(key) {
    return getAuthStorage().getItem(key);
  },
  setItem(key, value) {
    getAuthStorage().setItem(key, value);
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

const configured = SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 40 && window.supabase;

export const supabaseClient = configured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: storageAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    })
  : null;

export const isSupabaseConfigured = Boolean(supabaseClient);

export function setRememberSession(remember) {
  window.localStorage.setItem(rememberKey, remember ? "true" : "false");
}

export function getRememberSession() {
  return window.localStorage.getItem(rememberKey) !== "false";
}

export async function getCurrentUser() {
  if (!supabaseClient) return { id: "demo-user", email: "demo@performance.local" };
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError && !isMissingSession(sessionError)) throw sessionError;
  if (!sessionData?.session) return null;
  const { data, error } = await supabaseClient.auth.getUser();
  if (error && isMissingSession(error)) return null;
  if (error) throw error;
  return data.user;
}

export async function signIn(email, password, remember = true) {
  setRememberSession(remember);
  if (!supabaseClient) return { user: { id: "demo-user", email } };
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, name, remember = true) {
  setRememberSession(remember);
  if (!supabaseClient) return { user: { id: "demo-user", email, user_metadata: { name } } };
  const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw error;
  return data;
}

export async function resetPassword(email) {
  if (!supabaseClient) return;
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function signOut() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  storageAdapter.removeItem("");
  if (error && !isMissingSession(error)) throw error;
}

export async function upsertProfile(profile) {
  if (!supabaseClient) return profile;
  const { data, error } = await supabaseClient.from("users_profile").upsert(profile).select().single();
  if (error) throw error;
  return data;
}

function getAuthStorage() {
  return getRememberSession() ? window.localStorage : window.sessionStorage;
}

function isMissingSession(error) {
  return String(error?.message || "").toLowerCase().includes("auth session missing");
}
