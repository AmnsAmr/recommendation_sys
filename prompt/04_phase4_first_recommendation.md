# Phase 4 - First Recommendation (Week 3-4, Member 1 leads)

**Goal**
A logged-in user gets a non-empty recommendation list based on declared interests.

**Build Order**
1. Register flow saves interests to `user_category_profiles`.
2. `GET /recommendations/{userId}` returns videos from the user's declared categories.
3. Redis cache wired: first call computes, second call hits cache.

**Done When**
- A new user can register, declare interests, and get recommendations.
- The second recommendation call hits Redis instead of recomputing.
