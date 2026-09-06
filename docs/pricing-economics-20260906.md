# DPsoft — preços e margem de contribuição

Data: 6 setembro 2026. USD, por organização/mês, antes de impostos. Proposta de lançamento; não representa custos observados nem garante lucro.

## Fontes oficiais

- OpenAI, Standard, contexto curto, `gpt-5.6-luna`: US$0,20 por milhão de tokens de entrada e US$1,20 por milhão de saída: https://developers.openai.com/api/docs/pricing . Sem descontos de cache/Batch no cálculo. Modelo configurado no projeto; disponibilidade na conta ainda não validada com nova chave.
- Stripe EUA: cartões domésticos 2,9% + US$0,30; internacional +1,5%; conversão +1%. Referência, não tarifa confirmada para a empresa: https://stripe.com/en-us/pricing . Stripe Billing pay-as-you-go: 0,7% do volume: https://stripe.com/en-us/billing/pricing . Não pressupor elegibilidade da empresa; confirmar país e contrato.
- Resend Pro: US$20/mês, 50.000 emails, excedente US$0,90/1.000: https://resend.com/pricing . Referência futura; envio não implementado nem incluído nos planos. Não confundir custo marginal com mensalidade mínima.
- A fatura real da VPS, backups externos, monitorização e domínio não foi fornecida. As verbas de infraestrutura abaixo são hipóteses por organização, não preços oficiais da Contabo.

## Hipóteses por execução

8.000 tokens de entrada + 2.000 de saída faturada (incluindo raciocínio), somados sobre todas as chamadas do fluxo, não por chamada. Custo base: `(8000 × 0,20 + 2000 × 1,20) / 1.000.000 = US$0,004`. Reserva de 2x para repetição/variação: US$0,008 por execução.

Não inclui áudio, imagens, pesquisa, controlo de computador ou modelos premium. Fluxos longos custam mais. A aplicação ainda não impõe estes limites de tokens ou quotas; ativar vendas antes dessa implementação invalidaria a estimativa.

## Cenário a utilização completa proposta

| Item mensal | Essential | Business | Scale |
|---|---:|---:|---:|
| Preço proposto | 39,00 | 99,00 | 249,00 |
| Execuções propostas | 500 | 1.500 | 4.000 |
| IA com reserva 2x | 4,00 | 12,00 | 32,00 |
| Infraestrutura alocada (hipótese) | 3,00 | 6,00 | 12,00 |
| Suporte alocado (hipótese) | 5,00 | 12,00 | 25,00 |
| Pagamentos provisionados: 6,5% + 0,50 | 3,04 | 6,94 | 16,69 |
| Reserva operacional: 5% da receita | 1,95 | 4,95 | 12,45 |
| Custo total não arredondado, exibido a 2 casas | 16,99 | 41,89 | 98,14 |
| Contribuição antes de custos restantes | 22,02 | 57,12 | 150,87 |
| Margem de contribuição | 56,45% | 57,69% | 60,59% |

Pagamentos: 6,5% + 0,50 é uma provisão, não uma tarifa oficial. Arredondamentos podem causar diferenças de 0,01 nas somas exibidas.

Se IA e suporte duplicarem face ao cenário, as margens caem para aproximadamente 33,37%, 33,45% e 37,70%. Se cada organização Essential consumir sozinha US$60 de infraestrutura, o plano dá prejuízo. O número de clientes pagantes e a capacidade medida da VPS determinam a alocação real.

Lucro líquido = contribuição total − salários/desenvolvimento − marketing/aquisição − custos fixos ainda não alocados − impostos e outros encargos. Não subtrair a mesma infraestrutura duas vezes. Ponto de equilíbrio depende desses custos restantes e da combinação de planos; não há quantidade garantida de clientes sem esses dados.

## Política antes de abrir vendas

Implementar quotas atómicas e orçamento de tokens por organização; pausar ao atingir o limite, sem excedentes automáticos. Propor 500/1.500/4.000 execuções standard apenas depois de essas regras serem testadas. Os planos ainda não têm diferenciação operacional aplicada.

Não vender mensagens WhatsApp, email, integrações personalizadas, instaladores nativos ou execução remota como recursos disponíveis. Cobrar implementação personalizada separadamente após orçamento. Não oferecer uso ilimitado nem descontos anuais antes de observar custos e retenção.

Configurar três novos preços Stripe após aprovação comercial; o preço efetivamente apresentado pelo Stripe é autoritativo. Este trabalho altera o catálogo proposto, não contratos existentes nem preços de um comerciante externo.
