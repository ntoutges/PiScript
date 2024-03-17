import { Eventer } from "./eventer";

export class ProgramCounter<Dirs extends string> extends Eventer<"advance" | "face"> {
  private x: number = 0;
  private y: number = 0;

  private minX: number = 0;
  private maxX: number = 100;
  private minY: number = 0;
  private maxY: number = 100;

  private dx: number = 1;
  private dy: number = 0;

  private readonly dirMap: Map<Dirs, [x: number, y: number]>;

  private dir: Dirs;
  
  constructor(
    dirMap: Map<Dirs, [x: number, y: number]>,
    defaultDir: Dirs
  ) {
    super();

    this.dirMap = dirMap;
    this.face(defaultDir);
  }

  setBounds(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    this.minX = Math.min(x1,x2);
    this.maxX = Math.max(x1,x2);
    this.minY = Math.min(y1,y2);
    this.maxY = Math.min(y1,y2);
  }

  advance() {
    this.trigger("advance");

    this.x = Math.min(Math.max(this.x + this.dx, this.minX), this.maxX);
    this.y = Math.min(Math.max(this.y + this.dy, this.minY), this.maxY);
  }

  face(direction: Dirs) {
    this.trigger("face");

    this.dir = direction;
    this.dx = this.dirMap.get(direction)[0];
    this.dy = this.dirMap.get(direction)[1];
  }

  matches(
    x: number | ProgramCounter<any>,
    y: number
  ) {
    if (x instanceof ProgramCounter) [x,y] = x.at(); // get x,y from other
    return this.x == x && this.y == y;
  }

  at(
    x: number | Dirs = 0,
    y: number = 0
  ): [number,number,boolean] {
    let newX: number;
    let newY: number;

    if (typeof x == "number") {
      newX = this.x + x;
      newY = this.y + y;
    }
    else {
      newX = this.x + this.dirMap.get(x)[0];
      newY = this.y + this.dirMap.get(x)[1];
    }
    return [
      Math.min(Math.max(newX, this.minX), this.maxX),
      Math.min(Math.max(newY, this.minY), this.maxY),
      newX < this.minX || newX > this.maxX || newY < this.minY || newY > this.maxY // is clamped
    ];
  }

  velocity() {
    return [this.dx, this.dy];
  }
  facing() {
    return this.dir;
  }

  set(
    x: number,
    y: number
  ) {
    this.x = x;
    this.y = y;
  }

  toString() { return `(${this.x},${this.y})`; }

  forEachDir(callback: (key: Dirs, dir: [x:number, y:number]) => void) {
    for (const [key, dir] of this.dirMap) {
      callback(key as Dirs, dir);
    }
  }
}