declare type Options = {
    provider: string;
    delay?: number;
    debug?: boolean;
};
declare type Params = {
    method: 'base64';
    body: string;
    phrase?: 0 | 1;
    regsense?: 0 | 1;
    numeric?: 0 | 1;
    calc?: 0 | 1;
    minlength?: number;
    maxlength?: number;
    json?: 0 | 1;
} | {
    method: 'userrecaptcha';
    googlekey: string;
    pageurl: string;
    json: 0 | 1;
    cmbrowsertype?: string;
} | {
    method: 'userrecaptcha';
    version: 'v3';
    googlekey: string;
    pageurl: string;
    action: string;
    min_score: number;
    cmbrowsertype?: string;
} | {
    method: 'userrecaptcha';
    enterprise: number;
    googlekey: string;
    pageurl: string;
    action: string;
    min_score: number;
    cmbrowsertype?: string;
};
declare type SolveResult = {
    taskId: string;
    solution: string;
};
declare class CaptchaSolver {
    private key;
    private sendUrl;
    private resultUrl;
    private delay;
    private provider;
    private debug?;
    constructor(key: string, options: Options);
    createTask(params: Params): Promise<string>;
    getSolution(taskId: string): Promise<SolveResult>;
    report(taskId: string, isGood: boolean): Promise<void>;
    solve(params: Params): Promise<{
        solution: string;
        isGood: () => Promise<void>;
        isBad: () => Promise<void>;
    }>;
}
export default CaptchaSolver;
