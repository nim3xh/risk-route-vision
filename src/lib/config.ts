export const config = {
  apiBase: import.meta.env.VITE_API_BASE || "",
  timezone: import.meta.env.VITE_TIMEZONE || "Asia/Colombo",
  useMockApi: import.meta.env.VITE_USE_MOCK_API === "true" || !import.meta.env.VITE_API_BASE,
  
  // Ginigathena domain bbox (approximate)
  domain: {
    center: { lat: 7.3167, lng: 80.5333 },
    bounds: {
      minLon: 80.48,
      minLat: 7.28,
      maxLon: 80.58,
      maxLat: 7.35,
    },
  },
} as const;
