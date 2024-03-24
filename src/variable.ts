import { Eventer } from "./eventer";

export class Variable extends Eventer<"set"|"get"> {
  private readonly vars = new Map<string, number>();
  private readonly registers = new Map<number, number>(); // registers identified by numeric values
  private halted = false; // set whenever waiting
  private readonly unhaltResolves: Array<() => void> = [];

  set(
    key: string,
    value: number
  ) {
    const name = this.getVarNameAndIndex(key);
    this.trigger("set", name, value);
    
    this.vars.set(name, value);
  }

  get(
    key: string,
    fallback: number = 0
  ): Promise<number> {
    return new Promise(resolve => {
      this.halted = false;
      const name = this.getVarNameAndIndex(key);
      this.trigger("get", name);
      
      if (this.halted) { // wait
        this.unhaltResolves.push(() => {
          resolve(this.vars.get(name) ?? fallback);
        });
        return;
      }
      
      resolve(this.vars.get(name) ?? fallback);
    });
  }

  has(key: string) {
    const name = this.getVarNameAndIndex(key);
    return this.vars.has(name);
  }

  hasRegister(key: number) {
    return this.registers.has(key);
  }

  // separates based on "@"
  private getVarNameAndIndex(key: string) {
    const index = key.indexOf("@");
    if (index === -1) return key; // no @

    const varName = key.substring(0,index);
    const register = +key.substring(index+1);
    
    return varName + "[" + this.getRegister(register) + "]"; // var@i saved as var[*i]
  }

  setRegister(
    key: number,
    value: number | null
  ) {
    if (value === null) this.registers.delete(key);
    else this.registers.set(key,value);
  }

  getRegister(
    key: number,
    fallback: number = null
  ) {
    return this.registers.get(key) ?? ((fallback !== null) ? fallback : Math.floor(Math.random() * 10)); // no fallback and an unset register indicates random int in the range [0,9]
  }
f
  halt() { this.halted = true; }
  unhalt() {
    if (!this.halted) return;
    this.halted = false;

    for (const resolve of this.unhaltResolves) { resolve(); }
    this.unhaltResolves.splice(0); // empty array
  }
}