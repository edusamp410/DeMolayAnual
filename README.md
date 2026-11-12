# DeMolayAnual

Protótipo estático para demonstrar páginas de calendário, membros e solicitações de presença.

## Executar

Sirva os arquivos desta pasta por um servidor estático ou abra `login.html` em um navegador. Na primeira execução, crie uma conta de administrador para o navegador atual.

## Limitações de segurança

Esta versão é somente uma demonstração local. Contas, senhas, sessões, calendário e solicitações ficam no `localStorage` do navegador. Isso não é autenticação segura: os dados podem ser lidos ou alterados pelo próprio usuário e não são sincronizados entre dispositivos.

Contas da versão anterior não são reutilizadas pela configuração sanitizada; os dados legados permanecem apenas no armazenamento local do navegador.

Não cadastre dados reais de membros nem use esta versão para administrar um capítulo. Antes de qualquer uso real, configure autenticação e persistência no servidor com controles de acesso apropriados (por exemplo, Supabase Auth, PostgreSQL e políticas RLS). Nenhuma credencial de produção deve ser incluída no código cliente.
