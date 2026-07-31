import csv
import sys
import os
import time
import re
import requests
from pathlib import Path
from dotenv import load_dotenv

# Add backend directory to path to import db
sys.path.append(str(Path(__file__).resolve().parents[1]))
from utils.db import movies_col

# Load environment variables
load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "47c14a401a1dd21a16fbc91a239518df")

def seed_movies():
    print("Checking if movies are already seeded...")
    # Paths to files (using absolute paths to be safe)
    root_dir = Path(__file__).resolve().parents[2]
    links_path = root_dir / "ml-25m" / "links.csv"
    movies_path = root_dir / "ml-25m" / "movies.csv"

    if movies_col.count_documents({}) == 0:
        print("Movies not found in DB. Starting seeding from CSV files...")
        if not links_path.exists() or not movies_path.exists():
            print(f"Error: Required MovieLens files not found at {links_path} or {movies_path}.")
            return

        # 1. Map movieId -> tmdbId from links.csv
        print("Reading links.csv mapping...")
        movie_to_tmdb = {}
        with open(links_path, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader) # Skip header
            for row in reader:
                if len(row) < 3:
                    continue
                movie_id_str, _, tmdb_id_str = row
                try:
                    m_id = int(movie_id_str)
                    t_id = int(tmdb_id_str) if tmdb_id_str.strip() else None
                    movie_to_tmdb[m_id] = t_id
                except ValueError:
                    continue
        print(f"Loaded {len(movie_to_tmdb)} link mappings.")

        # 2. Read movies.csv and build documents
        print("Reading movies.csv and preparing documents...")
        documents = []
        with open(movies_path, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader) # Skip header
            for row in reader:
                if len(row) < 3:
                    continue
                movie_id_str, title, genres_str = row
                try:
                    m_id = int(movie_id_str)
                    genres = [g.strip() for g in genres_str.split("|") if g.strip()]
                    tmdb_id = movie_to_tmdb.get(m_id, None)
                    
                    doc = {
                        "movie_id": m_id,
                        "title": title.strip(),
                        "genres": genres,
                        "tmdb_id": tmdb_id,
                        "poster_url": "" 
                    }
                    documents.append(doc)
                except ValueError:
                    continue

        # 3. Bulk insert in batches of 10,000
        total_docs = len(documents)
        print(f"Parsed {total_docs} movies. Starting bulk insertion...")
        batch_size = 10000
        for i in range(0, total_docs, batch_size):
            batch = documents[i : i + batch_size]
            movies_col.insert_many(batch)
            print(f"Inserted documents {i} to {min(i + batch_size, total_docs)}...")

        print("Movies seeding from CSV completed successfully!")
    else:
        print("Movies already seeded in MongoDB.")

    # 4. Fetch real posters from TMDB for movies
    print("\n--- Starting TMDB Poster URL Update Process ---")
    if not TMDB_API_KEY:
        print("Error: TMDB_API_KEY is not configured in .env file.")
        return

    # Find all movies that do not have a poster URL yet
    movies_to_update = list(movies_col.find({"poster_url": ""}))
    total_to_update = len(movies_to_update)
    print(f"Found {total_to_update} movies without poster_url.")

    success_count = 0
    fail_count = 0

    for idx, movie in enumerate(movies_to_update):
        movie_id = movie["movie_id"]
        title = movie["title"]
        
        # Clean title by removing trailing year (e.g. "Toy Story (1995)" -> "Toy Story")
        clean_title = re.sub(r'\s*\(\d{4}\)\s*$', '', title).strip()
        
        # We will query TMDB search movie endpoint via HTTP protocol to prevent TLS resets
        url = "http://api.themoviedb.org/3/search/movie"
        params = {
            "api_key": TMDB_API_KEY,
            "query": clean_title
        }
        
        try:
            res = requests.get(url, params=params, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if results:
                    poster_path = results[0].get("poster_path")
                    if poster_path:
                        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
                        movies_col.update_one(
                            {"movie_id": movie_id},
                            {"$set": {"poster_url": poster_url}}
                        )
                        success_count += 1
                        print(f"[{idx+1}/{total_to_update}] Updated '{title}' -> {poster_url}")
                    else:
                        fail_count += 1
                        print(f"[{idx+1}/{total_to_update}] No poster_path found for '{title}'")
                else:
                    fail_count += 1
                    print(f"[{idx+1}/{total_to_update}] No search results for '{title}' (cleaned: '{clean_title}')")
            else:
                fail_count += 1
                print(f"[{idx+1}/{total_to_update}] TMDB error {res.status_code} for '{title}'")
        except Exception as e:
            fail_count += 1
            print(f"[{idx+1}/{total_to_update}] Exception for '{title}': {e}")

        # Add 0.3 second delay between requests to avoid rate limiting
        time.sleep(0.3)

    print(f"\n--- Poster Update Completed ---")
    print(f"Success: {success_count}")
    print(f"Failed/Skipped: {fail_count}")

if __name__ == "__main__":
    seed_movies()
