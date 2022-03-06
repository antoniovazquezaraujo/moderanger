export class Block {
    id: number = 0;
    initialSize = 0;
    size: number = 0;
    times: number = 0;

    constructor(opts?: Partial<Block>) {
        if (opts?.id != null) {
            this.id = opts.id
        }
        if (opts?.initialSize != null) {
            this.initialSize = opts.initialSize
        }
        if (opts?.size != null) {
            this.size = opts.size
        }
        if (opts?.times != null) {
            this.times = opts.times
        }
    }
    toString() {
        return "id:" + this.id + " initialSize:" + this.initialSize + " size:" + this.size + " times:" + this.times;
    }
}
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


export class Manager {
    stack: Stack = new Stack();
    blocks: Block[] = [
        new Block({ id: 0 }),
        new Block({ id: 1 }),
        new Block({ id: 2, initialSize: 3, size:3, times: 3 }),
        new Block({ id: 3 }),
        new Block({ id: 4 , initialSize: 2, size:2,times: 2 }),
        new Block({ id: 5 }),
        new Block({ id: 6 }),
        new Block({ id: 7 }),
        new Block({ id: 8 }),
        new Block({ id: 9 , initialSize: 1, size:1,times: 12 })
    ];
    index: number = 0;

    isRepeating(block: Block): boolean {
        return block.times != 0;
    }
    stackIsEmpty(): boolean {
        return this.stack.empty();
    }
    isInTheStack(block: Block): boolean {
        if (this.stackIsEmpty()) {
            return false;
        }
        return this.stack.get().id === block.id;
    }
    isInTheRepeatingGroup(block: Block): boolean {
        if (this.stackIsEmpty()) {
            return false;
        }
        let top: Block = this.stack.get();
        let endOfGroup = top.id + top.initialSize;
        return block.id <= endOfGroup;
    }
    stackedSizeIsEmpty(): boolean {
        if (this.stackIsEmpty()) {
            console.log("Error, stackedSize with empty stack!!!!!!!!!!");
            return false;
        }

        return this.stack.get().size === 0;
    }
    stackedTimesIsEmpty(): boolean {
        if (this.stackIsEmpty()) {
            return false;
        }
        return this.stack.get().times < 0;
    }
    play(block: Block) {
         console.log("Playing block:" + block.id + " stack:"+ this.stack.toString());
    }
    goToNextBlock(): boolean {
        this.index++;
        if (this.index == this.blocks.length) {
            return false;
        }
        return true;
    }
    goToStackedBlock() {
        //    if(stack.empty()) console.log("Error. The stack is empty!!!");
        this.index = this.stack.get().id;
    }
    push(block: Block) {
        this.stack.push(new Block(block));
    }
    pop(): Block {
        return this.stack.pop();
    }
    decStackedSize() {
        this.stack.get().size--;
    }
    decStackedTimes() {
        this.stack.get().times--;
    }
    resetStackedTimes(block: Block) {
        this.stack.get().times = block.times;
    }
    resetStackedSize(block: Block) {
        this.stack.get().size = this.stack.get().initialSize;
    }

    run() {
        this.index = 0;
        let block: Block;
        this.stack.reset(); 
        block = this.blocks[this.index];
        while (this.index < this.blocks.length) {
            if (this.isRepeating(block)) {
                if (this.isInTheStack(block)) {
                    this.decStackedTimes();
                    if (this.stackedTimesIsEmpty()) {
                        this.pop();
                        this.goToNextBlock();
                    } else {
                        this.resetStackedSize(block);
                        this.decStackedSize();
                        if(this.stackedSizeIsEmpty()){
                            this.play(block)
                            this.goToStackedBlock();
                        }else{
                            this.play(block);
                            this.goToNextBlock();
                        }
                    }
                } else {
                    this.push(block);
                }
            } else {
                this.play(block);
                if (this.stackIsEmpty()) {
                    this.goToNextBlock();
                } else {
                    this.decStackedSize();
                    if(this.stackedSizeIsEmpty()){
                        this.goToStackedBlock();
                    }else{
                        this.goToNextBlock();
                    }
                }
            }

            if (this.index < this.blocks.length) {
                block = this.blocks[this.index];
            }
        }
    }
}

