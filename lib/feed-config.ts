export const FEED_CONFIG = {
  // Feed identification
  serviceDid: process.env.FEEDGEN_SERVICE_DID || "did:web:example.com",
  hostname: process.env.FEEDGEN_HOSTNAME || "feed.example.com",

  // Feed metadata
  feed: {
    recordName: "civic-impact",
    displayName: "Civic Impact Feed",
    description:
      "Surface posts about fiscal transparency, policy impact, and civic engagement—focusing on Medicare, Medicaid, SNAP, vaccinations, and voter activation.",
    avatar: "",
  },

  // Filtering keywords for civic content
  civicKeywords: [
    "medicare",
    "medicaid",
    "snap",
    "food stamps",
    "vaccination",
    "vaccine",
    "voter",
    "voting",
    "election",
    "fiscal",
    "budget",
    "policy",
    "healthcare",
    "public health",
    "social security",
    "benefits",
    "congress",
    "legislation",
    "bill",
    "transparency",
  ],

  // Domains to exclude (commercial, non-civic)
  excludedDomains: [
    "amazon.com",
    "ebay.com",
    "etsy.com",
    "shopify.com",
    "walmart.com",
    "target.com",
    "aliexpress.com",
    "temu.com",
    "shein.com",
  ],

  // Maximum posts to store in memory
  maxStoredPosts: 10000,

  // Maximum posts to return per feed request
  maxFeedLength: 50,
} as const
