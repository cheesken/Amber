import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

const USER_ID_KEY = 'amber_user_id';
const SECRET_CODE_KEY = 'amber_secret_code';

export async function isSignedUp(): Promise<boolean> {
  const userId = await SecureStore.getItemAsync(USER_ID_KEY);
  return userId !== null;
}

export async function getStoredCode(): Promise<number | null> {
  const code = await SecureStore.getItemAsync(SECRET_CODE_KEY);
  return code ? parseInt(code, 10) : null;
}

export async function getStoredUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_ID_KEY);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  await SecureStore.deleteItemAsync(USER_ID_KEY);
  await SecureStore.deleteItemAsync(SECRET_CODE_KEY);
}

export async function logIn(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );

    const { data, error } = await supabase
      .from('users')
      .select('id, timer_duration')
      .eq('username', username)
      .eq('password_hash', passwordHash)
      .single();

    if (error || !data) {
      return { success: false, error: 'Invalid username or password' };
    }

    await SecureStore.setItemAsync(USER_ID_KEY, data.id);
    await SecureStore.setItemAsync(SECRET_CODE_KEY, data.timer_duration.toString());

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Something went wrong' };
  }
}

export async function signUp(
  username: string,
  password: string,
  code: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );

    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        timer_duration: code,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Username already taken' };
      }
      return { success: false, error: error.message };
    }

    console.log('[Auth] SignUp successful, saving User ID:', data.id);
    await SecureStore.setItemAsync(USER_ID_KEY, data.id);
    await SecureStore.setItemAsync(SECRET_CODE_KEY, code.toString());
    console.log('[Auth] User ID and Secret Code saved to SecureStore');

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Something went wrong' };
  }
}
