# Pedidos – Camisetas e Pins

Página para controlar pedidos, pagamentos e entregas, hospedada na **Vercel** com os dados salvos no **Neon** (Postgres).

## Como funciona
- `index.html` – o app (uma página só).
- `api/data.js` – função da Vercel que lê/grava todos os dados numa tabela `app_state` do Neon (criada automaticamente).
- Uma cópia fica no navegador, então o app continua abrindo sem internet; ao voltar, sincroniza.
- Se dois aparelhos salvarem ao mesmo tempo, vale a versão que chegou primeiro e o outro recebe um aviso.

## Variáveis de ambiente (Vercel → Settings → Environment Variables)
| Nome | O que é |
|---|---|
| `DATABASE_URL` | Criada automaticamente ao conectar o banco Neon ao projeto (Storage → Neon). |
| `APP_PASSWORD` | Senha pedida no primeiro acesso de cada aparelho. Sem ela a API não devolve nada. |

## Primeiro uso
Abra o site, digite a senha. Se o banco estiver vazio e o navegador já tiver pedidos, eles são enviados pro servidor.
Para importar a planilha: 💾 Dados → Importar .json → `dados-planilha.json` (não suba esse arquivo pro GitHub: ele tem nomes e WhatsApp).

## Recursos
- Filtro por produto: todos, só **Pins**, só **Camisetas**, outros, itens avulsos, ou um produto específico. O tipo de cada produto se ajusta em ⚙️ Produtos e caixa.
- Valores com centavos em todos os campos de dinheiro: `8,95`, `8.95`, `1.234,56` ou `R$ 12,5`.
