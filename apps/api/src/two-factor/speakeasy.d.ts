declare module "speakeasy" {
  export interface GenerateSecretOptions {
    name?: string;
    length?: number;
  }

  export interface GenerateSecretResult {
    base32?: string;
    otpauth_url?: string;
    [key: string]: any;
  }

  export interface TotpVerifyOptions {
    secret: string;
    encoding: string;
    token: string;
    window?: number;
  }

  export function generateSecret(options?: GenerateSecretOptions): GenerateSecretResult;

  export namespace totp {
    export function verify(options: TotpVerifyOptions): boolean;
  }
}
