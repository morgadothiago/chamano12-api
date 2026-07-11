# Chama nº 12 — API — Status

Última atualização: 11/07/2026

## ✅ Funcionando

### Autenticação
- Login e cadastro de conta (motorista), com sessão via JWT.
- Consulta do usuário logado.

### Motoristas
- Cadastro completo (dados pessoais, CNH, veículo, endereço) — nasce com status "pendente".
- Consulta do próprio perfil e por ID.
- Edição de dados.
- Aprovação e rejeição de cadastro (usado pelo painel administrativo).
- Ativação e desativação de conta.
- Upload de documentos (CNH, CRLV, foto do veículo).
- Revisão manual de documentos — aprovar ou rejeitar cada um (usado pelo painel administrativo).
- Histórico de corridas do motorista, paginado.
- Métricas do motorista: total de corridas, avaliação média, ganhos acumulados.

### Corridas
- Criação de solicitação de corrida.
- Aceitar, iniciar, finalizar e cancelar corrida.
- Busca de motoristas próximos.
- Listagem e consulta de corridas.
- Atualização de localização do motorista em tempo real.

### Tempo real (WebSocket)
- Notificação de nova corrida disponível para motoristas online.
- Eventos de corrida aceita/cancelada/finalizada.
- Broadcast de localização do motorista.

### Documentação
- Swagger completo e navegável em `/api/docs`, com todos os endpoints, parâmetros e schemas.

## ⚠️ Ainda não existe

- **Pagamentos/carteira**: nenhum endpoint de saldo, recarga ou repasse financeiro ao motorista.
- **Cadastro/gestão de passageiros**: não há módulo de passageiros na API (o app do passageiro, se existir, ainda não tem back-end dedicado).
- **Cupons de desconto**: não implementado.
- **Tarifas dinâmicas/bandeiras de preço**: não implementado.
- **Recuperação de senha**: não implementado.
- **Emissão de recibos**: não implementado.

## 🚧 Infraestrutura

- Banco: PostgreSQL via Drizzle ORM, com migrations versionadas.
- Armazenamento de documentos: local (disco do servidor) — único provider implementado até agora. Para produção, recomendo migrar para object storage (ex: Cloudflare R2, S3) antes de qualquer deploy sem disco persistente.
- Deploy: preparado para Render (Blueprint `render.yaml` no repositório), rodando localmente até a conclusão do deploy.

## Observação importante

Este documento reflete apenas o que existe e foi verificado nesta fase. Os itens em "ainda não existe" precisam de desenvolvimento novo — não são apenas configuração.
