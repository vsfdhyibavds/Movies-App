/*
  # Create Reviews and Ratings Table

  1. New Table: `reviews`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users, defaults to authenticated user)
    - `movie_id` (integer, TMDB movie ID)
    - `rating` (integer, 1-5 star rating)
    - `review_text` (text, optional written review)
    - `title` (text, movie title at time of review — for display)
    - `poster_path` (text, movie poster path — for display)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - Unique constraint on (user_id, movie_id) — one review per user per movie

  2. Security
    - Enable RLS
    - Owner-scoped SELECT/INSERT/UPDATE/DELETE for authenticated users
    - All reviews are readable by any authenticated user (community reviews)
    - Only the owner can create/update/delete their own review
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id integer NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  title text NOT NULL,
  poster_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, movie_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all reviews (community feature)
DROP POLICY IF EXISTS "Users can view all reviews" ON reviews;
CREATE POLICY "Users can view all reviews"
  ON reviews FOR SELECT TO authenticated USING (true);

-- Users can only insert their own reviews
DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can only update their own reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own reviews
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS reviews_movie_id_idx ON reviews(movie_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews(user_id);

-- Auto-update updated_at on row update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();