import { swaggerHabilitado } from './swagger.config.js';

describe('swaggerHabilitado (Aula 40)', () => {
  it('liga em desenvolvimento e sem NODE_ENV', () => {
    expect(swaggerHabilitado('development')).toBe(true);
    expect(swaggerHabilitado(undefined)).toBe(true);
  });

  it('desliga em produção', () => {
    expect(swaggerHabilitado('production')).toBe(false);
  });
});
