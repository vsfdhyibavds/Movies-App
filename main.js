import {
    supabase,
    getCurrentUser,
    addToWatchlist as addToWatchlistDB,
    removeFromWatchlist as removeFromWatchlistDB,
    getWatchlist,
    isInWatchlist,
    addToWatchHistory as addToWatchHistoryDB,
    getWatchHistory
} from './supabase.js';
import { signUp, signIn, signOut, onAuthStateChange } from './auth.js';

const API_URL = 'https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=3fd2be6f0c70a2a598f084ddfb75487c&page=1';
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCH_API = 'https://api.themoviedb.org/3/search/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query="';

const main = document.getElementById('main');
const form = document.getElementById('form');
const search = document.getElementById('search');
const modal = document.getElementById('movie-modal');
const closeBtn = document.querySelector('.close');
const movieDetails = document.getElementById('movie-details');
const watchlistToggleBtn = document.getElementById('watchlist-toggle');
const watchlistContainer = document.getElementById('watchlist-container');
const themeToggleBtn = document.getElementById('theme-toggle');

const authToggleBtn = document.getElementById('auth-toggle');
const authModal = document.getElementById('auth-modal');
const closeAuthBtn = document.getElementById('close-auth');
const signinTab = document.getElementById('signin-tab');
const signupTab = document.getElementById('signup-tab');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const signinBtn = document.getElementById('signin-btn');
const signupBtn = document.getElementById('signup-btn');
const signinEmail = document.getElementById('signin-email');
const signinPassword = document.getElementById('signin-password');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupConfirm = document.getElementById('signup-confirm');
const signinError = document.getElementById('signin-error');
const signupError = document.getElementById('signup-error');
const authContainer = document.getElementById('auth-container');

getMovies(API_URL);
initializeAuth();

async function getMovies(url) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        showMovies(data.results);
    } catch (err) {
        console.error('Error fetching movies:', err);
    }
}

async function showMovies(movies) {
    main.innerHTML = '';

    for (const movie of movies) {
        const { title, poster_path, vote_average, overview, id } = movie;

        const movieEl = document.createElement('div');
        movieEl.classList.add('movie');
        movieEl.dataset.id = id;

        const inWatchlist = await isInWatchlist(id);

        movieEl.innerHTML = `
            <img src="${IMG_PATH + poster_path}" alt="${title}">
            <div class="movie-info">
                <h3>${title}</h3>
                <span class="${getClassByRate(vote_average)}">${vote_average.toFixed(1)}</span>
            </div>
            <div class="overview">
                <h3>Overview</h3>
                ${overview || 'No overview available.'}
                <div class="movie-actions">
                    <button class="watchlist-action-btn ${inWatchlist ? 'added' : ''}" data-movie-id="${id}">
                        <i class="fas fa-bookmark"></i> ${inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    </button>
                </div>
            </div>
        `;

        const watchlistBtn = movieEl.querySelector('.watchlist-action-btn');
        watchlistBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleWatchlist(movie, watchlistBtn);
        });

        movieEl.addEventListener('click', async () => {
            await showMovieDetails(movie);
            await addToWatchHistory(movie);
        });

        main.appendChild(movieEl);
    }
}

function getClassByRate(vote) {
    if(vote >= 8) {
        return 'green';
    } else if(vote >= 5) {
        return 'orange';
    } else {
        return 'red';
    }
}

