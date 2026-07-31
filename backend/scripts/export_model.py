import os
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import StandardScaler

def export_models():
    # Setup paths
    root_dir = Path(__file__).resolve().parents[2]
    backend_dir = root_dir / "backend"
    models_dir = backend_dir / "models"
    models_dir.mkdir(exist_ok=True, parents=True)

    svd_src = root_dir / "svd_model.pkl"
    ctr_src = root_dir / "ctr_model.pkl"
    ctr_x_src = root_dir / "ctr_X.csv"

    print("--- Starting Model Export Process ---")

    # 1. Export SVD Model Components
    if svd_src.exists():
        print(f"Loading SVD model from {svd_src}...")
        with open(svd_src, "rb") as f:
            svd_data = pickle.load(f)

        U = svd_data["U"]
        sigma = svd_data["sigma"]
        Vt = svd_data["Vt"]
        user_map = svd_data["user_map"]
        movie_map = svd_data["movie_map"]

        # Save to .npy
        np.save(models_dir / "U.npy", U)
        np.save(models_dir / "sigma.npy", sigma)
        np.save(models_dir / "Vt.npy", Vt)

        # Save maps to .pkl
        with open(models_dir / "user_map.pkl", "wb") as f:
            pickle.dump(user_map, f)
        with open(models_dir / "movie_map.pkl", "wb") as f:
            pickle.dump(movie_map, f)

        print("\nSVD Components Exported:")
        print(f"  U shape: {U.shape} ({os.path.getsize(models_dir / 'U.npy') / 1024 / 1024:.2f} MB)")
        print(f"  sigma shape: {sigma.shape} ({os.path.getsize(models_dir / 'sigma.npy') / 1024:.2f} KB)")
        print(f"  Vt shape: {Vt.shape} ({os.path.getsize(models_dir / 'Vt.npy') / 1024 / 1024:.2f} MB)")
        print(f"  user_map: {len(user_map)} keys ({os.path.getsize(models_dir / 'user_map.pkl') / 1024 / 1024:.2f} MB)")
        print(f"  movie_map: {len(movie_map)} keys ({os.path.getsize(models_dir / 'movie_map.pkl') / 1024 / 1024:.2f} MB)")
    else:
        print(f"Warning: SVD model not found at {svd_src}")

    # 2. Export CTR Model Components
    if ctr_src.exists():
        print(f"\nLoading CTR model from {ctr_src}...")
        with open(ctr_src, "rb") as f:
            ctr_model = pickle.load(f)

        # Save Logistic Regression model
        with open(models_dir / "logistic_regression.pkl", "wb") as f:
            pickle.dump(ctr_model, f)
        
        print("CTR Model Exported:")
        print(f"  logistic_regression.pkl ({os.path.getsize(models_dir / 'logistic_regression.pkl') / 1024:.2f} KB)")

        # Create & Fit StandardScaler from features
        if ctr_x_src.exists():
            print(f"Fitting StandardScaler on {ctr_x_src}...")
            df_x = pd.read_csv(ctr_x_src)
            scaler = StandardScaler()
            scaler.fit(df_x)

            with open(models_dir / "scaler.pkl", "wb") as f:
                pickle.dump(scaler, f)
            print(f"  scaler.pkl ({os.path.getsize(models_dir / 'scaler.pkl') / 1024:.2f} KB)")
        else:
            print("Warning: ctr_X.csv features file not found, creating default StandardScaler.")
            scaler = StandardScaler()
            # fit on small dummy array matching features shape
            scaler.fit(np.zeros((10, 4)))
            with open(models_dir / "scaler.pkl", "wb") as f:
                pickle.dump(scaler, f)
            print(f"  scaler.pkl (dummy) ({os.path.getsize(models_dir / 'scaler.pkl') / 1024:.2f} KB)")
    else:
        print(f"Warning: CTR model not found at {ctr_src}")

    print("\n--- Export Completed Successfully ---")

if __name__ == "__main__":
    export_models()
