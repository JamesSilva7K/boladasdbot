# Bolada Pix — código-fonte

Página de apresentação do sorteio Bolada Pix, reproduzindo o layout do site original
(https://www.boladapix.com/). As compras, a área do participante e as edições
anteriores continuam apontando para o site original — nada de pagamento ou emissão
de bilhetes é simulado aqui.

## Requisitos

- Node.js 20 ou superior (https://nodejs.org)
- npm (vem junto com o Node)

## Como rodar

```sh
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

## Como gerar a versão final para publicar

```sh
npm run build
```

O resultado fica na pasta `dist/` (pronta para um servidor Cloudflare,
que é o destino padrão deste projeto). Para conferir o resultado gerado,
rode `npm run dev` novamente.

## Testes e qualidade de código

```sh
npm run test     # testes automatizados
npm run lint     # verificação de código
npm run format   # formatação automática
```

## Estrutura das pastas

```text
bolada-pix/
├── public/                  favicon.txt e robots.txt servidos como estão
├── src/
│   ├── assets/              todas as imagens originais (logo, banner, passos, etc.)
│   ├── components/ui/       componentes de interface prontos (botão, accordion, etc.)
│   ├── hooks/               apoio para detecção de tela pequena
│   ├── lib/                 funções utilitárias e de registro de erros
│   ├── routes/
│   │   ├── __root.tsx       casca da página: tipos, título e descrição do site
│   │   └── index.tsx        página principal (todos os blocos: topo, prêmio, passos,
│   │                        dúvidas, comunidade, GRENDACC, Instagram, rodapé)
│   ├── styles.css           cores, fontes, tamanhos e layout responsivo
│   ├── server.ts / start.ts  / router.tsx / routeTree.gen.ts  apoio do framework
│   └── test/                testes automatizados
├── index e configurações:   package.json, tsconfig.json, vite.config.ts,
│                            vitest.config.ts, eslint.config.js, components.json
└── README.md                este arquivo
```

## O que já está pronto

- Cabeçalho fixo com menu que vira lista no celular
- Banner do prêmio com botão COMPRAR, data do sorteio e links de
  Condições Gerais e Regulamento (arquivos oficiais em PDF)
- Bloco "É fácil participar" com os três passos
- Perguntas frequentes que abrem e fecham
- Chamada para a comunidade no WhatsApp
- Apresentação da GRENDACC
- Grade de publicações do Instagram com botão SEGUIR
- Rodapé com contato, redes sociais, aviso de imagens ilustrativas e logo PlayCapTech
- Layout responsivo (celular, tablet e computador)

## Tecnologias

TanStack Start (React 19), TypeScript, Tailwind CSS v4, componentes shadcn/ui e Vite.
