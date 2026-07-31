import csv
import sys
import os
from pathlib import Path

# Add backend directory to path to import db
sys.path.append(str(Path(__file__).resolve().parents[1]))
from utils.db import ratings_col, users_col

def seed_ratings_and_users():
    print("Checking if ratings are already seeded...")
    if ratings_col.count_documents({}) > 0:
        print("Ratings already seeded. Skipping.")
        return

    movies_path = Path(r"C:\Users\gayat\OneDrive\Desktop\MovieLens_Project\ml-25m\movies.csv")
    ratings_path = Path(r"C:\Users\gayat\OneDrive\Desktop\MovieLens_Project\ml-25m\ratings.csv")

    if not movies_path.exists() or not ratings_path.exists():
        print("Error: ml-25m files not found.")
        return

    # 1. Load movie genres
    print("Loading movie genres...")
    movie_genres = {}
    with open(movies_path, mode="r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader) # Skip header
        for row in reader:
            if len(row) < 3:
                continue
            movie_id_str, _, genres_str = row
            try:
                movie_genres[int(movie_id_str)] = [g.strip() for g in genres_str.split("|") if g.strip()]
            except ValueError:
                continue

    # 2. Parse ratings.csv (limit to first 2,000,000 ratings for performance/space)
    print("Processing ratings (up to 2,000,000 lines)...")
    ratings_to_insert = []
    
    # User aggregators
    # user_id -> {"total_sum": float, "total_count": int, "genre_sums": {genre: sum}, "genre_counts": {genre: count}}
    user_stats = {}

    limit = 2000000
    count = 0

    with open(ratings_path, mode="r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader) # Skip header
        for row in reader:
            if len(row) < 4:
                continue
            user_id_str, movie_id_str, rating_str, timestamp_str = row
            try:
                uid = int(user_id_str)
                mid = int(movie_id_str)
                rating = float(rating_str)
                ts = int(timestamp_str)
                
                # Store rating doc
                ratings_to_insert.append({
                    "user_id": uid,
                    "movie_id": mid,
                    "rating": rating,
                    "timestamp": ts
                })

                # Aggregate user stats
                if uid not in user_stats:
                    user_stats[uid] = {
                        "total_sum": 0.0,
                        "total_count": 0,
                        "genre_sums": {},
                        "genre_counts": {}
                    }
                
                stats = user_stats[uid]
                stats["total_sum"] += rating
                stats["total_count"] += 1

                # Update genre stats
                genres = movie_genres.get(mid, [])
                for g in genres:
                    stats["genre_sums"][g] = stats["genre_sums"].get(g, 0.0) + rating
                    stats["genre_counts"][g] = stats["genre_counts"].get(g, 0) + 1

                count += 1
                if count >= limit:
                    break
            except ValueError:
                continue

    # 3. Bulk insert ratings
    print(f"Parsed {len(ratings_to_insert)} ratings. Inserting into database...")
    batch_size = 20000
    for i in range(0, len(ratings_to_insert), batch_size):
        batch = ratings_to_insert[i : i + batch_size]
        ratings_col.insert_many(batch)
        print(f"Inserted ratings {i} to {min(i + batch_size, len(ratings_to_insert))}...")

    # 4. Construct and insert users
    print("Preparing user profiles...")
    user_documents = []
    for uid, stats in user_stats.items():
        avg_rating = round(stats["total_sum"] / stats["total_count"], 4)
        
        # Calculate genre affinities (average rating for that genre)
        genre_affinity = {}
        for g in stats["genre_counts"].keys():
            genre_avg = stats["genre_sums"][g] / stats["genre_counts"][g]
            genre_affinity[g] = round(genre_avg, 4)
            
        user_documents.append({
            "user_id": uid,
            "avg_rating": avg_rating,
            "genre_affinity": genre_affinity
        })

    print(f"Inserting {len(user_documents)} user profiles...")
    for i in range(0, len(user_documents), batch_size):
        batch = user_documents[i : i + batch_size]
        users_col.insert_many(batch)
        print(f"Inserted user profiles {i} to {min(i + batch_size, len(user_documents))}...")

    # Create indexes for ratings to optimize aggregation lookups
    print("Creating indexes on ratings collection...")
    ratings_col.create_index("user_id")
    ratings_col.create_index("movie_id")

    print("Ratings and Users seeding completed successfully!")

if __name__ == "__main__":
    seed_ratings_and_users()
