import { SetMetadata } from '@nestjs/common';

// Nome do "rótulo" que o guard procura em cada rota.
export const IS_PUBLIC_KEY = 'isPublic';

// Aula 31 (extra): marca uma rota como pública.
// Só faz sentido com o guard aplicado a todas as rotas.
export const Public = () =>
  SetMetadata(IS_PUBLIC_KEY, true);
