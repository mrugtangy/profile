import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faGithub, 
  faDiscord, 
  faInstagram, 
  faTwitter, 
  faYoutube,
  faTiktok
} from "@fortawesome/free-brands-svg-icons";
import { 
  faGlobe, 
  faExternalLinkAlt, 
  faShoppingBag,
  faGhost
} from "@fortawesome/free-solid-svg-icons";

export const ASSETS = {
  BANNER: "/imgs/bg_banner.png",
  PROFILE: "/imgs/tangy.png",
  LOGO: "/imgs/LOGO_TANGY_BLK.png"
};

export const QUOTES = [
  "not sure if siddy is gonna see this 🤭",
  "luv u ma siddy mwahhh 😘",
  "delulu is the solulu!",
  "cause you're my pretty...",
  "mium 😋"
];

export const SOCIAL_LINKS = [
  { icon: faGithub, link: "#", label: "GitHub" },
  { icon: faDiscord, link: "#", label: "Discord" },
  { icon: faInstagram, link: "#", label: "Instagram" },
  { icon: faTwitter, link: "#", label: "Twitter" },
  { icon: faYoutube, link: "#", label: "YouTube" },
  { icon: faTiktok, link: "#", label: "TikTok" } 
];

export const COMMUNITIES = [
  {
    banner: "https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&q=80&w=400",
    profile: "https://images.unsplash.com/photo-1613323593608-abc90fec84ff?auto=format&fit=crop&q=80&w=100",
    title: "tangy.",
    description: "A fun Genshin-themed Gaming Community! Looking for a place to chill and make international friends?",
    link: "#",
    icon: faDiscord // MessageCircle equivalent
  },
  {
    banner: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400",
    profile: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=100",
    title: "r/Whirl",
    description: "Just a unique subreddit I made. It's a quiet space for personal thoughts and experiments.",
    link: "#",
    icon: faGlobe
  },
  {
    banner: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=400",
    profile: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=100",
    title: "Realistic Reality",
    description: "A private but public instagram group where only some people can join. Real vibes only.",
    link: "#",
    icon: faInstagram
  }
];

export const REFERRALS = [
  {
    banner: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=400",
    profile: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=100",
    title: "Hosting Deal",
    description: "Get 20% off your first year of premium hosting. Perfect for starting your portfolio!",
    link: "#",
    icon: faExternalLinkAlt
  },
  {
    banner: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=400",
    profile: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&q=80&w=100",
    title: "VPN Discount",
    description: "Secure your internet connection with this exclusive deal for my followers.",
    link: "#",
    icon: faExternalLinkAlt
  },
  {
    banner: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400",
    profile: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=100",
    title: "Asset Bundle",
    description: "Download 50+ free UI icons and assets for your next web project.",
    link: "#",
    icon: faShoppingBag
  }
];

export const SETUP_ITEMS = [
  {
    image: "https://images.unsplash.com/photo-1612831669680-8f67b2ef7c4b?auto=format&fit=crop&q=80&w=300",
    title: "EasySMX Controller",
    description: "Tactile wireless controller with responsive buttons."
  },
  {
    image: "https://images.unsplash.com/photo-1581093588401-34577a4b9f87?auto=format&fit=crop&q=80&w=300",
    title: "Wireless Mouse",
    description: "Precision tracking for work and games."
  },
  {
    image: "https://images.unsplash.com/photo-1600180758896-bdcd3e9e5140?auto=format&fit=crop&q=80&w=300",
    title: "Gaming Headset",
    description: "Crystal clear audio for late night sessions."
  },
  {
    image: "https://images.unsplash.com/photo-1606813903780-8c0bdbffcf0d?auto=format&fit=crop&q=80&w=300",
    title: "Ultrawide Monitor",
    description: "Perfect for multitasking and immersive gaming."
  }
];

export const PROJECTS = [
  {
    banner: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=400",
    profile: "https://images.unsplash.com/photo-1561736778-92e52a7769ef?auto=format&fit=crop&q=80&w=100",
    title: "AI Studio Demo",
    description: "An incredibly fast, flexible and automated web portfolio workspace.",
    link: "#"
  }
];

