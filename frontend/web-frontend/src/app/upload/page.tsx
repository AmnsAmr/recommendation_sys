"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api, getAuthToken } from "@/lib/api";
import {
  defaultUploadCategoryId,
  uploadCategoryOptions,
} from "@/lib/video-categories";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(defaultUploadCategoryId);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("en");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const submitUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file || !title.trim()) {
      setStatus("Choose a file and title before uploading.");
      return;
    }

    if (!getAuthToken()) {
      setStatus("Sign in again before uploading. The backend needs a valid session for both upload steps.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const init = await api.initUpload({
        title: title.trim(),
        categoryId,
        description,
        language,
        tags: tags
          .split(",")
          .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
          .filter(Boolean),
      });

      await api.uploadVideoFile(init.videoId, init.uploadToken, file);
      setStatus("Upload sent to the backend. The video is waiting for admin review.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setStatus(
        message.includes("403") || message.toLowerCase().includes("forbidden")
          ? `${message}. If you recently changed auth settings, log out, log in again, then retry the upload.`
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Upload studio" eyebrow="Creator tools">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submitUpload} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Video details</h2>
          <p className="mt-1 text-sm text-slate-500">Upload metadata and file through the API gateway.</p>

          <label className="mt-6 block rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <span className="block text-lg font-black text-slate-950">{file ? file.name : "Drop video file here"}</span>
            <span className="mt-2 block text-sm text-slate-500">MP4 or MOV up to 500 MB</span>
            <span className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">Browse file</span>
            <input type="file" accept="video/*" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="field mt-2 h-12 px-4" placeholder="Give your video a clear title" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Category</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="field mt-2 h-12 px-4">
                {uploadCategoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="field mt-2 min-h-32 px-4 py-3" placeholder="Explain what viewers will learn" />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Tags</span>
              <input value={tags} onChange={(event) => setTags(event.target.value)} className="field mt-2 h-12 px-4" placeholder="spring, api, tutorial" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Language</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="field mt-2 h-12 px-4">
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
                <option value="es">Spanish</option>
              </select>
            </label>
          </div>

          {status ? <div className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">{status}</div> : null}

          <button disabled={loading} className="mt-6 h-12 w-full rounded-lg bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? "Uploading..." : "Submit for processing"}
          </button>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:h-fit">
          <h2 className="text-lg font-black text-slate-950">Publishing checklist</h2>
          <div className="mt-4 space-y-3">
            {[
              "Readable title",
              "Clear topic category",
              "Useful description",
              "Language selected",
              "Safe for moderation",
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-700">{item}</span>
                <span className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-500">Ready</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
