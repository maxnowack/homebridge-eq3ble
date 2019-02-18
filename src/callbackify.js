// copied from https://github.com/nfarina/homebridge-tesla/blob/247b5584cc77b79e2aea6b48e265a60e27ad9a80/src/util/callbackify.ts
export default function callbackify(func) {
  return (...args) => {
    const onlyArgs = []
    let maybeCallback = null

    args.forEach((arg) => {
      if (typeof maybeCallback === 'function') return
      if (typeof arg === 'function') {
        maybeCallback = arg
        return
      }
      onlyArgs.push(arg)
    })

    if (!maybeCallback) {
      throw new Error('Missing callback parameter!')
    }

    const callback = maybeCallback

    func(...onlyArgs)
      .then(data => callback(null, data))
      .catch(err => callback(err))
  }
}
