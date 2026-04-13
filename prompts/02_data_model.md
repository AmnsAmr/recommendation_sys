# MVP Plan -- Data Model

Goal: Minimal schema that supports the MVP loop.

User schema (user_schema):
```sql
create table users (
  id uuid primary key,
  email varchar(255) unique not null,
  password_hash varchar not null,
  username varchar(100) unique not null,
  display_name varchar(100) not null,
  is_active boolean default true,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table user_preferences (
  id uuid primary key,
  user_id uuid not null,
  category varchar(100) not null,
  weight float not null,
  created_at timestamp not null,
  updated_at timestamp not null
);
```

Video schema (video_schema):
```sql
create table videos (
  id varchar(100) primary key,
  title varchar(500) not null,
  description text,
  category_id varchar not null,
  duration integer,
  source varchar not null,
  youtube_id varchar,
  uploader_id uuid,
  thumbnail_url varchar,
  language varchar(10),
  view_count bigint default 0,
  like_count bigint default 0,
  dislike_count bigint default 0,
  status varchar not null,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table video_tags (
  video_id varchar not null,
  tag varchar(100) not null,
  primary key (video_id, tag)
);

create table watch_sessions (
  id uuid primary key,
  user_id uuid not null,
  video_id varchar not null,
  watch_duration integer not null,
  video_duration integer not null,
  completion_pct float not null,
  source varchar not null,
  created_at timestamp not null
);
```

Recommendation schema (recommendation_schema):
```sql
create table interactions (
  id uuid primary key,
  user_id uuid not null,
  video_id varchar not null,
  event_type varchar not null,
  score float not null,
  completion_pct float,
  created_at timestamp not null
);
create index idx_interactions_user on interactions(user_id);
create index idx_interactions_video on interactions(video_id);
create index idx_interactions_user_video on interactions(user_id, video_id);

create table item_factors (
  video_id varchar primary key,
  tags text[],
  category_id varchar,
  thumbnail_url varchar,
  language varchar(10),
  view_count bigint default 0,
  global_score float default 0,
  updated_at timestamp not null
);

create table user_category_profiles (
  id uuid primary key,
  user_id uuid not null,
  category varchar(100) not null,
  weight float not null,
  source varchar not null,
  updated_at timestamp not null
);

create table processed_events (
  event_id varchar primary key,
  processed_at timestamp not null
);
```

MVP simplifications:
1. user_factors can be empty if sidecar training is not done.
2. item_factors is mandatory for cold start and similar videos.

References:
- `uml/07_database_erd_v2.puml`
