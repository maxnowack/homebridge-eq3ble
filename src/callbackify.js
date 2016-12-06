export default function callbackify(fn) {
  return (callback, ...args) => {
    fn(...args).then((...results) => {
      callback(null, ...results)
    }, (err) => {
      callback(err)
    })
  }
}
