/** Build-time switch: REACT_APP_STATIC=true produces a backend-free site (Cloudflare Pages, Netlify, Apache…). */
export const IS_STATIC = process.env.REACT_APP_STATIC === "true" || !process.env.REACT_APP_BACKEND_URL;
