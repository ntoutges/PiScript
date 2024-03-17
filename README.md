# PI SCRIPT
PiScript is a language built in honor of the greatest transcendental number: π (pi)

## Basic Instructions
* To run PiScript: 
  1. Install TypeScript, and type `tsc` to transpile the PiScript interpreter into JavaScript.
* Examples:
  * Example programs are given in the `examples` directory.
  * To run these: type `node ps.js exampes/<file>`.
  * Yes, PiScript is an interpreted language run by an interpreted language (node).

## Basic Structure
PiScript is built around the idea of a 2d Program Counter (PC) moving around a hexagonal grid of numbers.\

## Program Counter
* Every tick, the PC will attempt to move.
* The PC will always move to the next/previous digit of pi, depending on its direction. But, it will *never* attempt to backtrack (except with control operators).
* If no valid next/previous digit of pi is able to be found, the PC will crash.
* After the PC lands on a valid number:
  1. The current number is interpreted as the current register id.
  2. Any operators directly below the current number are executed.
* Note: As PiScript exists on a hexagonal grid, the PC can move in the following directions:
  * NW (x-1,y-1)
  * NE (x+1,y-1)
  * SW (x-1,y+1)
  * SE (x+1,y+1)
  * W  (x-1,y)
  * E  (x+1,y)
* If a number is reached where multiple directions contain valid movements, the number is treated as a branch.
* The PC does not care about obstructions in its path.
  * The string `... 5 9 2|6 5^8 9 ...` is valid.
  * But, the string `... 5 9 2E6 5 ...` is not valid, as the `E6` is interpreted as a variable, not an umber.

## Branches
A branch is any location on PiScript board which gives more than one valid directino for the PC to move towards.\
**Ex:**
```
... 9 2 6 5 3 5 8 9
             5
              8 9 7 9
```
*Assuming the PC comes from the `9 2 6 5` sequence, `3` is considered a branch with possible valid branches being the `5 8 9` to the South West (`SW`), or the `5 8 9` to the East (`E`)*
\
Branches rank possible directions by priority, and (in general), the direction with the highest priority is the direction traveled in.\
The direction priority is set as:
1. NW
2. NE
3. SW
4. SE
5. W
6. E

Notice the general pattern: (`Up`,`Down`,`Left`,`Right`).\
*First, try to go up, and test left/right, then try to go down, and test left/right. Finally, test left,right*

The branch taken is determined by the `Branch Type` of the register indicated by the current register id. More information is given in the `Operators` section.

## Operators
The basic building blocks of PiScript

### Branch Type
Whenever the PC encounteres a branchable location, it uses the current register it is on to determine its new direction. This is a state that the register remembers, and can be in one of two states:

* `p` (Value-based) - Default
  * Branches occur based on the value held in a register.
  * Given some branches, sorted in standard order (nw,ne,sw,se,w,e), the direction to be chosen will be indicated by `R % l`, where `R` is the value stored in the current register, and `l` is the amount of branches. This value is then used to determine which branch is used.
  * Ex: When encountering a branch with 3 possible values: `nw`,`ne`,`e`:
    * A value of 0,3,-3,6,-6, ... will result in choosing `nw`
    * A value of 1,4,-2,7,-5, ... will result in choosing `ne`
    * A value of 2,5,-1,8,-4, ... will result in choosing `e`
* `P` (Priority-based)
  * Branches occur based solely on the highest branch priority. The value in a register is disregarded.
  * Ex: When encountering a branch with 3 possible values `nw`,`ne`,`e`:
    * The PC will travel `nw`, as that has the highest priority.
    * Without a `nw` direction, `nw` would be chosen, as that is the next highest priorty. 

### Math
* `+` (Addition)
  * This takes some value from the register above it, adds it to the value of some variable below it, then stores the sum in the original register above it.
  * If ungrounded
    * And a variable is undefined: The value added is a random integer in the range `[0,9]`
    * And the space below is empty: The value added is a random integer in the range `[0,9]`
  * If grounded
    * And a variable is undefined: The value added is the register's numeric id (ie: register `5` + `UNDEF` = `10`, assuming `UNDEF` is undefined)
    * And a variable is empty: The value added is the register's numeric id (ie: register `4` + ` ` = `8`)
* `-` (Subtraction)
  * This takes some value from the register above it, adds it to the value of some variable below it, then stores the difference in the original register above it.
  * If ungrounded
    * And a variable is undefined: The value subtracted is a random integer in the range `[0,9]`
    * And the space below is empty: The value subtracted is a random integer in the range `[0,9]`
  * If grounded
    * And a variable is undefined: The value subtracted is the register's numeric id (ie: register `2` - `UNDEF` = `0`, assuming `UNDEF` is undefined)
    * And a variable is empty: The value subtracted is the register's numeric id (ie: register `9` - ` ` = `0`); This is a good way to zero-out a register.

### Control
All control operators can be chained down, just like the `|` operator.