export const PROFILE_CONFIG = {
  name: "SHIVAM",
  systemId: "#727",
  country: "Mauritius ",
  birthDate: "2007-08-23",
  status: "IN LOVE 🖤",
  interests: "- Tech Lover\n- Gamer\n- Chill Creator",
  skills: "- Android • Windows • Linux\n- Web & UI Design",
  games: "- Genshin Impact\n- Minecraft\n- Roblox\n- GTA V\n- PUBG Mobile",
  footerQuote: "Encrypted love code // made by tangy"
};

export const EXAMPLE_CONFIG = {
  profileConfig: PROFILE_CONFIG,
  quotes: QUOTES,
  mainPage: {
    pfp: ASSETS.PROFILE,
    banner: ASSETS.BANNER,
    title: "**SHIVAM** @TANGY"
  },
  setup: SETUP_ITEMS.map(s => ({
    banner: s.image,
    profile: s.image,
    title: s.title,
    description: s.description,
    link: "#"
  })),
  projects: PROJECTS.map(p => ({
    banner: p.banner,
    profile: p.profile,
    title: p.title,
    description: p.description,
    link: p.link
  })),
  communities: COMMUNITIES.map(c => ({
    banner: c.banner,
    profile: c.profile,
    title: c.title,
    description: c.description,
    link: c.link
  })),
  referrals: REFERRALS.map(r => ({
    banner: r.banner,
    profile: r.profile,
    title: r.title,
    description: r.description,
    link: r.link
  })),
  links: [
    {
      banner: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=400",
      profile: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=100",
      title: "My Portfolio",
      description: "Check out my latest design work and projects.",
      link: "#"
    }
  ],
  contact: {
    email: "shivam@example.com",
    telegram: "@tangy_shivam",
    description: "Feel free to reach out for collaborations or just a chat!"
  },
  errorPages: {
    "400": "Oops! Something went wrong with the data sent. Let's try that again from the start.",
    "401": "Hold up! You need to be logged in to see this corner of the universe.",
    "403": "Access Denied. This area is strictly off-limits for your current clearance level.",
    "404": "Looks like you've wandered into the void. This page doesn't exist (yet!).",
    "503": "We're currently refilling the juice. The system is under maintenance or overloaded."
  },
  donations: {
    cryptoDescription: "Supporting me via crypto is deeply appreciated! Please ensure you send the correct asset to the corresponding network.",
    localMethodsDescription: "For local supporters in Mauritius, you can use the following methods.",
    crypto: [
      {
        network: "Ethereum (ERC20)",
        address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
      },
      {
        network: "Bitcoin",
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
      }
    ],
    other: [
      {
        icon: "fa-brands fa-paypal",
        title: "PayPal",
        url: "https://paypal.me/tangy"
      },
      {
        icon: "fa-solid fa-mug-hot",
        title: "Buy Me a Coffee",
        url: "https://buymeacoffee.com/tangy"
      },
      {
        icon: "fa-solid fa-heart",
        title: "Ko-fi",
        url: "https://ko-fi.com/tangy"
      }
    ],
    localMethods: [
      {
        provider: "MCB Juice",
        address: "51234567",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=51234567"
      }
    ]
  },
  configs: {
    turnstileSiteKey: "1x00000000000000000000AA",
    googleAdsClient: ""
  }
};

export const INITIAL_CONFIG = {
  profileConfig: {
    name: "",
    systemId: "",
    country: "",
    birthDate: "",
    status: "",
    interests: "",
    skills: "",
    games: "",
    footerQuote: ""
  },
  quotes: [],
  mainPage: {
    pfp: "",
    banner: "",
    title: ""
  },
  setup: [],
  projects: [],
  communities: [],
  referrals: [],
  links: [],
  contact: {
    email: "",
    telegram: "",
    description: ""
  },
  errorPages: {
    "400": "Oops! Something went wrong with the data sent. Let's try that again from the start.",
    "401": "Hold up! You need to be logged in to see this corner of the universe.",
    "403": "Access Denied. This area is strictly off-limits for your current clearance level.",
    "404": "Looks like you've wandered into the void. This page doesn't exist (yet!).",
    "503": "We're currently refilling the juice. The system is under maintenance or overloaded."
  },
  donations: {
    cryptoDescription: "",
    localMethodsDescription: "",
    crypto: [],
    other: [],
    localMethods: []
  },
  configs: {
    turnstileSiteKey: "",
    googleAdsClient: ""
  },
  redirects: []
};
