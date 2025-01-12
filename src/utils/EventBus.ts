const EventType = {
  All: Symbol("EventType.All"),
};
const ListenerFlag = {
  Once: Symbol("ListenerFlag.Once"),
};
type EventType = (typeof EventType)[keyof typeof EventType];
type ListenerFlag = (typeof ListenerFlag)[keyof typeof ListenerFlag];

type DefaultEvent = Record<string | symbol, (...args: any[]) => unknown>;
type Listener<T> = T extends (...args: any[]) => unknown
  ? (...args: Parameters<T>) => unknown
  : never;

export default class EventBus<
  Events extends Record<string | symbol, any> = DefaultEvent,
> {
  #listeners: Map<keyof Events, Set<Listener<Events[keyof Events]>>>;

  constructor() {
    this.#listeners = new Map();
  }

  off<T extends keyof Events>(
    type?: EventType | T,
    listener?: Listener<Events[T]>,
  ): this {
    type ??= EventType.All;

    const clearEffect = (listener: any) =>
      void (
        ListenerFlag.Once in listener &&
        listener[ListenerFlag.Once] &&
        delete listener[ListenerFlag.Once]
      );

    if (type === EventType.All) {
      this.#listeners.values().forEach((set) => set.forEach(clearEffect));
      this.#listeners.clear();
      return this;
    }

    const set = this.#listeners.get(type);
    if (!set) return this;

    if (!listener) {
      set.values().forEach(clearEffect);
      set.clear();
      return this;
    }

    clearEffect(listener);
    set.delete(listener);

    return this;
  }

  emit<T extends keyof Events>(
    type: T,
    ...args: Parameters<Listener<Events[T]>>
  ): boolean {
    const set = this.#listeners.get(type);
    if (!set || !set.size) return false;
    set.values().forEach((listener) => {
      if (listener[ListenerFlag.Once]) this.off(type, listener);
      listener(...args);
    });
    return true;
  }

  on<T extends keyof Events>(type: T, listener: Listener<Events[T]>): this {
    let set = this.#listeners.get(type);
    if (!set) {
      set = new Set();
      this.#listeners.set(type, set);
    }
    set.add(listener);
    return this;
  }

  once<T extends keyof Events>(type: T, listener: Listener<Events[T]>): this {
    listener[ListenerFlag.Once] = true;
    return this.on(type, listener);
  }
}
