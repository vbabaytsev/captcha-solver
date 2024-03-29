/* eslint-disable no-console */
import got from 'got';

type Options = {
  provider: string;
  delay?: number;
  debug?: boolean;
};

type Params = {
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
  method: 'userrecaptcha',
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

type SolveResult = {
  taskId: string;
  solution: string;
};

class CaptchaSolver {
  private key: string;

  private sendUrl: string;

  private resultUrl: string;

  private delay: number;

  private provider: string;

  private debug?: boolean;

  constructor(key: string, options: Options) {
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

  async createTask(params: Params): Promise<string> {
    try {
      const result: string = await got.post(this.sendUrl, {
        resolveBodyOnly: true,
        https: {
          rejectUnauthorized: false,
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
    } catch (e: any) {
      throw new Error(`Task creation failed: ${e.message}`);
    }
  }

  getSolution(taskId: string): Promise<SolveResult> {
    return new Promise<SolveResult>((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const result: string = await got(this.resultUrl, {
            resolveBodyOnly: true,
            https: {
              rejectUnauthorized: false,
            },
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
          } else if (result === 'ERROR_CAPTCHA_UNSOLVABLE') {
            clearInterval(timer);
            throw new Error('Unable to solve captcha');
          } else {
            clearInterval(timer);
            throw new Error(result);
          }
        } catch (e: any) {
          clearInterval(timer);
          reject(e);
        }
      }, this.delay);
    });
  }

  async report(taskId: string, isGood: boolean) {
    if (this.provider === 'capmonster.cloud') {
      throw new Error('Reports not implemented');
    }

    const reportType = isGood ? 'reportgood' : 'reportbad';
    try {
      await got.post(this.resultUrl, {
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
    } catch (e: any) {
      throw new Error(`Report post failed: ${e.message}`);
    }
  }

  async solve(params: Params) {
    try {
      const taskId = await this.createTask(params);
      const result = await this.getSolution(taskId);
      return {
        solution: result.solution,
        isGood: this.report.bind(this, taskId, true),
        isBad: this.report.bind(this, taskId, false),
      };
    } catch (e) {
      throw new Error(`Solver failed: ${e}`);
    }
  }
}

export default CaptchaSolver;
