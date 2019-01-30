/**
 * Copyright 2017-2019 John Berlin <n0tan3rd@gmail.com>. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

/**
 * @type {Helper}
 */
module.exports = Helper
