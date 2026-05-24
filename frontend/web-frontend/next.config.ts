import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function loadRootEnvFallback() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../../.env"),
  ];

  const envFile = candidates.find((candidate) => fs.existsSync(candidate));
  if (!envFile) {
    return;
  }

  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    const wrappedInDoubleQuotes = value.startsWith("\"") && value.endsWith("\"");
    const wrappedInSingleQuotes = value.startsWith("'") && value.endsWith("'");
    if (wrappedInDoubleQuotes || wrappedInSingleQuotes) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadRootEnvFallback();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
    NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH ?? "false",
    NEXT_PUBLIC_TEST_USER_ID:
      process.env.NEXT_PUBLIC_TEST_USER_ID
      ?? process.env.APP_SECURITY_TEST_USER_ID
      ?? "00000000-0000-0000-0000-000000000001",
  },
};

export default nextConfig;
