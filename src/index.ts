import got from 'got';

type Options = {
  provider: string;
  delay?: number;
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
} | {
  method: 'userrecaptcha';
  version: 'v3';
  googlekey: string;
  pageurl: string;
  action: string;
  min_score: number;
};

type Response = {
  status: number;
  request: string;
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

  constructor(key: string, options: Options) {
    if (!key) {
      throw new Error('Param key is missing');
    }

    this.key = key;
    this.sendUrl = `https://${options.provider}/in.php`;
    this.resultUrl = `https://${options.provider}/res.php`;
    this.delay = options.delay || 1000;
    this.provider = options.provider;
  }

  async createTask(params: Params): Promise<string> {
    try {
      const result: Response = await got.post(this.sendUrl, {
        responseType: 'json',
        resolveBodyOnly: true,
        [params.method === 'base64' ? 'form' : 'searchParams']: { key: this.key, ...params },
      });
      if (result.status !== 1) {
        throw new Error(result.request);
      }
      const { request: taskId } = result;
      return taskId;
    } catch (e: any) {
      throw new Error(`Task creation failed: ${e.message}`);
    }
  }

  async getSolution(taskId: string): Promise<SolveResult> {
    return new Promise<SolveResult>((resolve, reject) => {
      const timer = setInterval(async () => {
        const result: Response = await got(this.resultUrl, {
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
        } else {
          clearInterval(timer);
          reject(new Error(result.request));
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
        responseType: 'json',
        resolveBodyOnly: true,
        searchParams: {
          key: this.key,
          json: 1,
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
