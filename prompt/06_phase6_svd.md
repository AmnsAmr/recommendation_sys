# Phase 6 - SVD Goes Live (Week 6-7, Member 1)

**Goal**
SVD trains on real interaction data and improves recommendations.

**Build Order**
1. SVD sidecar `POST /train` called manually; verify it reads interactions and writes user/item factors.
2. Hybrid scorer in recommendation-service combines SVD score + content score.
3. Cold start logic: content-based when interactionCount < 5, hybrid after.
4. `POST /train` triggers automatically after every N new interactions.

**Done When**
- Two users with different histories get different feeds.
- Hybrid score is used for users with enough interactions.
