import { defineConfig } from 'vite';

export default defineConfig({
    server: {
    // listen on 0.0.0.0 (all network interfaces)
    host: '0.0.0.0',

    // choose your port (default is 5173)
    port: 5173,

    // fail if port is already in use
    strictPort: true,

    // (optional) don’t automatically open a browser on start
    open: false,
  },
});
