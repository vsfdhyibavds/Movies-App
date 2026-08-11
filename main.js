import {
    supabase,
    getCurrentUser,
    addToWatchlist as addToWatchlistDB,
    removeFromWatchlist as removeFromWatchlistDB,
    getWatchlist,
    isInWatchlist,
    addToWatchHistory as addToWatchHistoryDB,
    getWatchHistory,
    getMovieReviews,
    getUserReview,
    saveReview,
    deleteReview,
    getUserReviews,
    showToast
} from './supabase.js';
import { signUp, signIn, signOut, onAuthStateChange } from './auth.js';

const TMDB_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tmdb-proxy`;
const API_URL = `${TMDB_PROXY}/discover/movie?sort_by=popularity.desc&page=1`;
const IMG_PATH = `${TMDB_PROXY}/img/t/p/w1280`;
const SEARCH_API = `${TMDB_PROXY}/search/movie?query="`;
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect fill="%231a1a2e" width="300" height="450"/><text x="50%" y="50%" fill="%23666" font-family="sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">No Image</text></svg>';

function getPosterUrl(posterPath) {
    return posterPath ? IMG_PATH + posterPath : PLACEHOLDER_IMG;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

function showLoading() {
    main.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading movies...</div>';
}

function showError(message) {
    main.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>${escapeHtml(message)}</p></div>`;
}

async function getMovies(url) {
    showLoading();
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load movies (${res.status})`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            main.innerHTML = '<div class="error-state"><i class="fas fa-film"></i><p>No movies found. Try a different search.</p></div>';
            return;
        }
        showMovies(data.results);
    } catch (err) {
        console.error('Error fetching movies:', err);
        showError('Could not load movies. Please check your connection and try again.');
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
        const safeTitle = escapeHtml(title);
        const safeAlt = escapeAttr(title);
        const safeOverview = escapeHtml(overview || 'No overview available.');

        movieEl.innerHTML = `
            <img src="${getPosterUrl(poster_path)}" alt="${safeAlt}">
            <div class="movie-info">
                <h3>${safeTitle}</h3>
                <span class="${getClassByRate(vote_average)}">${vote_average.toFixed(1)}</span>
            </div>
            <div class="overview">
                <h3>Overview</h3>
                ${safeOverview}
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

        const img = movieEl.querySelector('img');
        img.addEventListener('error', () => { img.src = PLACEHOLDER_IMG; });

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

let searchDebounceTimer;
form.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const searchTerm = search.value.trim();
    if (!searchTerm) {
        clearSuggestions();
        return;
    }
    searchDebounceTimer = setTimeout(async () => {
        const suggestions = await fetchSuggestions(searchTerm);
        showSuggestions(suggestions);
    }, 300);
});

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const searchTerm = search.value.trim();

    if(searchTerm && searchTerm !== '') {
        getMovies(SEARCH_API + encodeURIComponent(searchTerm));
        search.value = '';
        clearSuggestions();
    }
});

async function fetchSuggestions(query) {
    const response = await fetch(`${TMDB_PROXY}/search/movie?query=${encodeURIComponent(query)}`);
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
    const detailsUrl = `${TMDB_PROXY}/movie/${id}`;

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
    const safeTitle = escapeHtml(title);
    const safeAlt = escapeAttr(title);
    const safeTagline = escapeHtml(tagline);
    const safeOverview = escapeHtml(overview || 'No overview available.');
    const safeReleaseDate = escapeHtml(release_date || 'Unknown');
    const safeRuntime = runtime ? `${runtime} minutes` : 'Unknown';
    const safeHomepage = homepage ? escapeAttr(homepage) : '';
    const safeHomepageDisplay = homepage ? escapeHtml(homepage) : '';

    movieDetails.innerHTML = `
        <div class="movie-detail-header">
            <img src="${getPosterUrl(poster_path)}" alt="${safeAlt}" class="movie-detail-poster">
            <div class="movie-detail-info">
                <h2>${safeTitle} <span class="${getClassByRate(vote_average)}">${vote_average.toFixed(1)}</span></h2>
                ${tagline ? `<p class="tagline">"${safeTagline}"</p>` : ''}
                <p><strong>Release Date:</strong> ${safeReleaseDate}</p>
                <p><strong>Runtime:</strong> ${safeRuntime}</p>
                <div class="genres">
                    ${(genres || []).map(genre => `<span class="genre">${escapeHtml(genre.name)}</span>`).join('')}
                </div>
                ${homepage ? `<p><strong>Website:</strong> <a href="${safeHomepage}" target="_blank" rel="noopener noreferrer">${safeHomepageDisplay}</a></p>` : ''}
                <button class="watchlist-action-btn ${inWatchlist ? 'added' : ''}" data-movie-id="${id}">
                    <i class="fas fa-bookmark"></i> ${inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </button>
            </div>
        </div>
        <div class="movie-detail-overview">
            <h3>Overview</h3>
            <p>${safeOverview}</p>
        </div>
    `;

    const detailImg = movieDetails.querySelector('.movie-detail-poster');
    detailImg.addEventListener('error', function() { this.src = PLACEHOLDER_IMG; });

    const watchlistBtn = movieDetails.querySelector('.watchlist-action-btn');
    watchlistBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await toggleWatchlist(movie, watchlistBtn);
    });

    await renderReviewSection(movie);

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
            <img src="${getPosterUrl(item.poster_path)}" alt="${escapeAttr(item.title)}">
            <div class="watchlist-item-info">
                <h4>${escapeHtml(item.title)}</h4>
                <p>Watched: ${new Date(item.watched_at).toLocaleDateString()}</p>
            </div>
        `;
        historyItem.querySelector('img').addEventListener('error', function() { this.src = PLACEHOLDER_IMG; });
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
            <img src="${getPosterUrl(item.poster_path)}" alt="${escapeAttr(item.title)}">
            <div class="watchlist-item-info">
                <h4>${escapeHtml(item.title)}</h4>
                <p>Rating: ${item.vote_average.toFixed(1)}</p>
            </div>
            <button class="remove-from-watchlist" data-movie-id="${item.movie_id}">
                <i class="fas fa-times"></i>
            </button>
        `;
        watchlistItem.querySelector('img').addEventListener('error', function() { this.src = PLACEHOLDER_IMG; });

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
        await refreshMyReviews();
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

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light');
    document.querySelector('header').classList.add('light');
}

themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    document.querySelector('header').classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

function initializeAuth() {
    onAuthStateChange(async (user, event) => {
        if (user) {
            updateAuthUI(user);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await refreshWatchlist();
                await refreshWatchHistory();
                await refreshMyReviews();
            }
        } else {
            updateAuthUILoggedOut();
            if (event === 'SIGNED_OUT') {
                await refreshWatchlist();
                await refreshWatchHistory();
                await refreshMyReviews();
            }
        }
    });
}

function updateAuthUI(user) {
    authContainer.innerHTML = `
        <div class="user-display">
            <span class="user-email">${escapeHtml(user.email)}</span>
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
        closeAuthModal();
        clearAuthForms();
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

let currentSelectedRating = 0;

async function renderReviewSection(movie) {
    const existingSection = movieDetails.querySelector('.review-section');
    if (existingSection) existingSection.remove();

    const user = await getCurrentUser();
    const userReview = await getUserReview(movie.id);
    const reviews = await getMovieReviews(movie.id);

    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    const reviewSection = document.createElement('div');
    reviewSection.classList.add('review-section');

    reviewSection.innerHTML = `
        <h3>Rate & Review</h3>
        ${avgRating ? `<p class="avg-rating">Community rating: <span>${avgRating}</span> / 5 (${reviews.length} review${reviews.length !== 1 ? 's' : ''})</p>` : '<p class="avg-rating">No reviews yet. Be the first!</p>'}
        ${user ? `
            <div class="review-form">
                <div class="star-rating" id="star-rating">
                    ${[1,2,3,4,5].map(i => `<i class="fas fa-star star ${userReview && userReview.rating >= i ? 'active' : ''}" data-value="${i}"></i>`).join('')}
                </div>
                <textarea id="review-text" placeholder="Write your review (optional)..." rows="3">${userReview ? escapeHtml(userReview.review_text || '') : ''}</textarea>
                <div class="review-form-actions">
                    <button id="submit-review-btn" class="review-submit-btn">${userReview ? 'Update Review' : 'Submit Review'}</button>
                    ${userReview ? '<button id="delete-review-btn" class="review-delete-btn">Delete</button>' : ''}
                </div>
                <div id="review-error" class="auth-error"></div>
            </div>
        ` : '<p class="empty-message">Sign in to leave a review</p>'}
        <div class="community-reviews" id="community-reviews"></div>
    `;

    movieDetails.appendChild(reviewSection);

    if (user) {
        currentSelectedRating = userReview ? userReview.rating : 0;

        const stars = reviewSection.querySelectorAll('.star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                currentSelectedRating = parseInt(star.dataset.value);
                stars.forEach(s => {
                    if (parseInt(s.dataset.value) <= currentSelectedRating) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });

            star.addEventListener('mouseenter', () => {
                const hoverValue = parseInt(star.dataset.value);
                stars.forEach(s => {
                    if (parseInt(s.dataset.value) <= hoverValue) {
                        s.classList.add('hover');
                    } else {
                        s.classList.remove('hover');
                    }
                });
            });
        });

        const starContainer = reviewSection.querySelector('#star-rating');
        starContainer.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('hover'));
        });

        const submitBtn = reviewSection.querySelector('#submit-review-btn');
        submitBtn.addEventListener('click', async () => {
            if (currentSelectedRating === 0) {
                reviewSection.querySelector('#review-error').textContent = 'Please select a star rating';
                return;
            }

            const reviewText = reviewSection.querySelector('#review-text').value.trim();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            const result = await saveReview(movie.id, movie.title, movie.poster_path, currentSelectedRating, reviewText);

            if (result.success) {
                showToast(result.action === 'created' ? 'Review posted!' : 'Review updated!');
                await renderReviewSection(movie);
            } else {
                reviewSection.querySelector('#review-error').textContent = result.error || 'Failed to save review';
                submitBtn.disabled = false;
                submitBtn.textContent = userReview ? 'Update Review' : 'Submit Review';
            }
        });

        const deleteBtn = reviewSection.querySelector('#delete-review-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const success = await deleteReview(movie.id);
                if (success) {
                    showToast('Review deleted');
                    await renderReviewSection(movie);
                } else {
                    reviewSection.querySelector('#review-error').textContent = 'Failed to delete review';
                }
            });
        }
    }

    renderCommunityReviews(reviews, user, movie.id);
}

