/*
  # Create Watch Functionality Tables

  1. New Tables
    - `watchlist` — stores movies a user wants to watch
    - `watch_history` — stores movies a user has viewed
  2. Security
    - Enable RLS on both tables
    - Owner-scoped CRUD policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id integer NOT NULL,
  title text NOT NULL,
  poster_path text,
  vote_average numeric DEFAULT 0,
  added_on timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id integer NOT NULL,
  title text NOT NULL,
  poster_path text,
  watched_at timestamptz DEFAULT now()
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own watchlist" ON watchlist;
CREATE POLICY "Users can add to own watchlist"
  ON watchlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from own watchlist" ON watchlist;
CREATE POLICY "Users can remove from own watchlist"
  ON watchlist FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own watch history" ON watch_history;
CREATE POLICY "Users can view own watch history"
  ON watch_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own watch history" ON watch_history;
CREATE POLICY "Users can add to own watch history"
  ON watch_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS watchlist_movie_id_idx ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS watch_history_user_id_idx ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS watch_history_movie_id_idx ON watch_history(movie_id);