form.addEventListener('input', async () => {
    const searchTerm = search.value.trim();
    if (searchTerm) {
        const suggestions = await fetchSuggestions(searchTerm);
        showSuggestions(suggestions);
    } else {
        clearSuggestions();
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const searchTerm = search.value.trim();

    if(searchTerm && searchTerm !== '') {
        getMovies(SEARCH_API + searchTerm);
        search.value = '';
        clearSuggestions();
    } else {
        window.location.reload();
    }
});

async function fetchSuggestions(query) {
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query=${query}`);
    const data = await response.json();
    return data.results.slice(0, 5).map(movie => movie.title);
}

function showSuggestions(suggestions) {
    clearSuggestions();
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.textContent = suggestion;
        div.addEventListener('click', () => {
            search.value = suggestion;
            clearSuggestions();
            form.dispatchEvent(new Event('submit'));
        });
        document.getElementById('autocomplete-list').appendChild(div);
    });
}

function clearSuggestions() {
    document.getElementById('autocomplete-list').innerHTML = '';
}

async function showMovieDetails(movie) {
    const { id } = movie;
    const detailsUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=3fd2be6f0c70a2a598f084ddfb75487c`;

    try {
        const res = await fetch(detailsUrl);
        const data = await res.json();
        await displayMovieDetails(data);
    } catch (err) {
        console.error('Error fetching movie details:', err);
    }
}

async function displayMovieDetails(movie) {
    const {
        title,
        poster_path,
        vote_average,
        overview,
        release_date,
        runtime,
        genres,
        tagline,
        homepage,
        id
    } = movie;

    const inWatchlist = await isInWatchlist(id);

    movieDetails.innerHTML = `
        <div class="movie-detail-header">
            <img src="${IMG_PATH + poster_path}" alt="${title}" class="movie-detail-poster">
            <div class="movie-detail-info">
                <h2>${title} <span class="${getClassByRate(vote_average)}">${vote_average.toFixed(1)}</span></h2>
                ${tagline ? `<p class="tagline">"${tagline}"</p>` : ''}
                <p><strong>Release Date:</strong> ${release_date}</p>
                <p><strong>Runtime:</strong> ${runtime} minutes</p>
                <div class="genres">
                    ${genres.map(genre => `<span class="genre">${genre.name}</span>`).join('')}
                </div>
                ${homepage ? `<p><strong>Website:</strong> <a href="${homepage}" target="_blank">${homepage}</a></p>` : ''}
                <button class="watchlist-action-btn ${inWatchlist ? 'added' : ''}" data-movie-id="${id}">
                    <i class="fas fa-bookmark"></i> ${inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </button>
            </div>
        </div>
        <div class="movie-detail-overview">
            <h3>Overview</h3>
            <p>${overview || 'No overview available.'}</p>
        </div>
    `;

    const watchlistBtn = movieDetails.querySelector('.watchlist-action-btn');
    watchlistBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await toggleWatchlist(movie, watchlistBtn);
    });

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function toggleWatchlist(movie, buttonElement) {
    const user = await getCurrentUser();

    if (!user) {
        showToast('Please sign in to manage your watchlist');
        return;
    }

    const inWatchlist = await isInWatchlist(movie.id);

    if (inWatchlist) {
        const success = await removeFromWatchlistDB(movie.id);
        if (success) {
            showToast(`${movie.title} removed from watchlist`);
            if (buttonElement) {
                buttonElement.classList.remove('added');
                buttonElement.innerHTML = '<i class="fas fa-bookmark"></i> Add to Watchlist';
            }
            await refreshWatchlist();
        }
    } else {
        const success = await addToWatchlistDB(movie);
        if (success) {
            showToast(`${movie.title} added to watchlist`);
            if (buttonElement) {
                buttonElement.classList.add('added');
                buttonElement.innerHTML = '<i class="fas fa-bookmark"></i> In Watchlist';
            }
            await refreshWatchlist();
        }
    }
}

async function addToWatchHistory(movie) {
    const user = await getCurrentUser();
    if (!user) return;

    await addToWatchHistoryDB(movie);
    await refreshWatchHistory();
}

async function refreshWatchHistory() {
    const history = await getWatchHistory();
    const historyContainer = document.getElementById('watch-history');
    historyContainer.innerHTML = '';

    if (history.length === 0) {
        historyContainer.innerHTML = '<p class="empty-message">No watch history yet</p>';
        return;
    }

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('watchlist-item');
        historyItem.innerHTML = `
            <img src="${IMG_PATH + item.poster_path}" alt="${item.title}">
            <div class="watchlist-item-info">
                <h4>${item.title}</h4>
                <p>Watched: ${new Date(item.watched_at).toLocaleDateString()}</p>
            </div>
        `;
        historyItem.addEventListener('click', async () => {
            const movie = { id: item.movie_id, title: item.title, poster_path: item.poster_path };
            await showMovieDetails(movie);
        });
        historyContainer.appendChild(historyItem);
    });
}

