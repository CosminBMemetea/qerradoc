import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Default true reloads the page on every "online" event: a flaky signal
  // wiped what the technician had typed/dictated. Drafts live in IndexedDB,
  // so there is nothing to refresh.
  reloadOnOnline: false,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    // Offline-safe editor: drafts created offline (text / speak / photo)
    // open at /fise/edit?id=… — precache that static page and match it
    // regardless of query string (precache entries are all hashed/static).
    additionalManifestEntries: [
      {
        url: "/fise/edit",
        revision: process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()),
      },
    ],
    ignoreURLParametersMatching: [/.*/],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
