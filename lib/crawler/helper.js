/*
 Squidwarc  Copyright (C) 2017-present  John Berlin <n0tan3rd@gmail.com>

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Squidwarc is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this Squidwarc.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * @desc A helper class providing utility methods
 */
class Helper {
  /**
   * @desc Register an array of eventName, eventListener pairs to an EventEmitter
   * @param {!EventEmitter} emitter - The EventEmitter to register the eventName, eventListener pairs on
   * @param {Array<{emitter: !EventEmitter, eventName: string, handler: function()}>} events - The array of eventName, eventListener pairs
   * @return {Array<{emitter: !EventEmitter, eventName: string, handler: function()}>}
   */
  static addEventListeners (emitter, events) {
    return events.map(({ eventName, handler }) =>
      Helper.addEventListener(emitter, eventName, handler)
    )
  }

  /**
   * @desc Register an eventName, eventListener pairs on an EventEmitter
   * @param {!EventEmitter} emitter - The EventEmitter to register the eventName, eventListener pairs on
   * @param {string} eventName - The name of the event to register the handler (listener) on
   * @param {function()} handler - The event listener to be registered for the event
   * @return {{emitter: !EventEmitter, eventName: string, handler: function()}}
   */
  static addEventListener (emitter, eventName, handler) {
    emitter.on(eventName, handler)
    return { emitter, eventName, handler }
  }

  /**
   * @desc Remove the listeners registered on an EventEmitter by either {@link addEventListener} or {@link addEventListeners}
   * @param {!Array<{emitter: !EventEmitter, eventName: string, handler: function()}>} listeners
   */
  static removeEventListeners (listeners) {
    if (!listeners) return
    for (const listener of listeners) {
      listener.emitter.removeListener(listener.eventName, listener.handler)
    }
    listeners.splice(0, listeners.length)
  }
}

module.exports = Helper
