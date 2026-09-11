import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The project lives on an exFAT-formatted drive, which does not support
  // real symlinks/reparse points. Webpack's persistent cache and symlink
  // resolution both call readlink() speculatively and exFAT's reparse-point
  // emulation on Windows returns EISDIR instead of EINVAL for a plain file,
  // crashing the build. Disabling both avoids those readlink() calls.
  webpack: (config) => {
    config.cache = false;
    config.resolve.symlinks = false;
    config.snapshot = {
      ...config.snapshot,
      managedPaths: [],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
