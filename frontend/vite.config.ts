import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Backend :3000 da, CORS ochiq — proxy kerak emas.
export default defineConfig({
  plugins: [react()],
});
