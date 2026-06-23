import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.infinityknowledge.dragonBlaster",
  appName: "Cute Dragon Blaster",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;
