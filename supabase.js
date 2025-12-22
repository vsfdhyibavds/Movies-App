import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function addToWatchlist(movie) {
    const user = await getCurrentUser();
    if (!user) {
        showToast('Please sign in to add to watchlist');
        return false;
    }

    const { data, error } = await supabase
        .from('watchlist')
        .insert([
            {
                user_id: user.id,
                movie_id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average
            }
        ]);

    if (error) {
        console.error('Error adding to watchlist:', error);
        return false;
    }
    return true;
}

export async function removeFromWatchlist(movieId) {
    const user = await getCurrentUser();
    if (!user) return false;

    const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_id', movieId);

    if (error) {
        console.error('Error removing from watchlist:', error);
        return false;
    }
    return true;
}

export async function getWatchlist() {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('added_on', { ascending: false });

    if (error) {
        console.error('Error fetching watchlist:', error);
        return [];
    }
    return data || [];
}

export async function isInWatchlist(movieId) {
    const user = await getCurrentUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('movie_id', movieId)
        .maybeSingle();

    return data !== null;
}

export async function addToWatchHistory(movie) {
    const user = await getCurrentUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from('watch_history')
        .insert([
            {
                user_id: user.id,
                movie_id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path
            }
        ]);

    if (error) {
        console.error('Error adding to watch history:', error);
        return false;
    }
    return true;
}

export async function getWatchHistory() {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching watch history:', error);
        return [];
    }
    return data || [];
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
