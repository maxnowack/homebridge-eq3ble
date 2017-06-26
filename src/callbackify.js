export default function callbackify(fn, hook) {
  return (callback, ...args) => {
    if (hook) hook(callback, ...args)
    fn(...args).then((...results) => {
      callback(null, ...results)
    }, (err) => {
      callback(err)
    })
  }
}
