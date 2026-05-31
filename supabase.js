export const SUPABASE_URL = "https://reebavnvftfibyhhjxat.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_WksWBZLsVc1f4JBmQiRK5A_6swUYr-Z";

const configured = SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 40 && window.supabase;
export const supabaseClient = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const isSupabaseConfigured = Boolean(supabaseClient);

export async function getCurrentUser() {
  if (!supabaseClient) return { id: "demo-user", email: "demo@performance.local" };
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  return data.user;
}
export async function signIn(email, password) {
  if (!supabaseClient) return { user: { id: "demo-user", email } };
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
export async function signUp(email, password, name) {
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
  if (error) throw error;
}
export async function upsertProfile(profile) {
  if (!supabaseClient) return profile;
  const { data, error } = await supabaseClient.from("users_profile").upsert(profile).select().single();
  if (error) throw error;
  return data;
}
