export type VideoCategoryOption = {
  id: string;
  label: string;
  legacyAliases?: string[];
};

export const videoCategoryOptions: VideoCategoryOption[] = [
  { id: "film-animation", label: "Film & Animation" },
  { id: "autos-vehicles", label: "Autos & Vehicles" },
  { id: "music", label: "Music" },
  { id: "pets-animals", label: "Pets & Animals" },
  { id: "sports", label: "Sports", legacyAliases: ["Sport"] },
  { id: "travel-events", label: "Travel & Events", legacyAliases: ["Travel"] },
  { id: "gaming", label: "Gaming" },
  { id: "people-blogs", label: "People & Blogs" },
  { id: "comedy", label: "Comedy" },
  { id: "entertainment", label: "Entertainment" },
  { id: "news-politics", label: "News & Politics" },
  { id: "howto-style", label: "Howto & Style", legacyAliases: ["Fashion", "Food", "Design"] },
  { id: "education", label: "Education" },
  {
    id: "science-technology",
    label: "Science & Technology",
    legacyAliases: ["Backend", "Frontend", "AI", "Data", "DevOps"],
  },
  { id: "nonprofits-activism", label: "Nonprofits & Activism" },
];

const homepageRootCategory = "For you";
const categoryById = new Map(videoCategoryOptions.map((category) => [category.id, category]));

const aliasToId = new Map<string, string>();
videoCategoryOptions.forEach((category) => {
  aliasToId.set(category.id.toLowerCase(), category.id);
  aliasToId.set(category.label.toLowerCase(), category.id);
  category.legacyAliases?.forEach((alias) => aliasToId.set(alias.toLowerCase(), category.id));
});

export const homepageCategories = [homepageRootCategory, ...videoCategoryOptions.map((category) => category.label)];
export const registerCategoryOptions = videoCategoryOptions;
export const uploadCategoryOptions = videoCategoryOptions;
export const featuredNavCategories = ["Entertainment", "Music", "Science & Technology"];
export const defaultRegisterInterestIds = ["music", "science-technology"];
export const defaultUploadCategoryId = "science-technology";
export const forYouCategoryLabel = homepageRootCategory;

export function resolveVideoCategoryId(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const mapped = aliasToId.get(trimmed.toLowerCase());
  if (mapped) {
    return mapped;
  }

  const slug = trimmed
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return categoryById.has(slug) ? slug : null;
}

export function formatVideoCategoryLabel(value?: string | null) {
  const resolvedId = resolveVideoCategoryId(value);
  if (resolvedId) {
    return categoryById.get(resolvedId)?.label ?? humanizeSlug(resolvedId);
  }

  if (!value) {
    return "Video";
  }

  return humanizeSlug(value);
}

function humanizeSlug(value: string) {
  return value
    .trim()
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
