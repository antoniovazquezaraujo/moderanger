/* AutoGenerated Code, changes may be overwritten
* INPUT GRAMMAR:
* ///////////////////////////
* //  V:Velocity
* //  P:Pulse (bits per time)
* //  W:Width (chord density)
* //  M:Mode (chord, arpeggios, etc)
* //  O:Octave
* //  S:Scale
* //  I:Inversion
* //  K:Key (Tonality)
* //  G:Gear (timbre)
* //  C:Channel (channel, 9 is percussion)
* ////////////////////////////
* SONG:= 
*     head = PART
*     tail = {PART_SEPARATOR part = PART}*
* PART := 
*     head = BLOCK 
*     tail = {BLOCK_SEPARATOR block = BLOCK}*
* BLOCK := 
*     commandGroup = {COMMAND_GROUP} 
*     COMMAND_GROUP_SEPARATOR 
*     blockContent = {BLOCK_CONTENT}
* COMMAND_GROUP := 
*     head = COMMAND  
*     tail = {
*         COMMAND_SEPARATOR 
*         command= COMMAND 
*     }*
* COMMAND := 
*     commandType ={COMMAND_TYPE} 
*     commandValue={VALUE_ID}
* COMMAND_TYPE := 
*     commandType = '[0-9]+'
* VALUE_ID := 
*     val = '[0-9A-F]{1,2}'
* BLOCK_CONTENT:=
*     val = '[0-9\-\=\.]+'
* COMMAND_SEPARATOR := ','
* COMMAND_GROUP_SEPARATOR := ':'
* BLOCK_SEPARATOR := '\n' 
* SILENCE := '.'
* EXTENSION := '-'
* PART_SEPARATOR:='\n\n' 
*/
type Nullable<T> = T | null;
type $$RuleType<T> = () => Nullable<T>;
interface ASTNodeIntf {
    kind: ASTKinds;
}
export enum ASTKinds {
    SONG = "SONG",
    SONG_$0 = "SONG_$0",
    PART = "PART",
    PART_$0 = "PART_$0",
    BLOCK = "BLOCK",
    BLOCK_$0 = "BLOCK_$0",
    BLOCK_$1 = "BLOCK_$1",
    COMMAND_GROUP = "COMMAND_GROUP",
    COMMAND_GROUP_$0 = "COMMAND_GROUP_$0",
    COMMAND = "COMMAND",
    COMMAND_$0 = "COMMAND_$0",
    COMMAND_$1 = "COMMAND_$1",
    COMMAND_TYPE = "COMMAND_TYPE",
    VALUE_ID = "VALUE_ID",
    BLOCK_CONTENT = "BLOCK_CONTENT",
    COMMAND_SEPARATOR = "COMMAND_SEPARATOR",
    COMMAND_GROUP_SEPARATOR = "COMMAND_GROUP_SEPARATOR",
    BLOCK_SEPARATOR = "BLOCK_SEPARATOR",
    SILENCE = "SILENCE",
    EXTENSION = "EXTENSION",
    PART_SEPARATOR = "PART_SEPARATOR",
}
export interface SONG {
    kind: ASTKinds.SONG;
    head: PART;
    tail: SONG_$0[];
}
export interface SONG_$0 {
    kind: ASTKinds.SONG_$0;
    part: PART;
}
export interface PART {
    kind: ASTKinds.PART;
    head: BLOCK;
    tail: PART_$0[];
}
export interface PART_$0 {
    kind: ASTKinds.PART_$0;
    block: BLOCK;
}
export interface BLOCK {
    kind: ASTKinds.BLOCK;
    commandGroup: BLOCK_$0;
    blockContent: BLOCK_$1;
}
export type BLOCK_$0 = COMMAND_GROUP;
export type BLOCK_$1 = BLOCK_CONTENT;
export interface COMMAND_GROUP {
    kind: ASTKinds.COMMAND_GROUP;
    head: COMMAND;
    tail: COMMAND_GROUP_$0[];
}
export interface COMMAND_GROUP_$0 {
    kind: ASTKinds.COMMAND_GROUP_$0;
    command: COMMAND;
}
export interface COMMAND {
    kind: ASTKinds.COMMAND;
    commandType: COMMAND_$0;
    commandValue: COMMAND_$1;
}
export type COMMAND_$0 = COMMAND_TYPE;
export type COMMAND_$1 = VALUE_ID;
export interface COMMAND_TYPE {
    kind: ASTKinds.COMMAND_TYPE;
    commandType: string;
}
export interface VALUE_ID {
    kind: ASTKinds.VALUE_ID;
    val: string;
}
export interface BLOCK_CONTENT {
    kind: ASTKinds.BLOCK_CONTENT;
    val: string;
}
export type COMMAND_SEPARATOR = string;
export type COMMAND_GROUP_SEPARATOR = string;
export type BLOCK_SEPARATOR = string;
export type SILENCE = string;
export type EXTENSION = string;
export type PART_SEPARATOR = string;
export class Parser {
    private readonly input: string;
    private pos: PosInfo;
    private negating: boolean = false;
    private memoSafe: boolean = true;
    constructor(input: string) {
        this.pos = {overallPos: 0, line: 1, offset: 0};
        this.input = input;
    }
    public reset(pos: PosInfo) {
        this.pos = pos;
    }
    public finished(): boolean {
        return this.pos.overallPos === this.input.length;
    }
    public clearMemos(): void {
    }
    public matchSONG($$dpth: number, $$cr?: ErrorTracker): Nullable<SONG> {
        return this.run<SONG>($$dpth,
            () => {
                let $scope$head: Nullable<PART>;
                let $scope$tail: Nullable<SONG_$0[]>;
                let $$res: Nullable<SONG> = null;
                if (true
                    && ($scope$head = this.matchPART($$dpth + 1, $$cr)) !== null
                    && ($scope$tail = this.loop<SONG_$0>(() => this.matchSONG_$0($$dpth + 1, $$cr), true)) !== null
                ) {
                    $$res = {kind: ASTKinds.SONG, head: $scope$head, tail: $scope$tail};
                }
                return $$res;
            });
    }
    public matchSONG_$0($$dpth: number, $$cr?: ErrorTracker): Nullable<SONG_$0> {
        return this.run<SONG_$0>($$dpth,
            () => {
                let $scope$part: Nullable<PART>;
                let $$res: Nullable<SONG_$0> = null;
                if (true
                    && this.matchPART_SEPARATOR($$dpth + 1, $$cr) !== null
                    && ($scope$part = this.matchPART($$dpth + 1, $$cr)) !== null
                ) {
                    $$res = {kind: ASTKinds.SONG_$0, part: $scope$part};
                }
                return $$res;
            });
    }
    public matchPART($$dpth: number, $$cr?: ErrorTracker): Nullable<PART> {
        return this.run<PART>($$dpth,
            () => {
                let $scope$head: Nullable<BLOCK>;
                let $scope$tail: Nullable<PART_$0[]>;
                let $$res: Nullable<PART> = null;
                if (true
                    && ($scope$head = this.matchBLOCK($$dpth + 1, $$cr)) !== null
                    && ($scope$tail = this.loop<PART_$0>(() => this.matchPART_$0($$dpth + 1, $$cr), true)) !== null
                ) {
                    $$res = {kind: ASTKinds.PART, head: $scope$head, tail: $scope$tail};
                }
                return $$res;
            });
    }
    public matchPART_$0($$dpth: number, $$cr?: ErrorTracker): Nullable<PART_$0> {
        return this.run<PART_$0>($$dpth,
            () => {
                let $scope$block: Nullable<BLOCK>;
                let $$res: Nullable<PART_$0> = null;
                if (true
                    && this.matchBLOCK_SEPARATOR($$dpth + 1, $$cr) !== null
                    && ($scope$block = this.matchBLOCK($$dpth + 1, $$cr)) !== null
                ) {
                    $$res = {kind: ASTKinds.PART_$0, block: $scope$block};
                }
                return $$res;
            });
    }
    public matchBLOCK($$dpth: number, $$cr?: ErrorTracker): Nullable<BLOCK> {
        return this.run<BLOCK>($$dpth,
            () => {
                let $scope$commandGroup: Nullable<BLOCK_$0>;
                let $scope$blockContent: Nullable<BLOCK_$1>;
                let $$res: Nullable<BLOCK> = null;
                if (true
                    && ($scope$commandGroup = this.matchBLOCK_$0($$dpth + 1, $$cr)) !== null
                    && this.matchCOMMAND_GROUP_SEPARATOR($$dpth + 1, $$cr) !== null
                    && ($scope$blockContent = this.matchBLOCK_$1($$dpth + 1, $$cr)) !== null
                ) {
                    $$res = {kind: ASTKinds.BLOCK, commandGroup: $scope$commandGroup, blockContent: $scope$blockContent};
                }
                return $$res;
            });
    }
    public matchBLOCK_$0($$dpth: number, $$cr?: ErrorTracker): Nullable<BLOCK_$0> {
        return this.matchCOMMAND_GROUP($$dpth + 1, $$cr);
    }
    public matchBLOCK_$1($$dpth: number, $$cr?: ErrorTracker): Nullable<BLOCK_$1> {
        return this.matchBLOCK_CONTENT($$dpth + 1, $$cr);
    }
    public matchCOMMAND_GROUP($$dpth: number, $$cr?: ErrorTracker): Nullable<COMMAND_GROUP> {
        return this.run<COMMAND_GROUP>($$dpth,
            () => {
                let $scope$head: Nullable<COMMAND>;
                let $scope$tail: Nullable<COMMAND_GROUP_$0[]>;
                let $$res: Nullable<COMMAND_GROUP> = null;
                if (true
                    && ($scope$head = this.matchCOMMAND($$dpth + 1, $$cr)) !== null
                    && ($scope$tail = this.loop<COMMAND_GROUP_$0>(() => this.matchCOMMAND_GROUP_$0($$dpth + 1, $$cr), true)) !== null
                ) {
                    $$res = {kind: ASTKinds.COMMAND_GROUP, head: $scope$head, tail: $scope$tail};
                }
                return $$res;
            });
    }
    public matchCOMMAND_GROUP_$0($$dpth: number, $$cr?: ErrorTracker): Nullable<COMMAND_GROUP_$0> {
        return this.run<COMMAND_GROUP_$0>($$dpth,
            () => {
                let $scope$command: Nullable<COMMAND>;
                let $$res: Nullable<COMMAND_GROUP_$0> = null;
                if (true
                    && this.matchCOMMAND_SEPARATOR($$dpth + 1, $$cr) !== null
                    && ($scope$command = this.matchCOMMAND($$dpth + 1, $$cr)) !== null
                ) {
                    $$res = {kind: ASTKinds.COMMAND_GROUP_$0, command: $scope$command};
                }
                return $$res;
            });
    }
    public matchCOMMAND($$dpth: number, $$cr?: ErrorTracker): Nullable<COMMAND> {
        return this.run<COMMAND>($$dpth,
            () => {
                let $scope$commandType: Nullable<COMMAND_$0>;
                let $scope$commandValue: Nullable<COMMAND_$1>;
                let $$res: Nullable<COMMAND> = null;
                if (true
                    && ($scope$commandType = this.matchCOMMAND_$0($$dpth + 1, $$cr)) !== null
                    && ($scope$commandValue = this.matchCOMMAND_$1($$dpth + 1, $$cr)) !== null
                ) {
                    $$res = {kind: ASTKinds.COMMAND, commandType: $scope$commandType, commandValue: $scope$commandValue};
                }
                return $$res;
            });
    }
    public matchCOMMAND_$0($$dpth: number, $$cr?: ErrorTracker): Nullable<COMMAND_$0> {
        return this.matchCOMMAND_TYPE($$dpth + 1, $$cr);
    }
    public matchCOMMAND_$1($$dpth: number, $$cr?: ErrorTracker): Nullable<COMMAND_$1> {
        return this.matchVALUE_ID($$dpth + 1, $$cr);
    }
    public matchCOMMAND_TYPE($$dpth: number, $$cr?: ErrorTracker): Nullable<COMMAND_TYPE> {
        return this.run<COMMAND_TYPE>($$dpth,
            () => {
                let $scope$commandType: Nullable<string>;
                let $$res: Nullable<COMMAND_TYPE> = null;
                if (true
                    && ($scope$commandType = this.regexAccept(String.raw`(?:[0-9]+)`, $$dpth + 1, $$cr)) !== null
                ) {
                    $$res = {kind: ASTKinds.COMMAND_TYPE, commandType: $scope$commandType};
                }
                return $$res;
            });
    }
    public matchVALUE_ID($$dpth: number, $$cr?: ErrorTracker): Nullable<VALUE_ID> {
        return this.run<VALUE_ID>($$dpth,
            () => {
                let $scope$val: Nullable<string>;
                let $$res: Nullable<VALUE_ID> = null;
                if (true
                    && ($scope$val = this.regexAccept(String.raw`(?:[0-9A-F]{1,2})`, $$dpth + 1, $$cr)) !== null
                ) {
                    $$res = {kind: ASTKinds.VALUE_ID, val: $scope$val};
                }
                return $$res;
            });
    }
    public matchBLOCK_CONTENT($$dpth: number, $$cr?: ErrorTracker): Nullable<BLOCK_CONTENT> {
        return this.run<BLOCK_CONTENT>($$dpth,
            () => {
                let $scope$val: Nullable<string>;
                let $$res: Nullable<BLOCK_CONTENT> = null;
                if (true
                    && ($scope$val = this.regexAccept(String.raw`(?:[0-9\-\=\.]+)`, $$dpth + 1, $$cr)) !== null
                ) {
                    $$res = {kind: ASTKinds.BLOCK_CONTENT, val: $scope$val};
                }
                return $$res;
            });
    }
    public matchCOMMAND_SEPARATOR($$dpth: number, $$cr?: ErrorTracker): Nullable<COMMAND_SEPARATOR> {
        return this.regexAccept(String.raw`(?:,)`, $$dpth + 1, $$cr);
    }
    public matchCOMMAND_GROUP_SEPARATOR($$dpth: number, $$cr?: ErrorTracker): Nullable<COMMAND_GROUP_SEPARATOR> {
        return this.regexAccept(String.raw`(?::)`, $$dpth + 1, $$cr);
    }
    public matchBLOCK_SEPARATOR($$dpth: number, $$cr?: ErrorTracker): Nullable<BLOCK_SEPARATOR> {
        return this.regexAccept(String.raw`(?:\n)`, $$dpth + 1, $$cr);
    }
    public matchSILENCE($$dpth: number, $$cr?: ErrorTracker): Nullable<SILENCE> {
        return this.regexAccept(String.raw`(?:.)`, $$dpth + 1, $$cr);
    }
    public matchEXTENSION($$dpth: number, $$cr?: ErrorTracker): Nullable<EXTENSION> {
        return this.regexAccept(String.raw`(?:-)`, $$dpth + 1, $$cr);
    }
    public matchPART_SEPARATOR($$dpth: number, $$cr?: ErrorTracker): Nullable<PART_SEPARATOR> {
        return this.regexAccept(String.raw`(?:\n\n)`, $$dpth + 1, $$cr);
    }
    public test(): boolean {
        const mrk = this.mark();
        const res = this.matchSONG(0);
        const ans = res !== null;
        this.reset(mrk);
        return ans;
    }
    public parse(): ParseResult {
        const mrk = this.mark();
        const res = this.matchSONG(0);
        if (res)
            return {ast: res, errs: []};
        this.reset(mrk);
        const rec = new ErrorTracker();
        this.clearMemos();
        this.matchSONG(0, rec);
        const err = rec.getErr()
        return {ast: res, errs: err !== null ? [err] : []}
    }
    public mark(): PosInfo {
        return this.pos;
    }
    private loop<T>(func: $$RuleType<T>, star: boolean = false): Nullable<T[]> {
        const mrk = this.mark();
        const res: T[] = [];
        for (;;) {
            const t = func();
            if (t === null) {
                break;
            }
            res.push(t);
        }
        if (star || res.length > 0) {
            return res;
        }
        this.reset(mrk);
        return null;
    }
    private run<T>($$dpth: number, fn: $$RuleType<T>): Nullable<T> {
        const mrk = this.mark();
        const res = fn()
        if (res !== null)
            return res;
        this.reset(mrk);
        return null;
    }
    private choice<T>(fns: Array<$$RuleType<T>>): Nullable<T> {
        for (const f of fns) {
            const res = f();
            if (res !== null) {
                return res;
            }
        }
        return null;
    }
    private regexAccept(match: string, dpth: number, cr?: ErrorTracker): Nullable<string> {
        return this.run<string>(dpth,
            () => {
                const reg = new RegExp(match, "y");
                const mrk = this.mark();
                reg.lastIndex = mrk.overallPos;
                const res = this.tryConsume(reg);
                if(cr) {
                    cr.record(mrk, res, {
                        kind: "RegexMatch",
                        // We substring from 3 to len - 1 to strip off the
                        // non-capture group syntax added as a WebKit workaround
                        literal: match.substring(3, match.length - 1),
                        negated: this.negating,
                    });
                }
                return res;
            });
    }
    private tryConsume(reg: RegExp): Nullable<string> {
        const res = reg.exec(this.input);
        if (res) {
            let lineJmp = 0;
            let lind = -1;
            for (let i = 0; i < res[0].length; ++i) {
                if (res[0][i] === "\n") {
                    ++lineJmp;
                    lind = i;
                }
            }
            this.pos = {
                overallPos: reg.lastIndex,
                line: this.pos.line + lineJmp,
                offset: lind === -1 ? this.pos.offset + res[0].length : (res[0].length - lind - 1)
            };
            return res[0];
        }
        return null;
    }
    private noConsume<T>(fn: $$RuleType<T>): Nullable<T> {
        const mrk = this.mark();
        const res = fn();
        this.reset(mrk);
        return res;
    }
    private negate<T>(fn: $$RuleType<T>): Nullable<boolean> {
        const mrk = this.mark();
        const oneg = this.negating;
        this.negating = !oneg;
        const res = fn();
        this.negating = oneg;
        this.reset(mrk);
        return res === null ? true : null;
    }
    private memoise<K>(rule: $$RuleType<K>, memo: Map<number, [Nullable<K>, PosInfo]>): Nullable<K> {
        const $scope$pos = this.mark();
        const $scope$memoRes = memo.get($scope$pos.overallPos);
        if(this.memoSafe && $scope$memoRes !== undefined) {
        this.reset($scope$memoRes[1]);
        return $scope$memoRes[0];
        }
        const $scope$result = rule();
        if(this.memoSafe)
        memo.set($scope$pos.overallPos, [$scope$result, this.mark()]);
        return $scope$result;
    }
}
export function parse(s: string): ParseResult {
    const p = new Parser(s);
    return p.parse();
}
export interface ParseResult {
    ast: Nullable<SONG>;
    errs: SyntaxErr[];
}
export interface PosInfo {
    readonly overallPos: number;
    readonly line: number;
    readonly offset: number;
}
export interface RegexMatch {
    readonly kind: "RegexMatch";
    readonly negated: boolean;
    readonly literal: string;
}
export type EOFMatch = { kind: "EOF"; negated: boolean };
export type MatchAttempt = RegexMatch | EOFMatch;
export class SyntaxErr {
    public pos: PosInfo;
    public expmatches: MatchAttempt[];
    constructor(pos: PosInfo, expmatches: MatchAttempt[]) {
        this.pos = pos;
        this.expmatches = [...expmatches];
    }
    public toString(): string {
        return `Syntax Error at line ${this.pos.line}:${this.pos.offset}. Expected one of ${this.expmatches.map(x => x.kind === "EOF" ? " EOF" : ` ${x.negated ? 'not ': ''}'${x.literal}'`)}`;
    }
}
class ErrorTracker {
    private mxpos: PosInfo = {overallPos: -1, line: -1, offset: -1};
    private regexset: Set<string> = new Set();
    private pmatches: MatchAttempt[] = [];
    public record(pos: PosInfo, result: any, att: MatchAttempt) {
        if ((result === null) === att.negated)
            return;
        if (pos.overallPos > this.mxpos.overallPos) {
            this.mxpos = pos;
            this.pmatches = [];
            this.regexset.clear()
        }
        if (this.mxpos.overallPos === pos.overallPos) {
            if(att.kind === "RegexMatch") {
                if(!this.regexset.has(att.literal))
                    this.pmatches.push(att);
                this.regexset.add(att.literal);
            } else {
                this.pmatches.push(att);
            }
        }
    }
    public getErr(): SyntaxErr | null {
        if (this.mxpos.overallPos !== -1)
            return new SyntaxErr(this.mxpos, this.pmatches);
        return null;
    }
}