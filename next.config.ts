import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      '@react-native-async-storage/async-storage': false,
    };
    
    // Ignore optional dependencies that cause module resolution issues
    config.externals = config.externals || [];
    config.externals.push({
      '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
    });
    
    // Ignore usb package (hardware wallet support) - not needed for web app
    if (isServer) {
      config.externals.push('usb');
    }
    
    return config;
  },
};

export default nextConfig;

