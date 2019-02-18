export default function callbackify(fn) {
  return (callback, ...args) => {
    fn(...args).then((...results) => {
      if (callback) callback(null, ...results)
    }, (err) => {
      if (callback) callback(err)
    })
  }
}
