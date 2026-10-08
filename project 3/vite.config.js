import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set base to "/<your-repo-name>/" if you deploy to GitHub Pages.
export default defineConfig({ plugins: [react()], base: "./" });