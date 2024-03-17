export class Eventer<types> {
  private readonly listeners = new Map<types, Array<(...args: any[]) => void>>();

  on(
    type: types,
    callback: (...args: any[]) => void
  ) {
    if (!this.listeners.has(type)) this.listeners.set(type,[]);
    this.listeners.get(type).push(callback);
  }

  trigger(
    type: types,
    ...args: any[]
  ) {
    if (this.listeners.has(type)) this.listeners.get(type).forEach(callback => callback(...args));
  }
}