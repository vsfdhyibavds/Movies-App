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

    const { data: existing } = await supabase
        .from('watch_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('movie_id', movie.id)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from('watch_history')
            .update({ watched_at: new Date().toISOString() })
            .eq('id', existing.id);
        if (error) {
            console.error('Error updating watch history:', error);
            return false;
        }
        return true;
    }

    const { error } = await supabase
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

export async function getMovieReviews(movieId) {
    const { data, error } = await supabase
        .from('reviews')
        .select('id, user_id, rating, review_text, created_at, updated_at')
        .eq('movie_id', movieId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
    return data || [];
}

export async function getUserReview(movieId) {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, review_text, created_at')
        .eq('user_id', user.id)
        .eq('movie_id', movieId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user review:', error);
        return null;
    }
    return data;
}

export async function saveReview(movieId, movieTitle, posterPath, rating, reviewText) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Please sign in to review movies' };

    const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('movie_id', movieId)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from('reviews')
            .update({ rating, review_text: reviewText || null, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

        if (error) return { success: false, error: error.message };
        return { success: true, action: 'updated' };
    }

    const { error } = await supabase
        .from('reviews')
        .insert([{
            user_id: user.id,
            movie_id: movieId,
            rating,
            review_text: reviewText || null,
            title: movieTitle,
            poster_path: posterPath
        }]);

    if (error) return { success: false, error: error.message };
    return { success: true, action: 'created' };
}

export async function deleteReview(movieId) {
    const user = await getCurrentUser();
    if (!user) return false;

    const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_id', movieId);

    if (error) {
        console.error('Error deleting review:', error);
        return false;
    }
    return true;
}

export async function getUserReviews() {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('reviews')
        .select('movie_id, rating, review_text, title, poster_path, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching user reviews:', error);
        return [];
    }
    return data || [];
}

export function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
