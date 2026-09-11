/**
 * Workaround for an exFAT-on-Windows quirk: fs.readlink()/readlinkSync()
 * return EISDIR for a plain regular file instead of the POSIX-standard
 * EINVAL ("not a symlink"). Build tools (webpack, enhanced-resolve, etc.)
 * call readlink() speculatively to detect symlinks and only handle EINVAL/
 * ENOENT/UNKNOWN gracefully, so the unexpected EISDIR crashes the build.
 *
 * This is a drive-filesystem issue, not an application bug -- remapping the
 * error code here (loaded via NODE_OPTIONS="-r ./scripts/patch-exfat-readlink.cjs")
 * makes readlink() behave the way every caller already expects.
 */
const fs = require("fs");

function remapIsdirToEinval(err) {
  if (err && err.code === "EISDIR") {
    const remapped = new Error(err.message.replace("EISDIR", "EINVAL"));
    remapped.code = "EINVAL";
    remapped.errno = -4071; // EINVAL on Windows libuv
    remapped.syscall = err.syscall;
    remapped.path = err.path;
    throw remapped;
  }
  throw err;
}

const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function patchedReadlinkSync(...args) {
  try {
    return originalReadlinkSync.apply(fs, args);
  } catch (err) {
    remapIsdirToEinval(err);
  }
};

const originalReadlink = fs.readlink;
fs.readlink = function patchedReadlink(...args) {
  const callback = args[args.length - 1];
  if (typeof callback !== "function") {
    return originalReadlink.apply(fs, args);
  }
  const wrappedArgs = args.slice(0, -1);
  wrappedArgs.push((err, ...rest) => {
    if (err && err.code === "EISDIR") {
      try {
        remapIsdirToEinval(err);
      } catch (remapped) {
        return callback(remapped);
      }
    }
    return callback(err, ...rest);
  });
  return originalReadlink.apply(fs, wrappedArgs);
};

if (fs.promises && fs.promises.readlink) {
  const originalReadlinkPromise = fs.promises.readlink;
  fs.promises.readlink = async function patchedReadlinkPromise(...args) {
    try {
      return await originalReadlinkPromise.apply(fs.promises, args);
    } catch (err) {
      remapIsdirToEinval(err);
    }
  };
}
