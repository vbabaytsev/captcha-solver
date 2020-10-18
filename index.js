const got = require('got');

class CaptchaSolver {
    constructor(key, options) {
        if (!key) {
            throw new Error('Param key is missing');
        }
        this.key = key;
        options = options || {};
        const provider = options.provider || 'rucaptcha';
        this.sendUrl = `https://${provider}.com/in.php`;
        this.resultUrl = `https://${provider}.com/res.php`;
        this.delay = parseInt(options.delay) || 1000;
    }

    _wait(ms) {
        return new Promise((resolve) => setTimeout(() => resolve(), ms));
    }

    async createTask(params) {
        if (!params) {
            throw new Error('Params is missing');
        }

        try {
            const {
                taskId: request
            } = await got.post(this.sendUrl, {
                    responseType:   'json',
                    resolveBodyOnly: true,
                    searchParams: {
                        key: this.key,
                        json: 1,
                        ...params
                    }
                });
            this.taskId = taskId;
            return taskId;
        } catch (e) {
            throw new Error('Task creation failed: ' + e.message);
        }
    }

    async getSolution(taskId) {
        try {
            if (!taskId) {
                throw new Error('Param taskId is missing');
            }
            while (true) {
                const result = await got(this.resultUrl, {
                        responseType: 'json',
                        resolveBodyOnly: true,
                        searchParams: {
                            key: this.key,
                            action: 'get',
                            id: taskId,
                            json: 1
                        }
                    });
                if (result.status === 1) {
                    return {
                        taskId,
                        token: result.request
                    };
                } else {
                    if (result.request === 'ERROR_CAPTCHA_UNSOLVABLE') {
                        throw new Error('Unable to solve recaptcha');
                    } else if (result.request === 'CAPCHA_NOT_READY') {
                        await this._wait(1000);
                        continue;
                    } else {
                        throw new Error(solution.request);
                    }
                }
            }
        } catch (e) {
            throw new Error('Get solution failed: ' + e.message);
        }
    }

    async report(taskId, isGood) {
        if (!taskId) {
            throw new Error('Param taskId is missing');
        }

        if (typeof isGood === 'undefined') {
            throw new Error('param isGood is missing');
        }

        const reportType = isGood ? 'reportgood' : 'reportbad';
        try {
            await got.post(this.resultUrl, {
                responseType: 'json',
                resolveBodyOnly: true,
                searchParams: {
                    key: this.key,
                    json: 1,
                    action: reportType,
                    id: taskId
                }
            });
        } catch (e) {
            throw new Error('Report post failed: ' + e.message);
        }
    }

    async solve(params) {
        try {
            const taskId = await this.createTask(params);
            const result = await getSolution(taskId);
            return {
                token: result.request,
                isGood: this.report.bind(null, taskId, true),
                isBad: this.report.bind(null, taskId, false)
            };
        } catch (e) {
            throw new Error('Solver failed: ' + e.message);
        }
    }
}

module.exports = CaptchaSolver;