function renderCommunityReviews(reviews, currentUser, movieId) {
    const container = document.getElementById('community-reviews');
    if (!container) return;

    container.innerHTML = '';

    if (reviews.length === 0) {
        container.innerHTML = '<p class="empty-message">No community reviews yet</p>';
        return;
    }

    reviews.forEach(review => {
        const isOwn = currentUser && review.user_id === currentUser.id;
 const reviewEl = document.createElement('div');
        reviewEl.classList.add('community-review');
        if (isOwn) reviewEl.classList.add('own-review');

        const stars = [1,2,3,4,5].map(i =>
            `<i class="fas fa-star ${i <= review.rating ? 'active' : ''}"></i>`
        ).join('');

        const dateStr = new Date(review.updated_at || review.created_at).toLocaleDateString();

        reviewEl.innerHTML = `
            <div class="review-header">
                <div class="review-stars">${stars}</div>
                <span class="review-author">${isOwn ? 'You' : 'User'}</span>
                <span class="review-date">${dateStr}</span>
            </div>
            ${review.review_text ? `<p class="review-text">${escapeHtml(review.review_text)}</p>` : '<p class="review-text empty">No written review</p>'}
        `;

        container.appendChild(reviewEl);
    });
}



async function refreshMyReviews() {
    const reviews = await getUserReviews();
    const container = document.getElementById('my-reviews');
    if (!container) return;

    container.innerHTML = '';

    if (reviews.length === 0) {
        container.innerHTML = '<p class="empty-message">No reviews yet</p>';
        return;
    }

    reviews.forEach(item => {
        const reviewItem = document.createElement('div');
        reviewItem.classList.add('watchlist-item');
        const stars = [1,2,3,4,5].map(i =>
            `<i class="fas fa-star ${i <= item.rating ? 'active' : ''}"></i>`
        ).join('');

        reviewItem.innerHTML = `
            <img src="${getPosterUrl(item.poster_path)}" alt="${escapeAttr(item.title)}">
            <div class="watchlist-item-info">
                <h4>${escapeHtml(item.title)}</h4>
                <div class="review-stars-small">${stars}</div>
            </div>
        `;
        reviewItem.querySelector('img').addEventListener('error', function() { this.src = PLACEHOLDER_IMG; });

        reviewItem.addEventListener('click', async () => {
            const movie = {
                id: item.movie_id,
                title: item.title,
                poster_path: item.poster_path
            };
            await showMovieDetails(movie);
        });

        container.appendChild(reviewItem);
    });
}
