import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InternalHttpService {
  private readonly logger = new Logger(InternalHttpService.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('internalApi.baseUrl')!;
    this.secret = this.configService.get<string>('internalApi.secret')!;
  }

  private buildConfig(config?: AxiosRequestConfig): AxiosRequestConfig {
    return {
      ...config,
      headers: {
        ...config?.headers,
        'X-Internal-Secret': this.secret,
        'Content-Type': 'application/json',
      },
    };
  }

  private resolveUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const url = this.resolveUrl(path);
    this.logger.debug(`GET ${url}`);
    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.get<T>(url, this.buildConfig(config)),
    );
    return response.data;
  }

  async post<T>(
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const url = this.resolveUrl(path);
    this.logger.debug(`POST ${url}`);
    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.post<T>(url, data, this.buildConfig(config)),
    );
    return response.data;
  }
}
