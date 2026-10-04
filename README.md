# Apuração 2026 · Presidente

Painel de acompanhamento em tempo real da eleição presidencial de 2026, com mapa do Brasil colorido por quem lidera em cada estado.

**Acesse:** https://wilgnerthomaz.github.io/apuracao-2026/

- Dados oficiais do [TSE](https://resultados.tse.jus.br/oficial/app/index.html), atualizados a cada 30 segundos direto do navegador
- Mapa geográfico no desktop e mapa em blocos no celular
- % do líder e % de seções apuradas por estado e no total do país

## Rodar localmente

Abra `index.html` no navegador, ou:

```bash
node serve.js
```

e acesse http://localhost:8787. Por padrão o servidor só aceita conexões deste computador; use `node serve.js --rede` para liberar a outros aparelhos da mesma rede.

## Segurança

- Página 100% estática: não há backend, login, cookies nem coleta de dados de quem acessa.
- Content-Security-Policy: scripts só do próprio site; rede e imagens só de `resultados.tse.jus.br`.
- Textos vindos do TSE são escapados antes de entrar no HTML.
- `serve.js` serve apenas `index.html`, `app.js` e `mapa-brasil.js`, só via GET, com cabeçalhos de segurança.

Mapa gerado a partir de [brazil-states.geojson](https://github.com/codeforamerica/click_that_hood) (Code for America).
