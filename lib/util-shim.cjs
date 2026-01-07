// Browser-compatible util shim for @reown/appkit
// Provides minimal util.deprecate and util.promisify implementations

console.log('[util-shim.cjs] Loading browser-compatible util shim');

function deprecate(fn, message) {
  // Return identity function if fn is not a function (defensive)
  if (typeof fn !== 'function') {
    console.warn(`[util-shim] deprecate() called with non-function:`, typeof fn);
    return fn; // Just return the value as-is
  }
  let warned = false;
  return function deprecated(...args) {
    if (!warned) {
      warned = true;
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(message);
      }
    }
    return fn.apply(this, args);
  };
}

function promisify(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }
  return function promisified(...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, ...values) => {
        if (err) {
          reject(err);
        } else {
          resolve(values.length === 1 ? values[0] : values);
        }
      });
    });
  };
}

// Export as CommonJS module for webpack
module.exports = {
  deprecate,
  promisify,
};
