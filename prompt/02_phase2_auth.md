# Phase 2 - Auth Slice (Week 2, Member 4 leads)

**Goal**
A real user can register and log in, and the gateway validates JWTs.

**Build Order**
1. `POST /users/register` saves user, returns JWT.
2. `POST /users/login` validates password, returns JWT.
3. Gateway JWT filter validates the token and injects `X-User-Id` header.
4. Any downstream service reads `X-User-Id` and trusts it.

**End-to-End Test**
1. Register via Postman.
2. Use the returned JWT to call any protected endpoint.
3. Verify the downstream service receives `X-User-Id`.

**Done When**
- Register and login both return valid JWTs.
- Gateway blocks missing or invalid JWTs.
- `X-User-Id` is visible in a downstream service request.
