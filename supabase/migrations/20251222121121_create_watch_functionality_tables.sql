/*
  # Create Watch Functionality Tables

  1. New Tables
    - `watchlist`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `movie_id` (integer, TMDB movie ID)
      - `title` (text, movie title)
      - `poster_path` (text, movie poster URL)
      - `vote_average` (numeric, movie rating)
      - `added_on` (timestamptz, when added to watchlist)
    
    - `watch_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `movie_id` (integer, TMDB movie ID)
      - `title` (text, movie title)
      - `poster_path` (text, movie poster URL)
      - `watched_at` (timestamptz, when movie was watched)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to:
      - Read their own watchlist and history
      - Insert into their own watchlist and history
      - Delete from their own watchlist
*/

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id integer NOT NULL,
  title text NOT NULL,
  poster_path text,
  vote_average numeric DEFAULT 0,
  added_on timestamptz DEFAULT now()
);

-- Create watch_history table
CREATE TABLE IF NOT EXISTS watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id integer NOT NULL,
  title text NOT NULL,
  poster_path text,
  watched_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

-- Watchlist policies
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist"
  ON watchlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own watchlist"
  ON watchlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Watch history policies
CREATE POLICY "Users can view own watch history"
  ON watch_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watch history"
  ON watch_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS watchlist_movie_id_idx ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS watch_history_user_id_idx ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS watch_history_movie_id_idx ON watch_history(movie_id);