# DPsoft — estratégia de diferenciação

## Posicionamento proposto

Uma camada de inteligência operacional que liga cada resposta aos dados autorizados da empresa. Começar pela receita mensal e reconciliação financeira de um segmento específico, em vez de prometer um agente que faz tudo. Validar o segmento com entrevistas e pilotos pagos antes de ampliar conectores.

## Entregue nesta alteração

- Identidade visual: azul profundo, verde mineral e acento lima, com hierarquia de console empresarial.
- Mapa fonte → agentes, calculado pelas relações retornadas pela API.
- Pesquisa local por fontes, agentes e evidências carregadas.
- Checklist de ativação derivado do estado persistido.
- Biblioteca das conversas com metadados de origem; exportação JSON dos resultados filtrados. Não é exportação integral, assinatura digital ou certificação de auditoria.
- Navegação móvel acessível e remoção dos indicadores fixos de saúde.

## O que pode criar uma vantagem duradoura

Agentes e integrações, isoladamente, já são oferecidos por [Workato](https://www.workato.com/agentic/agent-orchestration) e [n8n](https://n8n.io/ai/). A proposta não deve ser “ninguém consegue copiar”. A vantagem precisa surgir do conhecimento operacional, execução confiável, integrações aprofundadas e relacionamento com clientes.

1. **Pacotes por setor:** modelos de dados, definição das métricas e configuração assistida para um fluxo recorrente que o cliente já paga para resolver.
2. **Contratos de métricas versionados:** origem, moeda, impostos, fusos, regras de cálculo e responsável explícitos. Ainda não implementados; exigem mudanças no backend e testes de consistência.
3. **Reconciliação e exceções:** comparar resultados com uma referência, indicar diferenças e permitir investigação com evidências. Exige definir a referência com o cliente; não criar resultados artificiais.
4. **Aprovação humana real:** fila persistente, permissões, decisão e trilha antes de qualquer ação de escrita. Ainda não implementada.
5. **Operação confiável:** alertas, backups com restauração testada, observabilidade e suporte com metas mensuráveis. Não afirmar SLA antes da infraestrutura e operação sustentarem esse compromisso.

## Validação comercial

- Entrevistar responsáveis financeiros de um único segmento: problema atual, frequência, custo do processo, sistemas usados e autoridade de compra.
- Oferecer um piloto pago de escopo delimitado: conectar uma fonte, validar um indicador e entregar evidências utilizáveis.
- Medir tempo até a primeira resposta útil, frequência de uso, divergências reportadas, custo real por consulta e conversão do piloto em assinatura.
- Experimentar taxa de implementação mais assinatura por organização, com uso incluído e limites transparentes. O preço ainda precisa de validação; não há projeção de vendas comprovada.
- Expandir apenas quando pilotos demonstrarem uso recorrente e disposição de pagar. Não usar dados empresariais entre clientes nem treinar modelos com eles sem autorização adequada.

## Antes de comercialização pública

Revisão de segurança independente, testes de isolamento e permissões, recuperação de backup, gestão de segredos, política de retenção/exportação, faturação, suporte e documentação dos limites. A chave exposta no chat deve ser revogada. O redesign não certifica prontidão de produção e não garante vendas.