async function refreshWatchlist() {
    const watchlist = await getWatchlist();
    const watchlistMoviesContainer = document.getElementById('watchlist-movies');
    watchlistMoviesContainer.innerHTML = '';

    if (watchlist.length === 0) {
        watchlistMoviesContainer.innerHTML = '<p class="empty-message">Your watchlist is empty</p>';
        return;
    }

    watchlist.forEach(item => {
        const watchlistItem = document.createElement('div');
        watchlistItem.classList.add('watchlist-item');
        watchlistItem.innerHTML = `
            <img src="${IMG_PATH + item.poster_path}" alt="${item.title}">
            <div class="watchlist-item-info">
                <h4>${item.title}</h4>
                <p>Rating: ${item.vote_average.toFixed(1)}</p>
            </div>
            <button class="remove-from-watchlist" data-movie-id="${item.movie_id}">
                <i class="fas fa-times"></i>
            </button>
        `;

        const removeBtn = watchlistItem.querySelector('.remove-from-watchlist');
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const success = await removeFromWatchlistDB(item.movie_id);
            if (success) {
                showToast(`${item.title} removed from watchlist`);
                await refreshWatchlist();
            }
        });

        watchlistItem.addEventListener('click', async () => {
            const movie = {
                id: item.movie_id,
                title: item.title,
                poster_path: item.poster_path,
                vote_average: item.vote_average
            };
            await showMovieDetails(movie);
        });

        watchlistMoviesContainer.appendChild(watchlistItem);
    });
}

watchlistToggleBtn.addEventListener('click', async () => {
    const user = await getCurrentUser();

    if (!user) {
        showToast('Please sign in to view your watchlist');
        return;
    }

    watchlistContainer.classList.toggle('hidden');

    if (!watchlistContainer.classList.contains('hidden')) {
        await refreshWatchHistory();
        await refreshWatchlist();
    }
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

window.addEventListener('click', (e) => {
    if(e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    document.querySelector('header').classList.toggle('light');
});

function initializeAuth() {
    onAuthStateChange(async (user) => {
        if (user) {
            updateAuthUI(user);
        } else {
            updateAuthUILoggedOut();
        }
    });
}

function updateAuthUI(user) {
    authContainer.innerHTML = `
        <div class="user-display">
            <span class="user-email">${user.email}</span>
            <button class="auth-btn user-btn" id="logout-btn">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

function updateAuthUILoggedOut() {
    authContainer.innerHTML = `
        <button id="auth-toggle" class="auth-btn">
            <i class="fas fa-user"></i> Sign In
        </button>
    `;

    document.getElementById('auth-toggle').addEventListener('click', openAuthModal);
}

function openAuthModal() {
    authModal.classList.remove('hidden');
}

function closeAuthModal() {
    authModal.classList.add('hidden');
    clearAuthForms();
}

function clearAuthForms() {
    signinEmail.value = '';
    signinPassword.value = '';
    signupEmail.value = '';
    signupPassword.value = '';
    signupConfirm.value = '';
    signinError.textContent = '';
    signupError.textContent = '';
}

authToggleBtn.addEventListener('click', openAuthModal);
closeAuthBtn.addEventListener('click', closeAuthModal);

signinTab.addEventListener('click', () => {
    signinTab.classList.add('active');
    signupTab.classList.remove('active');
    signinForm.classList.add('active');
    signupForm.classList.remove('active');
    signinError.textContent = '';
});

signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    signinTab.classList.remove('active');
    signupForm.classList.add('active');
    signinForm.classList.remove('active');
    signupError.textContent = '';
});

signinBtn.addEventListener('click', handleSignIn);
signupBtn.addEventListener('click', handleSignUp);

async function handleSignIn() {
    const email = signinEmail.value.trim();
    const password = signinPassword.value.trim();

    if (!email || !password) {
        signinError.textContent = 'Please fill in all fields';
        return;
    }

    signinBtn.disabled = true;
    signinBtn.textContent = 'Signing in...';

    const result = await signIn(email, password);

    if (result.success) {
        showToast('Signed in successfully');
        closeAuthModal();
    } else {
        signinError.textContent = result.error || 'Sign in failed';
    }

    signinBtn.disabled = false;
    signinBtn.textContent = 'Sign In';
}

async function handleSignUp() {
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    const confirm = signupConfirm.value.trim();

    if (!email || !password || !confirm) {
        signupError.textContent = 'Please fill in all fields';
        return;
    }

    if (password.length < 6) {
        signupError.textContent = 'Password must be at least 6 characters';
        return;
    }

    if (password !== confirm) {
        signupError.textContent = 'Passwords do not match';
        return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';

    const result = await signUp(email, password);

    if (result.success) {
        showToast('Account created successfully');
        clearAuthForms();
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
        signinForm.classList.add('active');
        signupForm.classList.remove('active');
    } else {
        signupError.textContent = result.error || 'Sign up failed';
    }

    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
}

async function handleLogout() {
    const result = await signOut();
    if (result.success) {
        showToast('Logged out successfully');
    }
}

window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeAuthModal();
    }
});

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
