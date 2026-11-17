import { vi } from 'vitest';
import {
  configurarServidor,
  KEEP_ALIVE_PADRAO_MS,
  lerHost,
  lerKeepAliveMs,
  lerTrustProxy,
} from './servidor.config.js';

const novoApp = () => ({
  set: vi.fn(),
  getHttpServer: vi.fn().mockReturnValue({
    keepAliveTimeout: 5000,
    headersTimeout: 60000,
  }),
});

describe('lerTrustProxy (Aula 38)', () => {
  it('vazio ou ausente: não confia em proxy', () => {
    expect(lerTrustProxy(undefined)).toBe(false);
    expect(lerTrustProxy('')).toBe(false);
    expect(lerTrustProxy('  ')).toBe(false);
  });

  it('número: quantos proxies confiar', () => {
    expect(lerTrustProxy('1')).toBe(1);
    expect(lerTrustProxy(' 2 ')).toBe(2);
  });
});

describe('lerKeepAliveMs e lerHost (Aula 38)', () => {
  it('keep-alive: padrão de 65 s quando vazio', () => {
    expect(lerKeepAliveMs(undefined)).toBe(
      KEEP_ALIVE_PADRAO_MS,
    );
    expect(KEEP_ALIVE_PADRAO_MS).toBeGreaterThan(
      60_000,
    );
  });

  it('keep-alive: usa o valor informado', () => {
    expect(lerKeepAliveMs('30000')).toBe(30000);
  });

  it('host: vazio vira undefined (todas as interfaces)', () => {
    expect(lerHost(undefined)).toBeUndefined();
    expect(lerHost('')).toBeUndefined();
    expect(lerHost('127.0.0.1')).toBe('127.0.0.1');
  });
});

describe('configurarServidor (Aula 38)', () => {
  it('sem variáveis: não mexe no trust proxy', () => {
    const app = novoApp();
    const host = configurarServidor(app, {});
    expect(app.set).not.toHaveBeenCalled();
    expect(host).toBeUndefined();
  });

  it('TRUST_PROXY=1 liga o trust proxy com 1 salto', () => {
    const app = novoApp();
    configurarServidor(app, { TRUST_PROXY: '1' });
    expect(app.set).toHaveBeenCalledWith(
      'trust proxy',
      1,
    );
  });

  it('ajusta keepAliveTimeout e headersTimeout maior', () => {
    const app = novoApp();
    configurarServidor(app, {});
    const servidor = app.getHttpServer();
    expect(servidor.keepAliveTimeout).toBe(65_000);
    expect(servidor.headersTimeout).toBeGreaterThan(
      servidor.keepAliveTimeout,
    );
  });

  it('devolve o HOST para o app escutar só ali', () => {
    const app = novoApp();
    expect(
      configurarServidor(app, { HOST: '127.0.0.1' }),
    ).toBe('127.0.0.1');
  });
});
