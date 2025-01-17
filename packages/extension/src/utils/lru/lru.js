/**
 * A doubly linked list-based Least Recently Used (LRU) cache. Will keep most
 * recently used items while discarding least recently used items when its limit
 * is reached.
 *
 * Licensed under MIT. Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>
 * https://github.com/rsms/js-lru
 *
 * Illustration of the design:
 *
 *       entry             entry             entry             entry
 *       ______            ______            ______            ______
 *      | head |.newer => |      |.newer => |      |.newer => | tail |
 *      |  A   |          |  B   |          |  C   |          |  D   |
 *      |______| <= older.|______| <= older.|______| <= older.|______|
 *
 *  removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
 */

const NEWER = Symbol('newer')
const OLDER = Symbol('older')

export class LRUMap {
  constructor (limit) {
    this.size = 0
    this.limit = limit
    // eslint-disable-next-line no-multi-assign
    this.oldest = this.newest = void 0
    this._keymap = new Map()
  }

  _markEntryAsUsed (entry) {
    if (entry === this.newest) {
      // Already the most recenlty used entry, so no need to update the list
      return
    }

    // HEAD--------------TAIL
    //   <.older   .newer>
    //  <--- add direction --
    //   A  B  C  <D>  E
    if (entry[NEWER]) {
      if (entry === this.oldest) {
        this.oldest = entry[NEWER]
      }
      entry[NEWER][OLDER] = entry[OLDER] // C <-- E.
    }
    if (entry[OLDER]) {
      entry[OLDER][NEWER] = entry[NEWER] // C. --> E
    }
    entry[NEWER] = void 0 // D --x
    entry[OLDER] = this.newest // D. --> E
    if (this.newest) {
      this.newest[NEWER] = entry // E. <-- D
    }
    this.newest = entry
  }

  get (key) {
    // First, find our cache entry
    const entry = this._keymap.get(key)
    if (!entry) return // Not cached. Sorry.
    // As <key> was found in the cache, register it as being requested recently
    this._markEntryAsUsed(entry)
    return entry.value
  }

  set (key, value) {
    let entry = this._keymap.get(key)
    if (entry) {
      // update existing
      entry.value = value
      this._markEntryAsUsed(entry)
      return this
    }

    // new entry
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    this._keymap.set(key, entry = new Entry(key, value))

    if (this.newest) {
      // link previous tail to the new tail (entry)
      this.newest[NEWER] = entry
      entry[OLDER] = this.newest
    } else {
      // we're first in -- yay
      this.oldest = entry
    }

    // add new entry to the end of the linked list -- it's now the freshest entry.
    this.newest = entry
    ++this.size
    if (this.size > this.limit) {
      // we hit the limit -- remove the head
      this.shift()
    }

    return this
  }

  shift () {
    // todo: handle special case when limit == 1
    const entry = this.oldest
    if (entry) {
      if (this.oldest[NEWER]) {
        // advance the list
        this.oldest = this.oldest[NEWER]
        this.oldest[OLDER] = void 0
      } else {
        // the cache is exhausted
        this.oldest = void 0
        this.newest = void 0
      }
      // Remove last strong reference to <entry> and remove links from the purged
      // entry being returned:
      // eslint-disable-next-line no-multi-assign
      entry[NEWER] = entry[OLDER] = void 0
      this._keymap.delete(entry.key)
      --this.size
      return [ entry.key, entry.value ]
    }
  }

  // -------------------------------------------------------------------------------------
  // Following code (until end of class definition) is optional and can be removed without
  // breaking the core functionality.

  has (key) {
    return this._keymap.has(key)
  }
}

function Entry (key, value) {
  this.key = key
  this.value = value
  // eslint-disable-next-line no-multi-assign
  this[NEWER] = this[OLDER] = void 0
}
