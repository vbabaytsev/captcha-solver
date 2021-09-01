"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
class CaptchaSolver {
    constructor(key, options) {
        if (!key) {
            throw new Error('Param key is missing');
        }
        this.key = key;
        this.sendUrl = `https://${options.provider}/in.php`;
        this.resultUrl = `https://${options.provider}/res.php`;
        this.delay = options.delay || 1000;
        this.provider = options.provider;
    }
    async createTask(params) {
        try {
            const result = await got_1.default.post(this.sendUrl, {
                responseType: 'json',
                resolveBodyOnly: true,
                [params.method === 'base64' ? 'form' : 'searchParams']: { key: this.key, ...params },
            });
            if (result.status !== 1) {
                throw new Error(result.request);
            }
            const { request: taskId } = result;
            return taskId;
        }
        catch (e) {
            throw new Error(`Task creation failed: ${e.message}`);
        }
    }
    async getSolution(taskId) {
        return new Promise((resolve, reject) => {
            const timer = setInterval(async () => {
                const result = await (0, got_1.default)(this.resultUrl, {
                    responseType: 'json',
                    resolveBodyOnly: true,
                    searchParams: {
                        key: this.key,
                        action: 'get',
                        id: taskId,
                        json: 1,
                    },
                });
                if (result.status === 1) {
                    clearInterval(timer);
                    resolve({
                        taskId,
                        solution: result.request,
                    });
                    return;
                }
                if (result.request === 'ERROR_CAPTCHA_UNSOLVABLE') {
                    clearInterval(timer);
                    reject(new Error('Unable to solve recaptcha'));
                }
                else {
                    clearInterval(timer);
                    reject(new Error(result.request));
                }
            }, this.delay);
        });
    }
    async report(taskId, isGood) {
        if (this.provider === 'capmonster.cloud') {
            throw new Error('Reports not implemented');
        }
        const reportType = isGood ? 'reportgood' : 'reportbad';
        try {
            await got_1.default.post(this.resultUrl, {
                responseType: 'json',
                resolveBodyOnly: true,
                searchParams: {
                    key: this.key,
                    json: 1,
                    action: reportType,
                    id: taskId,
                },
            });
        }
        catch (e) {
            throw new Error(`Report post failed: ${e.message}`);
        }
    }
    async solve(params) {
        try {
            const taskId = await this.createTask(params);
            const result = await this.getSolution(taskId);
            return {
                solution: result.solution,
                isGood: this.report.bind(this, taskId, true),
                isBad: this.report.bind(this, taskId, false),
            };
        }
        catch (e) {
            throw new Error(`Solver failed: ${e}`);
        }
    }
}
exports.default = CaptchaSolver;
