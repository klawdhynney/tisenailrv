# Tutorial Interativo com Narração em Áudio (pt-BR) - Abrir Chamado

Este documento detalha a arquitetura, o dicionário central de pronúncia, o motor de áudio acelerado (SoundTouch WSOLA), o botão de acesso rápido no topo da página e os procedimentos de manutenção do tutorial interativo da Central de TI SENAI Lucas do Rio Verde.

---

## 1. Visão Geral da Arquitetura e Inovações (v2)

O tutorial funciona como uma demonstração interativa ao vivo construída em componentes React, combinando:
1. **Botão de Início Rápido no Topo da Página**: Perto do título de `/abrir`, o usuário pode clicar em **"Ver demonstração em vídeo"** para abrir o tutorial diretamente em um diálogo modal centralizado (`TutorialModal.tsx`).
2. **Seção de Rodapé**: O player completo com a transcrição em texto recolhível (`TutorialPlayer.tsx` e `TutorialTranscript.tsx`) permanece disponível no final do formulário, antes do botão global *Retornar*.
3. **Controle de Concorrência de Áudio**: Apenas um áudio pode tocar por vez. Se o player do rodapé estiver ativo e o usuário abrir o modal, o áudio do rodapé é pausado automaticamente via evento customizado `tutorial:pause-others`, e vice-versa. Ao fechar o modal ou trocar de aba, todo som é interrompido.
4. **Isolamento e Segurança (100% Demonstração)**: Utiliza dados fictícios de exemplo (*Maria Silva*, *maria.silva@exemplo.com*). Nenhuma requisição é feita ao back-end ou banco de dados.

---

## 2. Dicionário Central de Pronúncias Fonéticas

Para garantir que a síntese de voz não pronuncie siglas como palavras corridas (por exemplo, "TI" lido como a sílaba "ti"), foi criado o arquivo central **`src/content/tutorial-pronuncia.ts`**.

A separação é estrita:
- **Legendas e Transcrição em Tela**: Mantêm a grafia formal padrão (**TI**, **IA**, **SLA**, **LGPD**).
- **Voz e Síntese**: O texto enviado ao sintetizador é processado por `aplicarPronuncia()`, aplicando as regras fonéticas:

| Termo / Sigla | Pronúncia Fonética Aplicada | Descrição |
|---|---|---|
| **TI** | `"tê í"` | Letras pronunciadas individualmente ("Central de tê í", "equipe de tê í") |
| **SLA** | `"ésse éle á"` | Pronúncia separada das letras do acordo de nível de serviço |
| **LGPD** | `"éle gê pê dê"` | Pronúncia clara da lei de proteção de dados |
| **IA** | `"i á"` | Pronúncia de Inteligência Artificial |
| **PDF** | `"pê dê éfe"` | Formato de documento |
| **SENAI** | `"sênai"` | Pronúncia correta da instituição |
| **LRV** | `"Lucas do Rio Verde"` | Expansão institucional da sigla |
| **nº** / **Nº** | `"número"` | Leitura por extenso |
| **#142** | `"número 142"` | Leitura natural do protocolo de chamado |
| **login** | `"lóguin"` | Pronúncia fonética brasileira |

---

## 3. Áudios Acelerados e Motor SoundTouch WSOLA (v2)

### 3.1. Síntese e Processamento de Áudio
- **Base Neural**: Síntese neural pt-BR de alta definição via `google-tts-api` (MIT).
- **Decodificação**: `mpg123-decoder` decodifica os buffers para PCM Float32.
- **Aceleração Nativa (SoundTouch WSOLA)**: O algoritmo SoundTouch (WSOLA) acelera o áudio em **1.45x** preservando integralmente o pitch, tom da voz e formantes. Não há distorção "robótica", efeito esquilo nem cortes de sílabas.
- **Codificação Final**: `@breezystack/lamejs` recodifica os dados em MP3 mono a 64 kbps, resultando em arquivos ultra-leves e nítidos.
- **Tamanho Total dos Áudios**: **658.1 KB** (uma economia de ~30% em relação à v1).
- **Duração Total**: Reduzida de 73 segundos para **50 segundos** (aproximadamente dois terços do tempo original), conferindo um ritmo muito mais dinâmico e agradável.
- **Prevenção de Cache**: Os arquivos ficam em `public/audio/tutorial/v2/` com query parameter `?v=v2`, garantindo que clientes e navegadores carreguem a versão atualizada instantaneamente.

