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
                resolveBodyOnly: true,
                [params.method === 'base64' ? 'form' : 'searchParams']: { key: this.key, ...params },
            });
            const [, taskId] = result.split('|');
            if (!taskId) {
                throw new Error(result);
            }
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
                    resolveBodyOnly: true,
                    searchParams: {
                        key: this.key,
                        action: 'get',
                        id: taskId,
                    },
                });
                if (result === 'CAPCHA_NOT_READY') {
                    return;
                }
                const [, solution] = result.split('|');
                if (solution) {
                    clearInterval(timer);
                    resolve({
                        taskId,
                        solution,
                    });
                }
                else if (result === 'ERROR_CAPTCHA_UNSOLVABLE') {
                    clearInterval(timer);
                    reject(new Error('Unable to solve captcha'));
                }
                else {
                    clearInterval(timer);
                    reject(new Error(result));
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
                resolveBodyOnly: true,
                searchParams: {
                    key: this.key,
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
