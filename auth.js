import { supabase } from './supabase.js';

export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        (async () => {
            await callback(session?.user || null, event);
        })();
    });
}
