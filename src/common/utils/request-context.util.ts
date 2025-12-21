import { Request } from 'express';
import { UAParser } from 'ua-parser-js';

export class RequestContextUtil {
  static getClientIp(req: Request): string {
    // Check proxy headers first
    const headersToCheck = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'fastly-client-ip', // Fastly
    ];

    for (const header of headersToCheck) {
      const value = req.headers[header];
      if (value) {
        const ip = Array.isArray(value) ? value[0] : value;
        return ip.split(',')[0].trim();
      }
    }

    // Fallback
    return req.socket?.remoteAddress || req.ip || 'unknown';
  }

  static parseUserAgent(userAgent: string) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      browser: result.browser.name
        ? `${result.browser.name} ${result.browser.version || ''}`.trim()
        : 'Unknown',
      os: result.os.name
        ? `${result.os.name} ${result.os.version || ''}`.trim()
        : 'Unknown',
      device: result.device.model || result.device.type || 'Desktop',
      isMobile: result.device.type === 'mobile',
      isTablet: result.device.type === 'tablet',
      raw: userAgent.substring(0, 255), // Truncate for storage
    };
  }

  static extractMetadata(req: Request) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = this.getClientIp(req);
    const parsedUA = this.parseUserAgent(userAgent);

    return {
      ipAddress,
      userAgent: parsedUA.raw,
      browser: parsedUA.browser,
      os: parsedUA.os,
      deviceType: parsedUA.device,
      isMobile: parsedUA.isMobile,
      isTablet: parsedUA.isTablet,
    };
  }
}
