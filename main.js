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

getMovies(API_URL);

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

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
