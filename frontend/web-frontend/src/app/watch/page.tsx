"use client";

import { useState } from "react";

const videoData = {
  title: "Spring Boot REST API guide",
  description: "Learn how to build a production-ready REST API using Spring Boot. In this comprehensive tutorial, we'll cover everything from basics to advanced topics including error handling, validation, security, and deployment.",
  views: "2.1k",
  likes: 342,
  uploadedBy: "alice_dev",
  uploadedAt: "2 weeks ago",
  channel: "Alice Dev Channel",
  subscribers: "12.3k",
};

const comments = [
  {
    author: "bob123",
    avatar: "B",
    text: "Great tutorial! Finally understood how to properly structure REST APIs.",
    timestamp: "1 day ago",
    likes: 24,
  },
  {
    author: "carol_s",
    avatar: "C",
    text: "Could you do a video on Spring Security best practices?",
    timestamp: "3 hours ago",
    likes: 8,
  },
  {
    author: "dave_code",
    avatar: "D",
    text: "The error handling section was incredibly helpful!",
    timestamp: "5 hours ago",
    likes: 15,
  },
];

const recommendations = [
  { title: "Docker in 10 minutes", uploader: "carol_s", channel: "Carol's Tech", views: "5.2k" },
  { title: "Kafka streams deep dive", uploader: "alice_dev", channel: "Alice Dev Channel", views: "3.8k" },
  { title: "Microservices architecture", uploader: "dave_code", channel: "Dave Codes", views: "8.1k" },
  { title: "Database optimization tips", uploader: "eve_dev", channel: "Eve's Dev Tips", views: "2.9k" },
];

export default function WatchPage() {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main video section */}
          <div>
            {/* Video player */}
            <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-inner" />
            </div>

            {/* Video info */}
            <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h1 className="text-2xl font-semibold text-slate-100">{videoData.title}</h1>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-slate-950">
                    A
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{videoData.channel}</p>
                    <p className="text-xs text-slate-500">{videoData.subscribers} subscribers</p>
                  </div>
                </div>
                <button className="rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
                  Subscribe
                </button>
              </div>

              {/* Stats and actions */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
                <div className="flex gap-2 text-sm text-slate-400">
                  <span>{videoData.views} views</span>
                  <span>•</span>
                  <span>{videoData.uploadedAt}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setLiked(!liked)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                      liked ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    👍 {videoData.likes + (liked ? 1 : 0)}
                  </button>
                  <button
                    onClick={() => setDisliked(!disliked)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                      disliked ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    👎
                  </button>
                  <button className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700">
                    🔗 Share
                  </button>
                  <button
                    onClick={() => setSaved(!saved)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      saved ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {saved ? "✓ Saved" : "💾 Save"}
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6 border-t border-slate-800 pt-4">
                <button
                  onClick={() => setShowDescription(!showDescription)}
                  className="text-sm font-semibold text-slate-100 hover:text-slate-200"
                >
                  {showDescription ? "Show less" : "Show more"}
                </button>
                <p className={`mt-3 text-sm leading-6 text-slate-400 ${showDescription ? "" : "line-clamp-2"}`}>
                  {videoData.description}
                </p>
              </div>
            </div>

            {/* Comments section */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-slate-100">Comments</h2>

              {/* Add comment */}
              <div className="mt-6 flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
                  Y
                </div>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 rounded-full bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none focus:border focus:border-sky-400"
                />
              </div>

              {/* Comments list */}
              <div className="mt-8 space-y-6 border-t border-slate-800 pt-6">
                {comments.map((comment) => (
                  <div key={comment.author} className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
                      {comment.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-100">{comment.author}</p>
                        <p className="text-xs text-slate-500">{comment.timestamp}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{comment.text}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        <button className="hover:text-slate-300">👍 {comment.likes}</button>
                        <button className="hover:text-slate-300">👎</button>
                        <button className="hover:text-slate-300">Reply</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Recommendations */}
          <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl h-fit">
            <h2 className="px-2 text-lg font-semibold text-slate-100">Up next</h2>
            <div className="mt-4 space-y-3">
              {recommendations.map((rec) => (
                <div key={rec.title} className="flex gap-3 rounded-2xl bg-slate-950 p-3 transition hover:bg-slate-800 cursor-pointer">
                  <div className="flex h-24 w-36 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
                  <div className="flex-1 min-w-0">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-100">{rec.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{rec.channel}</p>
                    <p className="text-xs text-slate-500">{rec.views} views</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
