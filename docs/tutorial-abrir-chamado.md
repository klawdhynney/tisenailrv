# Tutorial Interativo com Narração em Áudio (pt-BR) - Abrir Chamado

Este documento detalha a arquitetura, técnica utilizada, licença, processo de geração de áudio e manutenção do tutorial interativo adicionado à página **Abrir Chamado** (`/abrir`) da Central de TI SENAI Lucas do Rio Verde.

---

## 1. Visão Geral da Arquitetura

Em vez de um arquivo de vídeo MP4 estático e pesado (que rapidamente ficaria desatualizado a cada alteração de campos ou tema), foi desenvolvido um **player interativo animado em React**:
- **Proporção 16:9** fixa (`aspect-video`), prevenindo oscilações de layout (*Cumulative Layout Shift* - CLS).
- **Simulação em tempo real**: Mostra os campos reais sendo preenchidos (digitação animada de nome e descrição, seleção de setor e categoria, ativação dos botões de IA, envio e tela de confirmação).
- **Sem gravação de dados**: 100% no cliente com dados fictícios de teste (`Maria Silva`, `maria.silva@exemplo.com`). Não realiza nenhuma chamada ao back-end, banco de dados ou endpoints externos.
- **Acessibilidade completa (WCAG AA)**: Legendas sincronizadas com `aria-live="polite"`, atalhos de teclado (Espaço, setas, M para mudo, F para tela cheia), foco visível e bloco recolhível com o roteiro completo para leitura.
- **Performance**: Importação dinâmica (`React.lazy` + `Suspense`), pré-carregamento sob demanda e tamanho total de áudio inferior a 1 MB.

---

## 2. Áudios e Narração em Português do Brasil

### 2.1. Ferramenta de Geração e Licença
- **Ferramenta**: `google-tts-api` (versão 2.0.2) executada localmente via Node/Bun em tempo de build/desenvolvimento através do script `scripts/generate-tutorial-audio.mjs`.
- **Voz**: Voz neural pt-BR padrão em português do Brasil (`lang: 'pt-BR'`), com áudio mono MP3 de alta fidelidade e clareza.
- **Licença**: O pacote `google-tts-api` é disponibilizado sob a licença **MIT**, de código aberto e permitido para uso institucional, educacional e comercial sem restrições proprietárias.
- **Segurança de credenciais**: Não utiliza chaves de API privadas nem tokens no repositório ou no navegador.

### 2.2. Fallback Inteligente (Web Speech API)
Caso o áudio pré-gerado falhe ao carregar no dispositivo do usuário ou caso haja restrições de rede:
- O componente ativa automaticamente o fallback com a **Web Speech API** (`window.speechSynthesis`).
- Busca dinamicamente por vozes instaladas no dispositivo que correspondam a `pt-BR` ou `pt`.
- *Nota*: A qualidade do fallback depende do motor de síntese instalado no sistema operacional do usuário (Windows Speech Engine, Android TTS, Apple Siri TTS).

### 2.3. Tamanho dos Arquivos
Os 9 arquivos gerados totalizam **951.4 KB** (~100 KB por arquivo):
- `public/audio/tutorial/step-1.mp3` (110.6 KB) - Início
- `public/audio/tutorial/step-2.mp3` (101.1 KB) - Seus dados
- `public/audio/tutorial/step-3.mp3` (105.2 KB) - Setor
- `public/audio/tutorial/step-4.mp3` (95.1 KB) - Tipo
- `public/audio/tutorial/step-5.mp3` (136.9 KB) - Local e Descrição
- `public/audio/tutorial/step-6.mp3` (94.7 KB) - Botões de IA
- `public/audio/tutorial/step-7.mp3` (103.9 KB) - Lembrar dados
- `public/audio/tutorial/step-8.mp3` (89.4 KB) - Enviar
- `public/audio/tutorial/step-9.mp3` (114.6 KB) - Acompanhar e Avaliar

---

## 3. Roteiro Completo dos 9 Passos (60 a 90 segundos)

| Passo | Título | Duração | Narração Completa |
|---|---|---|---|
| **1** | Boas-vindas e Acesso ao Menu | ~7s | *"Olá! Seja bem-vindo à Central de TI do SENAI Lucas do Rio Verde. Para registrar um pedido de suporte, basta acessar o menu Abrir Chamado."* |
| **2** | Conferir seus Dados | ~8s | *"No formulário, informe o seu nome completo. O seu e-mail institucional já vem preenchido automaticamente pelo login e fica protegido."* |
| **3** | Escolher o Setor | ~7s | *"Selecione o seu setor de trabalho, como Secretaria, Professores ou Área Técnica. Isso direciona o chamado ao responsável correto."* |
| **4** | Escolher o Tipo de Problema | ~7s | *"Em seguida, escolha o tipo de problema que você está enfrentando, por exemplo: Internet, Impressora ou Computador."* |
| **5** | Local Exato e Descrição | ~10s | *"Informe o local exato onde você está, indicando bloco e sala. Na descrição, explique de forma simples o ocorrido, como: Computador sem internet na sala 1."* |
| **6** | Ajuda com Inteligência Artificial | ~9s | *"Precisa de ajuda para escrever? Você pode usar os botões Sugerir texto ou Aprimorar texto para organizar sua mensagem antes do envio."* |
| **7** | Lembrar Dados no Aparelho | ~7s | *"A opção 'Lembrar meus dados neste aparelho' é opcional e salva seu nome e setor apenas no seu navegador para agilizar os próximos chamados."* |
| **8** | Envio e Confirmação Imediata | ~8s | *"Agora clique em Enviar chamado. Uma tela de confirmação mostrará o número do seu chamado registrado e o status de abertura."* |
| **9** | Acompanhamento e Avaliação | ~10s | *"Pronto! Você pode acompanhar o andamento em Meus Chamados ou em Acompanhamento. Assim que o atendimento for Finalizado, você pode avaliar o suporte recebido."* |

**Duração total estimada**: 73 segundos.

---

## 4. Como Editar o Roteiro e Regenerar os Áudios

1. Abra o arquivo de conteúdo:
   `src/content/tutorial-abrir-chamado.ts`
2. Modifique os textos em `narracao`, `legenda` ou `duracaoSegundos` de qualquer um dos passos.
3. No terminal, execute o comando:
   ```bash
   npm run tutorial:audio
   ```
   *(ou `bun run tutorial:audio`)*
4. O script baixará e atualizará automaticamente os arquivos em `public/audio/tutorial/step-{1..9}.mp3`.
5. Execute o build para validar:
   ```bash
   bun run build
   ```

---

## 5. Controle no Painel de Ajustes (Administradores)

- No menu do gestor/administrador em `/regras` (Aba **Abrir Chamado**):
  - Há a opção **"Exibir tutorial interativo com demonstração na página"**.
  - O valor é persistido na tabela `regras` (coluna JSONB `regras.abrirChamado.exibirTutorial`).
  - **Padrão**: Ligado (`true`).
  - Caso haja falha de carregamento ou valor nulo, o sistema mantém o tutorial visível por padrão.
