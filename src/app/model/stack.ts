import { Block } from "./block";

export class Stack {
    stack: Block[] = [];
    push(node: Block) {
        this.stack.push(node);
    };
    pop(): Block {
        return this.stack.splice(-1)[0];
    };
    get(): Block {
        return this.stack[this.stack.length - 1];
    }
    empty(): boolean {
        return this.stack.length <= 0;
    }
    reset() {
        this.stack.splice(0);
    }
    toString(): string {
        if (this.empty()) {
            return "EMPTY";
        } else {
            return this.get().toString();
        }
    }
}