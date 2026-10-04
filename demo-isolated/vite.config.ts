import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      fs: { strict: true, allow: [__dirname, path.resolve(__dirname, '../node_modules')] },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : { port: 24679 },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        // Runtime data writes must not trigger a browser reload.
        ignored: [
          '**/leads.json',
          '**/sales_members.json',
          '**/crm_settings.json',
          '**/chat_messages.json',
          '**/system_logs.json',
          '**/zalo_templates.json',
          '**/firestore_quota.json',
          '**/custom_fields.json',
          '**/kpi_targets.json',
          '**/feature_flags.json',
          '**/ui_configs.json',
          '**/appointments.json',
          '**/transfer_requests.json',
        ],
      },
    },
  };
});
