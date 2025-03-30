const API_URL = 'https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=3fd2be6f0c70a2a598f084ddfb75487c&page=1';
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCH_API = 'https://api.themoviedb.org/3/search/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query="';

const main = document.getElementById('main');
const form = document.getElementById('form');
const search = document.getElementById('search');
const modal = document.getElementById('movie-modal');
const closeBtn = document.querySelector('.close');
const movieDetails = document.getElementById('movie-details');

// Get initial movies
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

function showMovies(movies) {
    main.innerHTML = '';

    movies.forEach(movie => {
        const { title, poster_path, vote_average, overview, id } = movie;

        const movieEl = document.createElement('div');
        movieEl.classList.add('movie');
        movieEl.dataset.id = id;

        movieEl.innerHTML = `
            <img src="${IMG_PATH + poster_path}" alt="${title}">
            <div class="movie-info">
                <h3>${title}</h3>
                <span class="${getClassByRate(vote_average)}">${vote_average.toFixed(1)}</span>
            </div>
            <div class="overview">
                <h3>Overview</h3>
                ${overview || 'No overview available.'}
            </div>
        `;

        movieEl.addEventListener('click', () => {
            showMovieDetails(movie);
            addToWatchHistory(movie); // Add movie to watch history when clicked
        });
        main.appendChild(movieEl);
    });
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
    } else {
        window.location.reload();
    }
});

async function fetchSuggestions(query) {
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query=${query}`);
    const data = await response.json();
    return data.results.map(movie => movie.title);
}

function showSuggestions(suggestions) {
    clearSuggestions();
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.textContent = suggestion;
        div.addEventListener('click', () => {
            search.value = suggestion;
            clearSuggestions();
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

        displayMovieDetails(data);
    } catch (err) {
        console.error('Error fetching movie details:', err);
    }
}

function displayMovieDetails(movie) {
    displayWatchHistory(); // Update watch history display when movie details are shown
    const {
        title,
        poster_path,
        vote_average,
        overview,
        release_date,
        runtime,
        genres,
        tagline,
        homepage
    } = movie;

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
            </div>
        </div>
        <div class="movie-detail-overview">
            <h3>Overview</h3>
            <p>${overview || 'No overview available.'}</p>
        </div>
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function addToWatchHistory(movie) {
    let watchHistory = JSON.parse(localStorage.getItem('watchHistory')) || [];
    watchHistory.push(movie);
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    displayWatchHistory(); // Update the watch history display
}

function displayWatchHistory() {
    const watchHistoryContainer = document.getElementById('watch-history');
    watchHistoryContainer.innerHTML = '';
    const watchHistory = JSON.parse(localStorage.getItem('watchHistory')) || [];

    watchHistory.forEach(movie => {
        const div = document.createElement('div');
        div.textContent = movie.title; // Assuming movie has a title property
        watchHistoryContainer.appendChild(div);
    });
}

// Close modal
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if(e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// watchlist functionality
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];

function toggleWatchlist(movie) {
    const index = watchlist.findIndex(item => item.id === movie.id);

    if (index === -1) {
        watchlist.push(movie);
        showToast(`${movie.title} added to watchlist`);
    } else {
        watchlist.splice(index, 1);
        showToast(`${movie.title} removed from watchlist`);
    }
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    renderWatchlistButton(movie.id);
}

function renderWatchlistButton(movieId) {
    const buttons = document.querySelectorAll(`.watchlist-btn[data-id="${movieId}"]`);
    const isInWatchlist = watchlist.some(item => item.id === movieId);

    buttons.forEach(btn => {
        btn.innerHTML = isInWatchlist ?
            '<i class="fas fa-bookmark"></i> Remove' :
            '<i class="far fa-bookmark"></i> Watchlist';
        btn.className = `watchlist-btn ${isInWatchlist ? 'added' : ''}`;
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}
