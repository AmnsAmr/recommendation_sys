# MVP Plan -- Environment and Docker

Goal: Run everything with docker-compose and confirm basic health.

Step 1: Fill .env
- Copy .env.example to .env if missing
- Fill Supabase DB URLs and credentials
- Fill Kafka credentials
- Set SVD_SIDECAR_URL=http://svd-sidecar:8000

Step 2: Start services
- docker compose up --build

Step 3: Health checks
- api-gateway: GET http://localhost:8080/actuator/health
- user-service: GET http://localhost:8081/actuator/health
- video-service: GET http://localhost:8082/actuator/health
- recommendation-service: GET http://localhost:8083/actuator/health
- sidecar: GET http://localhost:8000/health
- redis: container running

Step 4: DB connectivity sanity
- Ensure each service can connect to its schema
- If boot errors mention datasource, check SUPABASE_* vars

Common errors and fixes:
1. Kafka auth failed -> check KAFKA_SASL_USERNAME/PASSWORD
2. DNS errors -> check KAFKA_BOOTSTRAP_SERVERS
3. DB SSL errors -> ensure jdbc url uses sslmode=require
4. Sidecar not reachable -> check svd-sidecar container and port 8000

MVP optional:
- If YouTube API is not set, seed videos manually
- If R2 is not set, skip upload and use YouTube-only or seeded videos

References:
- `api-contract/04_shared_standards_and_kafka_contracts_v2.md`
- `uml/01_system_architecture.puml`