* `:` (Reverse Direction)
  * By default, the PC counts up through the digits of PI (ie: 3,1,4,1,5, ...).
  * When the program encounters a `:`, it reverses the direction of the PC (ie: ... 5,1,4,1,3).
  * If already reversed, the direction of the PC will be returned to norma; (ie: 3,1,4,1,5, ...).
  * Encoundering this operator allows the PC to backtrack on the next tick.
* `>` (Reverse on Left)
  * If, in the last movement, the PC moved to the left (vertical movement does not matter), then the PC direction will be reversed, as with `:`.
  * Otherwise: nothing happens.
* `<` (Reverse on Right)
  * If, in the last movement, the PC moved to the right (vertical movement does not matter), then the PC direction will be reversed, as with `:`.
  * Otherwise: nothing happens.
* `E` (End)
  * This signifies that program execution has finished, and the program can end without causing a PC crash error.

### Assignment
* `v` (Store)
  * This stores some value from the register above into a variable below. If the value is unset, the number stored into the variable is a random number in the range `[0,9]`
* `^` (Load)
  * This stores a variable into the register above. If the variable is unset, the number stored into the variable is a random number in the range `[0,9]`

### Assignment Modifiers
All control operators can be chained down, just like the `|` operator.

* `|` (Pipe)
  * This is solely for logistics. It indicates that the desired operator is one unit below.
  * Multiple pipes can be chained downwards to move away from a crouded area.
* `.` Ground
  * This grounds an operation.
  * In general: if any register/variable is unset, it will default to the register id. (Rather than fluctuate like an ungrounded wire) 
* `@` (At)
  * This retrieves the value stored in the register/value above.
  * ex: Given that the current register is `1`, and the current register values are: `{ 1: 5, 5: 0 }`
    * 0x`@` gives the value `1` (This is the register id)
    * 1x`@` gives the value `5` (This is the value stored in register `1`)
    * 2x`@` gives the value `0` (This is the value stored in register `5`)
  * If grounded, and the register doesn't exist:
    * The value returned is the register id.
    * ex: Given that the current register is `4`, no registers are currently set, and the current operation is grounded:
      * 0x`@` gives `4` (this is unaffected by grounding)
      * 1x`@` gives `4`
    * ex: Given that the current register is `3`, the registers values are `{ 3: 2 }`, and the current operation is grounded:
      * 0x`@` gives `3` (this is unaffected by grounding)
      * 1x`@` gives `2`
      * 2x`@` gives `2` (the last register read is 2, so the value defaults to 2)


## Variables
A variable is any text starting with any character matching the REGEX pattern `/[a-z_]/i`, and which then continues with any number of characters that match the pattern `/[a-z0-9_@\[\]]/i`.\
Please note: Operators will override single-character variable names. As such, the variable `P` cannot be used, as it is the priority branch operator. *But*, the variable `Pi` can be used, as a variable of multiple characters will override any operator contained within.\

Each variable is effectively an infinite-length array.
* Each item in this array can be accessed directly using standard JS notation. ex: `var[0]`.
* Or, each item can be accessed based on the value of a register using `@` notation.
  * ex: `var@1`, Given that the register `1` holds the value `8`, is equivlent to `var[8].

Some special variables exist:
* SYS_T (**SYS**tem **T**erminal)
  * If written to, this variable outputs the number input to the screen.
  * If read from, this variable accepts user input, and returns the numeric value as its value.
    * Ex: Typing "5" returns the number 5. This only works for single digits, so typing "52" is the same as typing "5" in the context of this operation.
    * If the character is non-numeric, the value returned is 0.
* SYS_AT (**SYS**tem **A**scii **T**erminal)
  * If written to, this variable outputs the ASCII character of the number input to the screen.
    * Ex: Writting `65` will print the character `A` to the screen.
  * If read from, this variable returns the ASCII value of the character input.
    * Ex: Typing the character `a` will return the value `97`;

To access a variable, simply put any part of the variable underneath an operator.
```
  ... 3 0 7 8 1 6 ...
      v   ^ ^   ^
    SOME_LONG_VARIABLE
```
Here (assuming the PC is moving forwards), the value `3` is first stored into `SOME_LONG_VARIABLE`, then that `3` is loaded into register `7`, `8`, and `6`, as each operator points to the same variable.

## Registers
Registers are a simplified version of variables, and operate much the same as real CPU registers. Generally, registers are distinguished by their id, which exists in the range `[0,9]`. A register id is chosen based on the current digit of pi upon which the PC rests. Because registers are identified solely by their digits, their location doesn't matter.

```
3 1 4 1 5 9 2 6 5 3 5
      v ^       @
    transfer    v
              SYS_T
```
*the value `1` is output, as the register with the id `5` has been set to the value `1`. As such, setting the `5` in the sequence `1 4 1 5` modifies the value given by the `5` in the sequence `9 2 6 5`*
