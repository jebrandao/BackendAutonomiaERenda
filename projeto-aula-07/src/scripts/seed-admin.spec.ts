import { vi } from 'vitest';
import { Role } from '../auth/role.enum.js';
import {
  garantirAdmin,
  lerCredenciaisAdmin,
} from './seed-admin.js';

const ok = {
  ADMIN_EMAIL: 'Admin@Empresa.com ',
  ADMIN_SENHA: 'Adm1n#SenaiCRTI2026!',
};
const credenciais = {
  email: 'admin@empresa.com',
  senha: 'Adm1n#SenaiCRTI2026!',
};

describe('lerCredenciaisAdmin (Aula 37)', () => {
  it('aceita e normaliza o e-mail (minúsculas, sem espaços)', () => {
    expect(lerCredenciaisAdmin(ok)).toEqual(
      credenciais,
    );
  });

  it('lista TODAS as variáveis ausentes', () => {
    expect(() => lerCredenciaisAdmin({})).toThrow(
      /ADMIN_EMAIL está ausente/,
    );
    expect(() => lerCredenciaisAdmin({})).toThrow(
      /ADMIN_SENHA está ausente/,
    );
  });

  it('recusa e-mail sem @', () => {
    expect(() =>
      lerCredenciaisAdmin({
        ...ok,
        ADMIN_EMAIL: 'admin',
      }),
    ).toThrow(/não parece um e-mail/);
  });

  it('recusa senha curta e avisa do "#" sem aspas', () => {
    // É o que o dotenv entrega quando o "#" está sem aspas.
    expect(() =>
      lerCredenciaisAdmin({
        ...ok,
        ADMIN_SENHA: 'Adm1n',
      }),
    ).toThrow(/curta demais[\s\S]*aspas/);
  });

  it('recusa o valor de exemplo', () => {
    expect(() =>
      lerCredenciaisAdmin({
        ...ok,
        ADMIN_SENHA: 'troque-por-uma-senha-forte-123',
      }),
    ).toThrow(/valor de exemplo/);
  });
});

describe('garantirAdmin (Aula 37)', () => {
  const novoModel = (
    respostas: Array<{ email: string } | null>,
  ) => {
    const findOne = vi.fn();
    for (const r of respostas)
      findOne.mockResolvedValueOnce(r);
    return {
      findOne,
      create: vi.fn().mockResolvedValue({}),
    };
  };

  it('cria o Admin quando ele não existe', async () => {
    const model = novoModel([null, null]);
    const r = await garantirAdmin(model, credenciais);
    expect(r).toEqual({
      criado: true,
      email: 'admin@empresa.com',
    });
    expect(model.create).toHaveBeenCalledTimes(1);
  });

  it('grava roles [admin] e a senha em texto (o hook faz o hash)', async () => {
    const model = novoModel([null, null]);
    await garantirAdmin(model, credenciais);
    expect(model.create).toHaveBeenCalledWith({
      nome: 'Admin',
      email: 'admin@empresa.com',
      senha: credenciais.senha,
      roles: [Role.ADMIN],
    });
  });

  it('é idempotente: já existe Admin, não cria outro', async () => {
    const model = novoModel([
      { email: 'quem@ja-existe.com' },
    ]);
    const r = await garantirAdmin(model, credenciais);
    expect(r).toEqual({
      criado: false,
      email: 'quem@ja-existe.com',
    });
    expect(model.create).not.toHaveBeenCalled();
  });

  it('a verificação de existência usa roles: admin', async () => {
    const model = novoModel([{ email: 'a@b.com' }]);
    await garantirAdmin(model, credenciais);
    expect(model.findOne).toHaveBeenCalledWith({
      roles: Role.ADMIN,
    });
  });

  it('recusa quando o e-mail já é de uma conta comum', async () => {
    const model = novoModel([
      null,
      { email: 'admin@empresa.com' },
    ]);
    await expect(
      garantirAdmin(model, credenciais),
    ).rejects.toThrow(/não é Admin/);
    expect(model.create).not.toHaveBeenCalled();
  });
});
