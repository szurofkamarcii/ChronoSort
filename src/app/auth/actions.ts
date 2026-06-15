"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// Email / Jelszó Regisztráció
export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Email / Jelszó Bejelentkezés
export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// OAuth (Google / Facebook) Bejelentkezés
export async function signInWithOAuth(
  provider: "google" | "facebook",
  redirectTo: string = "/",
) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    console.error(`OAuth hiba (${provider}):`, error.message);
    return { success: false, error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

// Kijelentkezés
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
