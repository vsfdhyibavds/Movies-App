# MovieHub

MovieHub is a responsive web application that allows users to discover popular movies, search for specific titles, and save their favorites to a personal watchlist. The app uses the TMDB API to fetch movie data and provides an intuitive interface for browsing and managing movie collections.

## Features
🎬 Browse popular movies

🔍 Search for specific movies

❤️ Save movies to your watchlist

📱 Responsive design for all devices

🌙 Dark/Light mode toggle

🔄 Persistent watchlist using localStorage

📝 Detailed movie information in modal view

## Technologies Used
- HTML5
- CSS3
- JavaScript (ES6+)
- The Movie Database (TMDB) API
- Font Awesome for icons

## Installation
No installation required! Simply open the `index.html` file in your web browser.

To run locally:
1. Clone this repository:
   ```bash
   git clone https://github.com/vsfdhyibavds/Movies-App.git
   ```
2. Open the `index.html` file in your preferred browser.

## Usage
### Browse Movies:
- The app loads popular movies by default.
- Scroll to load more movies (infinite scroll).

### Search Movies:
- Type in the search bar and press Enter.
- Results will appear automatically.

### Manage Watchlist:
- Click the "Watchlist" button to save a movie.
- Switch to the "My Watchlist" tab to view saved movies.
- Click "Remove" to delete movies from your watchlist.

### View Details:
- Click on any movie to see more information.
- Close the modal by clicking the X or outside the box.

## File Structure
```
moviehub/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── main.js             # JavaScript functionality
└── README.md           # This file
```

## API Key Note
This app uses a free API key from TMDB. If you encounter any issues with the API, you may need to:
- Get your own API key from TMDB.
- Replace the API key in `main.js`.

## Future Improvements
- User authentication
- Rating system
- Movie recommendations
- Filtering options
- Social sharing

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
Thanks to TMDB for providing the movie data API.

Inspired by various streaming platform interfaces.

Enjoy exploring movies with Genco's Hub! 🍿