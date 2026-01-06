// Browser-compatible util shim for @reown/appkit
// Provides minimal util.deprecate and util.promisify implementations

export function deprecate(fn, message) {
  if (typeof fn !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
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

export function promisify(fn) {
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

export default {
  deprecate,
  promisify,
};
