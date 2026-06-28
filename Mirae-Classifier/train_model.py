"""
Mirae Intelligence Engine — Model Training Script
===================================================
Trains 3 scikit-learn classifiers on synthetic email data:
  1. detector_model.pkl  — binary: relevant (1) vs. irrelevant (0)
  2. category_model.pkl  — multi-class: Jobs / Hackathons / Others
  3. status_model.pkl    — multi-class: fine-grained status per category
A single shared TfidfVectorizer is saved as vectorizer.pkl.
"""

import os
import pickle
import json

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

# ---------------------------------------------------------------------------
# 1.  Synthetic dataset
# ---------------------------------------------------------------------------

def _load_dataset():
    with open("training_data.json", "r", encoding="utf-8") as f:
        return json.load(f)

def _build_dataset():
    """Return (texts, detector_labels, category_labels, status_labels).

    For non-relevant emails category_labels and status_labels are set to
    'Irrelevant' / 'Not Relevant' respectively (they won't be used for
    training the category/status models).
    """
    data = _load_dataset()
    texts, det_labels, cat_labels, stat_labels = [], [], [], []

    # Non-relevant
    for text in data.get("NON_RELEVANT", []):
        texts.append(text)
        det_labels.append(0)
        cat_labels.append("Irrelevant")
        stat_labels.append("Not Relevant")

    # Jobs
    for text, status in data.get("JOBS", []):
        texts.append(text)
        det_labels.append(1)
        cat_labels.append("Jobs")
        stat_labels.append(status)

    # Hackathons
    for text, status in data.get("HACKATHONS", []):
        texts.append(text)
        det_labels.append(1)
        cat_labels.append("Hackathons")
        stat_labels.append(status)

    # Others
    for text, status in data.get("OTHERS", []):
        texts.append(text)
        det_labels.append(1)
        cat_labels.append("Others")
        stat_labels.append(status)

    return texts, det_labels, cat_labels, stat_labels


# ---------------------------------------------------------------------------
# 2.  Train & save
# ---------------------------------------------------------------------------

def main():
    texts, det_labels, cat_labels, stat_labels = _build_dataset()

    print(f"Total samples : {len(texts)}")
    print(f"  Non-relevant: {det_labels.count(0)}")
    print(f"  Relevant    : {det_labels.count(1)}")
    print(f"  Jobs        : {cat_labels.count('Jobs')}")
    print(f"  Hackathons  : {cat_labels.count('Hackathons')}")
    print(f"  Others      : {cat_labels.count('Others')}")
    print()

    # ── Shared vectorizer ─────────────────────────────────────────────────
    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=3000,
    )
    X_all = vectorizer.fit_transform(texts)

    # ── Model 1: Detector (binary) ───────────────────────────────────────
    detector = LogisticRegression(
        class_weight="balanced",
        max_iter=500,
    )
    detector.fit(X_all, det_labels)
    det_pred = detector.predict(X_all)
    det_acc = accuracy_score(det_labels, det_pred)
    print(f"Detector  training accuracy: {det_acc:.4f}")

    # ── Model 2: Category (multi-class, relevant emails only) ────────────
    relevant_idx = [i for i, d in enumerate(det_labels) if d == 1]
    X_relevant = X_all[relevant_idx]
    y_cat = [cat_labels[i] for i in relevant_idx]

    category_model = LogisticRegression(
        class_weight="balanced",
        max_iter=500,
    )
    category_model.fit(X_relevant, y_cat)
    cat_pred = category_model.predict(X_relevant)
    cat_acc = accuracy_score(y_cat, cat_pred)
    print(f"Category  training accuracy: {cat_acc:.4f}")

    # ── Model 3: Status (multi-class, relevant emails only) ──────────────
    y_stat = [stat_labels[i] for i in relevant_idx]

    status_model = LogisticRegression(
        class_weight="balanced",
        max_iter=500,
    )
    status_model.fit(X_relevant, y_stat)
    stat_pred = status_model.predict(X_relevant)
    stat_acc = accuracy_score(y_stat, stat_pred)
    print(f"Status    training accuracy: {stat_acc:.4f}")

    # ── Persist artefacts ─────────────────────────────────────────────────
    out_dir = os.path.dirname(os.path.abspath(__file__))
    artefacts = {
        "vectorizer.pkl": vectorizer,
        "detector_model.pkl": detector,
        "category_model.pkl": category_model,
        "status_model.pkl": status_model,
    }
    for fname, obj in artefacts.items():
        path = os.path.join(out_dir, fname)
        with open(path, "wb") as fh:
            pickle.dump(obj, fh)
        print(f"Saved {path}")

    print("\n[OK] All models trained and saved successfully.")


if __name__ == "__main__":
    main()
