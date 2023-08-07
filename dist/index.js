"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
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
        this.debug = options.debug;
    }
    async createTask(params) {
        try {
            const result = await got_1.default.post(this.sendUrl, {
                resolveBodyOnly: true,
                https: {
                    rejectUnauthorized: false,
                },
                retry: {
                    methods: ['POST'],
                    limit: 3,
                },
                timeout: 30000,
                [params.method === 'base64' ? 'form' : 'searchParams']: { key: this.key, ...params },
            });
            if (this.debug) {
                console.log('[debug] createTask result:', result);
            }
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
        try {
            return await new Promise((resolve, reject) => {
                const timer = setInterval(async () => {
                    try {
                        const result = await (0, got_1.default)(this.resultUrl, {
                            resolveBodyOnly: true,
                            https: {
                                rejectUnauthorized: false,
                            },
                            retry: 2,
                            timeout: 30000,
                            searchParams: {
                                key: this.key,
                                action: 'get',
                                id: taskId,
                            },
                        });
                        if (this.debug) {
                            console.log('[debug] getSolution result:', result);
                        }
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
                    }
                    catch (e) {
                        clearInterval(timer);
                        reject(e);
                    }
                }, this.delay);
            });
        }
        catch (e) {
            throw new Error(`get solution failed: ${e.message}`);
        }
    }
    async report(taskId, isGood) {
        if (this.provider === 'capmonster.cloud') {
            throw new Error('Reports not implemented');
        }
        const reportType = isGood ? 'reportgood' : 'reportbad';
        try {
            await got_1.default.post(this.resultUrl, {
                resolveBodyOnly: true,
                https: {
                    rejectUnauthorized: false,
                },
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
