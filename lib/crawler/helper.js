module.exports = class Helper {
  static addEventListeners (emitter, events) {
    return events.map(({ eventName, handler }) =>
      Helper.addEventListener(emitter, eventName, handler)
    )
  }

  /**
   * @param {!NodeJS.EventEmitter} emitter
   * @param {string} eventName
   * @param {function(?)} handler
   * @return {{emitter: !NodeJS.EventEmitter, eventName: string, handler: function(?)}}
   */
  static addEventListener (emitter, eventName, handler) {
    emitter.on(eventName, handler)
    return { emitter, eventName, handler }
  }

  /**
   * @param {!Array<{emitter: !NodeJS.EventEmitter, eventName: string, handler: function(?)}>} listeners
   */
  static removeEventListeners (listeners) {
    if (!listeners) return
    for (const listener of listeners) {
      listener.emitter.removeListener(listener.eventName, listener.handler)
    }
    listeners.splice(0, listeners.length)
  }
}
