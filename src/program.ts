import { Eventer } from "./eventer.js";
import { ProgramCounter } from "./pc.js";
import { ProgToken, emptyToken, tokenize } from "./tokenizer.js";
import { Variable } from "./variable.js"

type dirs = "ne" | "nw" | "se" | "sw" | "w" | "e";
const dirMap = new Map<dirs, [x: number, y: number]>();
dirMap.set("nw", [-1, -1]);
dirMap.set("ne", [1, -1]);
dirMap.set("sw", [-1, 1]);
dirMap.set("se", [1, 1]);
dirMap.set("w", [-2, 0]);
dirMap.set("e", [2, 0]);

const revDirMap = new Map<dirs, dirs>();
revDirMap.set("ne", "sw");
revDirMap.set("nw", "se");
revDirMap.set("se", "nw");
revDirMap.set("sw", "ne");
revDirMap.set("e", "w");
revDirMap.set("w", "e");

export class Program extends Eventer<"branch" | "print" | "read"> {
  private readonly program: ProgToken[][];

  readonly pc = new ProgramCounter<dirs>(dirMap, "e");
  private lastFace: dirs | null = null;

  readonly vars = new Variable();
  private supressOutput = false;

  private piC = 0; // (pi) (C)ounter
  private piCV = 1; // (pi) (C)ounter (V)elocity
  readonly piRef: string;

  readonly width: number;
  readonly height: number;

  private readonly priorityBranches = new Set<number>();
  
  constructor(piRef: string, prgStr: string) {
    super();
    this.piRef = piRef;

    this.program = tokenize(prgStr);

    let maxWidth = 0;
    for (const line of this.program) { maxWidth = Math.max(maxWidth, line.length); }

    this.height = prgStr.length;
    this.width = maxWidth;

    this.pc.on("advance", () => {
      this.lastFace = this.pc.facing();
    });
    this.vars.on("set", (name: string, value: number) => {
      if (name.substring(0, 4) == "SYS_") this.handleSysCmdSet(name.substring(4), value);
    });
    this.vars.on("get", (name: string) => {
      if (name.substring(0, 4) == "SYS_") this.handleSysCmdGet(name.substring(4));
    })
  }

  get(
    offX: number = 0,
    offY: number = 0
  ) {
    const [x, y, invalid] = this.pc.at(offX, offY);
    if (invalid || y < 0 || y >= this.program.length || x < 0 || x >= this.program[y].length) return emptyToken;
    return this.program[y][x];
  }

  surroundingPath(
    offX: number = 0,
    offY: number = 0
  ) {
    const around = new Map<string, dirs[]>();
    this.pc.forEachDir((key, dir) => {
      const token = this.get(dir[0] + offX, dir[1] + offY);
      if (token.type != "path") return; // ignore non-path related for surrounding

      if (!around.has(token.value)) around.set(token.value, []);
      around.get(token.value).push(key);
    });
    return around;
  }

  // go forward one step
  tick() {
    this.piC += this.piCV;

    const char = this.piRef[this.piC]; // char to navigate towards
    const around = this.surroundingPath(); // get surrounding chars

    if (!around.has(char)) return false;
    const dirs = around.get(char); // find direction to move towards

    const revDir = revDirMap.get(this.lastFace);
    const removeIndex = dirs.indexOf(revDir); // not allowed to go backwards
    if (removeIndex >= 0) dirs.splice(removeIndex, 1);

    if (dirs.length == 0) return false; // no valid directions to go

    // insert null into first slot: if this is filled, some middleware has determined that this is the direction to go.
    // otherwise: choose where to go based on register
    dirs.splice(0, 0, null);
    if (dirs.length >= 2) this.trigger("branch", dirs); // emit to reorder this

    // default ordering is nw,ne,sw,se,e,w
    // rule: up,down,left,right; expanded into a hexagonal tiling

    if (dirs[0] !== null) this.pc.face(dirs[0]); // if first dir is set, it must be the chosen path
    else {
      const piChar = this.piChar(-this.piCV);

      if (
        dirs.length == 2
        || this.priorityBranches.has(piChar) // current branch switches based on first priority
      ) this.pc.face(dirs[1]); // face only option
      else { // choose direction based on priority
        dirs.splice(0, 1); // remove extra element
        let chosenIndex = this.vars.getRegister(piChar) % dirs.length; // wrap around
        if (chosenIndex < 0) chosenIndex += dirs.length; // bring from negative to positive
        this.pc.face(dirs[chosenIndex]); // choose direction based on register. If value is 0: choose first dir, if 1: choose second, etc. This wraps around
      }
    }
    this.pc.advance();
    return true;
  }

  piChar(offset: number = 0) {
    const index = this.piC + offset;
    if (index < 0 || index > this.piRef.length) return -1; // invalid
    return +this.piRef[index];
  }

  // go backwards through pi, starting at current position
  setDirection(
    dir: number
  ) {
    this.lastFace = null; // allowed to go backwards

    this.piCV = (dir < 0) ? -1 : (dir > 0 ? 1 : -this.piCV); // dir=0: reverse direction
  }

  private handleSysCmdSet(cmd: string, value: number) {
    switch (cmd) {
      case "T": // (T)erminal
        if (this.supressOutput) break;
        this.trigger("print", value.toString(10));
        break;
      case "AT": // (A)SCII (T)erminal
        if (this.supressOutput) break;
        const char = String.fromCharCode(value);
        if (/[a-z0-9!@#$%^&*()\-=_+,.<>/?\\|{}[\] ;:*~`'"]/i.test(char)) this.trigger("print", char);
        else if (char == "\n") this.trigger("print", "\n"); // newline
        else this.trigger("print", `\\x${value.toString(16)}`);
        break;
    }
  }

  private handleSysCmdGet(cmd: string) {
    switch (cmd) {
      // tries to turn value in terminal into a number. If it fails, returns a -1
      case "T": // (T)erminal
        this.vars.halt();
        this.trigger("read", (char: string) => {
          this.supressOutput = true; // don't print value getting set
          this.vars.set("SYS_" + cmd, (/[0-9]/.test(char)) ? +char : -1); // override value in memory
          this.supressOutput = false;
          this.vars.unhalt();
        });
        break;

      // returns ASCII value of letter in terminal
      case "AT": // (A)SCII (T)erminal
        this.vars.halt();
        this.trigger("read", (char: string) => {
          this.supressOutput = true; // don't print value getting set
          this.vars.set("SYS_" + cmd, char.charCodeAt(0)); // override value in memory
          this.supressOutput = false;
          this.vars.unhalt();
        });
        break;
    }
  }

  setBranchType(
    type: number,
    priority: boolean
  ) {
    if (priority) this.priorityBranches.add(type);
    else this.priorityBranches.delete(type);
  }
}