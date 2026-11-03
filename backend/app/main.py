from pathlib import Path

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sklearn.metrics.pairwise import cosine_similarity


# ============================================================
# 1. PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RESULT_DIR = PROJECT_ROOT / "result"

DATASET_PATH = RESULT_DIR / "news_dataset.csv"
TFIDF_PATH = RESULT_DIR / "search_tfidf.pkl"
SEARCH_MATRIX_PATH = RESULT_DIR / "search_matrix.pkl"
TITLE_MATRIX_PATH = RESULT_DIR / "title_matrix.pkl"
CLUSTERED_DATA_PATH = RESULT_DIR / "clustered_english_news.csv"


# ============================================================
# 2. FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="NewsGPT API",
    description="ML-powered news search and recommendation API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ============================================================
# 3. LOAD EXISTING ML ARTIFACTS
# ============================================================

required_files = [
    DATASET_PATH,
    TFIDF_PATH,
    SEARCH_MATRIX_PATH,
    TITLE_MATRIX_PATH,
]

missing_files = [
    str(path) for path in required_files
    if not path.exists()
]

if missing_files:
    raise FileNotFoundError(
        "Required NewsGPT files are missing:\n"
        + "\n".join(missing_files)
    )

df = pd.read_csv(DATASET_PATH)

tfidf = joblib.load(TFIDF_PATH)
search_matrix = joblib.load(SEARCH_MATRIX_PATH)
title_matrix = joblib.load(TITLE_MATRIX_PATH)

if len(df) != search_matrix.shape[0]:
    raise ValueError(
        f"Dataset has {len(df)} rows, but search matrix has "
        f"{search_matrix.shape[0]} rows."
    )

if len(df) != title_matrix.shape[0]:
    raise ValueError(
        f"Dataset has {len(df)} rows, but title matrix has "
        f"{title_matrix.shape[0]} rows."
    )

# Load cluster assignments if available.
cluster_map = {}

if CLUSTERED_DATA_PATH.exists():
    clustered_df = pd.read_csv(
        CLUSTERED_DATA_PATH,
        usecols=["article_id", "cluster"],
    )

    clustered_df = clustered_df.dropna(
        subset=["article_id", "cluster"]
    )

    cluster_map = dict(
        zip(
            clustered_df["article_id"].astype(str),
            clustered_df["cluster"],
        )
    )

print(f"NewsGPT dataset loaded: {len(df):,} articles")
print(f"TF-IDF features: {len(tfidf.get_feature_names_out()):,}")
print(f"Cluster assignments loaded: {len(cluster_map):,}")


# ============================================================
# 4. HELPER FUNCTIONS
# ============================================================

def get_article_results(scores, top_n):
    """Convert similarity scores into frontend-compatible results."""

    top_indices = scores.argsort()[::-1]

    top_indices = [
        int(i)
        for i in top_indices
        if scores[i] > 0
    ][:top_n]

    results = []

    for index in top_indices:
        article = df.iloc[index]

        title = article.get("title", "")
        description = article.get("description", "")
        source = article.get("source_name", "")
        category = article.get("category", "")
        published_at = article.get("published_at", "")
        url = article.get("url", "")

        results.append({
            "kind": "article",
            "storyId": None,
            "articleId": str(article.get("article_id", "")),
            "title": "" if pd.isna(title) else str(title),
            "description": (
                "" if pd.isna(description) else str(description)
            ),
            "category": (
                "General" if pd.isna(category) or not category
                else str(category)
            ),
            "publisher": (
                "Unknown" if pd.isna(source) or not source
                else str(source)
            ),
            "publishedAt": (
                "" if pd.isna(published_at)
                else str(published_at)
            ),
            "url": "" if pd.isna(url) else str(url),
            "score": round(float(scores[index]), 6),
            "relevance_score": round(float(scores[index]), 6),
        })

    return results


def calculate_content_scores(query):
    """Calculate similarity between the query and every article."""

    query_vector = tfidf.transform([query])

    return cosine_similarity(
        query_vector,
        search_matrix,
    ).ravel()


# ============================================================
# 5. HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "NewsGPT backend is running",
        "articles_loaded": len(df),
        "models_loaded": True,
    }


# ============================================================
# 6. NEWS SEARCH
# ============================================================

@app.get("/search")
def search_news(
    q: str = Query(..., min_length=1, max_length=300),
    top_n: int = Query(default=10, ge=1, le=50),
):
    query = q.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty.",
        )

    try:
        scores = calculate_content_scores(query)
        results = get_article_results(scores, top_n)

        return {
            "query": query,
            "count": len(results),
            "results": results,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(exc)}",
        ) from exc


# ============================================================
# 7. NEWS RECOMMENDATIONS
# ============================================================

@app.get("/recommend")
def recommend_news(
    q: str = Query(..., min_length=1, max_length=300),
    top_n: int = Query(default=10, ge=1, le=50),
):
    query = q.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Recommendation query cannot be empty.",
        )

    try:
        query_vector = tfidf.transform([query])

        content_scores = cosine_similarity(
            query_vector,
            search_matrix,
        ).ravel()

        title_scores = cosine_similarity(
            query_vector,
            title_matrix,
        ).ravel()

        # Prioritize both the article content and its title.
        final_scores = (
            0.65 * content_scores
            + 0.35 * title_scores
        )

        # Give a small bonus to articles in the best-matching
        # English article's cluster, when cluster data is available.
        if cluster_map and content_scores.max() > 0:
            best_index = int(content_scores.argmax())
            best_article_id = str(
                df.iloc[best_index].get("article_id", "")
            )

            matching_cluster = cluster_map.get(best_article_id)

            if matching_cluster is not None:
                cluster_ids = {
                    article_id
                    for article_id, cluster_id in cluster_map.items()
                    if cluster_id == matching_cluster
                }

                same_cluster = (
                    df["article_id"].astype(str)
                    .isin(cluster_ids)
                    .to_numpy()
                )

                final_scores[same_cluster] *= 1.05

        results = get_article_results(final_scores, top_n)

        return {
            "query": query,
            "count": len(results),
            "results": results,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation failed: {str(exc)}",
        ) from exc


# ============================================================
# 8. AVAILABLE CATEGORIES
# ============================================================



@app.get("/articles/{article_id}")
def get_article(article_id: str):
    """Retrieve one article using its article ID."""

    matches = df[df["article_id"].astype(str) == article_id]

    if matches.empty:
        raise HTTPException(
            status_code=404,
            detail="Article not found."
        )

    article = matches.iloc[0]

    def safe_value(column, default=""):
        value = article.get(column, default)
        return default if pd.isna(value) else str(value)

    return {
        "articleId": safe_value("article_id"),
        "title": safe_value("title", "Untitled article"),
        "description": safe_value("description"),
        "content": safe_value("content"),
        "category": safe_value("category", "News"),
        "publisher": safe_value("source_name", "Unknown publisher"),
        "publishedAt": safe_value("published_at"),
        "url": safe_value("url"),
        "imageUrl": safe_value("url_to_image"),
    }

@app.get("/categories")
def get_categories():
    if "category" not in df.columns:
        return {"categories": []}

    categories = (
        df["category"]
        .dropna()
        .astype(str)
        .str.strip()
    )

    categories = sorted(
        category
        for category in categories.unique()
        if category
    )

    return {
        "count": len(categories),
        "categories": categories,
    }