### 3.2. Fallback Inteligente (Web Speech API)
- Se a rede bloquear o carregamento dos MP3, o player aciona a **Web Speech API** (`window.speechSynthesis`).
- A taxa de fala é ajustada com `rate = 1.35` e o texto fonético é aplicado via `aplicarPronuncia()`, mantendo o mesmo ritmo e pronúncias corretas das siglas no sintetizador nativo do aparelho.

---

## 4. Roteiro dos 9 Passos Acelerados (50 segundos)

| Passo | Título | Duração Nova | Legenda em Tela | Fala Fonética (Áudio) |
|---|---|---|---|---|
| **1** | Boas-vindas e Acesso ao Menu | ~5s | *"Seja bem-vindo à Central de TI! Para solicitar suporte, acesse o menu 'Abrir Chamado'."* | *"Olá! Seja bem-vindo à Central de tê í do sênai Lucas do Rio Verde. Para registrar um pedido de suporte, basta acessar o menu Abrir Chamado."* |
| **2** | Conferir seus Dados | ~5s | *"Informe seu nome completo. Seu e-mail institucional já vem protegido e preenchido pelo login."* | *"No formulário, informe o seu nome completo. O seu e-mail institucional já vem preenchido automaticamente pelo lóguin e fica protegido."* |
| **3** | Escolher o Setor | ~5s | *"Escolha o seu setor de trabalho para direcionar o atendimento à equipe correta."* | *"Selecione o seu setor de trabalho, como Secretaria, Professores ou Área Técnica. Isso direciona o chamado ao responsável correto."* |
| **4** | Escolher o Tipo de Problema | ~5s | *"Selecione o tipo de problema: Internet / Rede, Impressora, Computador ou outro serviço."* | *"Em seguida, escolha o tipo de problema que você está enfrentando, por exemplo: Internet, Impressora ou Computador."* |
| **5** | Local Exato e Descrição | ~7s | *"Indique o local exato (bloco e sala) e descreva o ocorrido, como: 'Computador sem internet na sala 1'."* | *"Informe o local exato onde você está, indicando bloco e sala. Na descrição, explique de forma simples o ocorrido, como: Computador sem internet na sala 1."* |
| **6** | Ajuda com IA | ~6s | *"Use 'Sugerir texto' ou 'Aprimorar texto' com Inteligência Artificial para refinar sua mensagem."* | *"Precisa de ajuda para escrever? Você pode usar os botões Sugerir texto ou Aprimorar texto para organizar sua mensagem antes do envio."* |
| **7** | Lembrar Dados no Aparelho | ~5s | *"A opção 'Lembrar meus dados' é opcional e salva seu nome e setor no navegador para futuros envios."* | *"A opção 'Lembrar meus dados neste aparelho' é opcional e salva seu nome e setor apenas no seu navegador para agilizar os próximos chamados."* |
| **8** | Envio e Confirmação | ~5s | *"Clique em 'Enviar chamado'. A confirmação com o número do protocolo aparecerá na hora."* | *"Agora clique em Enviar chamado. Uma tela de confirmação mostrará o número do seu chamado registrado e o status de abertura."* |
| **9** | Acompanhamento e Avaliação | ~7s | *"Acompanhe o chamado em 'Meus Chamados'. Quando for Finalizado pela TI, avalie o atendimento recebido!"* | *"Pronto! Você pode acompanhar o andamento em Meus Chamados ou em Acompanhamento. Assim que o atendimento for Finalizado pela tê í, você pode avaliar o suporte recebido."* |

---

## 5. Como Regenerar os Áudios

Caso o roteiro seja alterado no futuro:
1. Edite os textos em `src/content/tutorial-abrir-chamado.ts` ou adicione termos ao dicionário em `src/content/tutorial-pronuncia.ts`.
2. Execute no terminal:
   ```bash
   bun run tutorial:audio
   ```
   *(ou `npm run tutorial:audio`)*
3. Os novos áudios serão sintetizados, acelerados com SoundTouch e salvos em `public/audio/tutorial/v2/`.
