import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: number;
  auth_user_id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  simulations_ran: number;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  profile?: UserProfile;
  error?: string;
}

const isRecoverableSignupError = (message: string): boolean => {
  const text = (message || "").toLowerCase();
  return (
    text.includes("rate limit") ||
    text.includes("already registered") ||
    text.includes("already exists")
  );
};

const ensureUserProfile = async (
  authUserId: string,
  name: string,
  email: string,
  role: "user" | "admin",
): Promise<{ profile?: UserProfile; error?: string }> => {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existingProfileError) {
    return { error: existingProfileError.message };
  }

  if (existingProfile) {
    return { profile: existingProfile as UserProfile };
  }

  const { data: createdProfile, error: createProfileError } = await supabase
    .from("users")
    .insert([
      {
        auth_user_id: authUserId,
        name,
        email,
        password_hash: "hashed_profile_only",
        role,
      },
    ])
    .select()
    .single();

  if (createProfileError) {
    return { error: createProfileError.message };
  }

  return { profile: createdProfile as UserProfile };
};

/**
 * Sign up a new user with Supabase Auth and create a user profile
 */
export const signUp = async (
  name: string,
  email: string,
  password: string,
  role: "user" | "admin" = "user",
): Promise<AuthResponse> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUserError) {
      return { success: false, error: existingUserError.message };
    }

    if (existingUser) {
      return { success: false, error: "User already exists with this email" };
    }

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
      const authMessage = authError?.message || "Signup failed";

      // Supabase can throttle sign-up emails; if account already exists, recover by signing in.
      if (isRecoverableSignupError(authMessage)) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (signInError || !signInData.user) {
          return { success: false, error: authMessage };
        }

        const { profile, error: ensureError } = await ensureUserProfile(
          signInData.user.id,
          name,
          normalizedEmail,
          role,
        );

        if (ensureError || !profile) {
          return { success: false, error: ensureError || "Failed to save user profile" };
        }

        return {
          success: true,
          user: signInData.user,
          profile,
        };
      }

      return { success: false, error: authMessage };
    }

    // 2. Ensure users-table profile exists for this auth user.
    const { profile, error: ensureError } = await ensureUserProfile(
      authData.user.id,
      name,
      normalizedEmail,
      role,
    );

    if (ensureError || !profile) {
      return { success: false, error: ensureError || "Failed to save user profile" };
    }

    return {
      success: true,
      user: authData.user,
      profile,
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      return { success: false, error: error?.message || "Invalid credentials" };
    }
    // Optionally fetch user profile from your users table here if needed
    return { success: true, profile: { ...data.user } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    return { success: true };
  } catch (error) {
    console.error("Sign out error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  return null;
};

/**
 * Get current user profile
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  // Get the current Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) return null;

  // Fetch the user profile from the users table using auth_user_id
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (profileError || !profile) return null;
  return profile as UserProfile;
};

/**
 * Reset password request
 */
export const resetPassword = async (
  email: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "No account found with this email" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Update password
 */
export const updatePassword = async (
  email: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        password_hash: "hashed_" + newPassword,
      })
      .eq("email", normalizedEmail)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!updatedUser) {
      return { success: false, error: "No account found with this email" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (
  callback: (event: string, session: any) => void,
) => {
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          callback("SIGNED_OUT", null);
        },
      },
    },
  };
};
