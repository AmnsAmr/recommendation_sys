# Start Here

This folder breaks the project into short, step-by-step phases. Start at Phase 1, finish it, then move forward in order.

**Quick Start**
1. Copy `.env.example` to `.env` and fill in all values.
2. Start the stack.

```bash
docker compose up -d
```

3. Check that the gateway and services are reachable.

```bash
# gateway
curl http://localhost:8080/actuator/health

# user-service
curl http://localhost:8081/actuator/health

# video-service
curl http://localhost:8082/actuator/health

# recommendation-service
curl http://localhost:8083/actuator/health
```

**Team Rule**
Never let any service fall more than one phase behind another service. If someone is stuck, the team unblocks them before moving forward.

**Phase Files**
- `prompt/01_phase1_skeleton.md`
- `prompt/02_phase2_auth.md`
- `prompt/03_phase3_video_catalog.md`
- `prompt/04_phase4_first_recommendation.md`
- `prompt/05_phase5_interaction_pipeline.md`
- `prompt/06_phase6_svd.md`
- `prompt/07_phase7_remaining_features.md`
- `prompt/08_phase8_demo_prep.md`
