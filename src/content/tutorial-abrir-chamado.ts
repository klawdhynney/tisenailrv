import { aplicarPronuncia } from "./tutorial-pronuncia";

export interface TutorialStep {
  id: number;
  titulo: string;
  tituloCurto: string;
  duracaoSegundos: number;
  /** Texto exibido na legenda sincronizada durante a reprodução (ortografia padrão: TI, IA) */
  legenda: string;
  /** Texto completo exibido na transcrição para leitura acessível */
  textoLeitura: string;
  /** Texto fonético enviado ao motor de síntese de áudio (fonética: "tê í", etc.) */
  fala: string;
  elementoFoco:
    | "inicio"
    | "solicitante_email"
    | "setor"
    | "categoria"
    | "local_descricao"
    | "botoes_ia"
    | "lembrar_dados"
    | "enviar_confirmacao"
    | "acompanhar_avaliar";
  simulacao: {
    solicitante?: string;
    email?: string;
    setor?: string;
    categoria?: string;
    local?: string;
    descricao?: string;
    lembrar?: boolean;
    sucesso?: boolean;
    numeroChamado?: number;
  };
}

export const AUDIO_TUTORIAL_VERSAO = "v2";
export const AUDIO_BASE_PATH = `/audio/tutorial/${AUDIO_TUTORIAL_VERSAO}`;

export const TUTORIAL_PASSOS: TutorialStep[] = [
  {
    id: 1,
    titulo: "1. Boas-vindas e Acesso ao Menu",
    tituloCurto: "1. Início",
    duracaoSegundos: 5,
    legenda: "Seja bem-vindo à Central de TI! Para solicitar suporte, acesse o menu 'Abrir Chamado'.",
    textoLeitura:
      "Olá! Seja bem-vindo à Central de TI do SENAI Lucas do Rio Verde. Para registrar um pedido de suporte, basta acessar o menu Abrir Chamado.",
    fala: aplicarPronuncia(
      "Olá! Seja bem-vindo à Central de TI do SENAI Lucas do Rio Verde. Para registrar um pedido de suporte, basta acessar o menu Abrir Chamado."
    ),
    elementoFoco: "inicio",
    simulacao: {
      solicitante: "",
      email: "maria.silva@exemplo.com",
      setor: "",
      categoria: "",
      local: "",
      descricao: "",
      lembrar: false,
      sucesso: false,
    },
  },
  {
    id: 2,
    titulo: "2. Conferir seus Dados de Identificação",
    tituloCurto: "2. Seus dados",
    duracaoSegundos: 5,
    legenda: "Informe seu nome completo. Seu e-mail institucional já vem protegido e preenchido pelo login.",
    textoLeitura:
      "No formulário, informe o seu nome completo. O seu e-mail institucional já vem preenchido automaticamente pelo login e fica protegido.",
    fala: aplicarPronuncia(
      "No formulário, informe o seu nome completo. O seu e-mail institucional já vem preenchido automaticamente pelo login e fica protegido."
    ),
    elementoFoco: "solicitante_email",
    simulacao: {
      solicitante: "Maria Silva",
      email: "maria.silva@exemplo.com",
      setor: "",
      categoria: "",
      local: "",
      descricao: "",
      lembrar: false,
      sucesso: false,
    },
  },
  {
    id: 3,
    titulo: "3. Escolher o Setor Solicitante",
    tituloCurto: "3. Setor",
    duracaoSegundos: 5,
    legenda: "Escolha o seu setor de trabalho para direcionar o atendimento à equipe correta.",
    textoLeitura:
      "Selecione o seu setor de trabalho, como Secretaria, Professores ou Área Técnica. Isso direciona o chamado ao responsável correto.",
    fala: aplicarPronuncia(
      "Selecione o seu setor de trabalho, como Secretaria, Professores ou Área Técnica. Isso direciona o chamado ao responsável correto."
    ),
    elementoFoco: "setor",
    simulacao: {
      solicitante: "Maria Silva",
      email: "maria.silva@exemplo.com",
      setor: "Secretaria",
      categoria: "",
      local: "",
      descricao: "",
      lembrar: false,
      sucesso: false,
    },
  },
  {
    id: 4,
    titulo: "4. Escolher o Tipo de Problema",
    tituloCurto: "4. Tipo",
    duracaoSegundos: 5,
    legenda: "Selecione o tipo de problema: Internet / Rede, Impressora, Computador ou outro serviço.",
    textoLeitura:
      "Em seguida, escolha o tipo de problema que você está enfrentando, por exemplo: Internet, Impressora ou Computador.",
    fala: aplicarPronuncia(
      "Em seguida, escolha o tipo de problema que você está enfrentando, por exemplo: Internet, Impressora ou Computador."
    ),
    elementoFoco: "categoria",
    simulacao: {
      solicitante: "Maria Silva",
      email: "maria.silva@exemplo.com",
      setor: "Secretaria",
      categoria: "Internet / Rede",
      local: "",
      descricao: "",
      lembrar: false,
      sucesso: false,
    },
  },
  {
    id: 5,
    titulo: "5. Local Exato e Descrição do Problema",
    tituloCurto: "5. Local e Descrição",
    duracaoSegundos: 7,
    legenda: "Indique o local exato (bloco e sala) e descreva o ocorrido, como: 'Computador sem internet na sala 1'.",
    textoLeitura:
      "Informe o local exato onde você está, indicando bloco e sala. Na descrição, explique de forma simples o ocorrido, como: Computador sem internet na sala 1.",
    fala: aplicarPronuncia(
      "Informe o local exato onde você está, indicando bloco e sala. Na descrição, explique de forma simples o ocorrido, como: Computador sem internet na sala 1."
    ),
    elementoFoco: "local_descricao",
    simulacao: {
      solicitante: "Maria Silva",
      email: "maria.silva@exemplo.com",
      setor: "Secretaria",
      categoria: "Internet / Rede",
      local: "Bloco A, Sala 1, Mesa 03",
      descricao: "Computador sem internet na sala 1.",
      lembrar: false,
      sucesso: false,
    },
  },
  {
    id: 6,
    titulo: "6. Ajuda com Inteligência Artificial",
    tituloCurto: "6. Botões de IA",
    duracaoSegundos: 6,
    legenda: "Use 'Sugerir texto' ou 'Aprimorar texto' com Inteligência Artificial para refinar sua mensagem.",
    textoLeitura:
      "Precisa de ajuda para escrever? Você pode usar os botões Sugerir texto ou Aprimorar texto para organizar sua mensagem antes do envio.",
    fala: aplicarPronuncia(
      "Precisa de ajuda para escrever? Você pode usar os botões Sugerir texto ou Aprimorar texto para organizar sua mensagem antes do envio."
    ),
    elementoFoco: "botoes_ia",
    simulacao: {
      solicitante: "Maria Silva",
      email: "maria.silva@exemplo.com",
      setor: "Secretaria",
      categoria: "Internet / Rede",
      local: "Bloco A, Sala 1, Mesa 03",
      descricao:
        "O computador principal da sala 1 perdeu conexão com a internet cabeada. O cabo de rede está conectado, mas a rede não responde.",
      lembrar: false,
      sucesso: false,
    },
  },
  {
    id: 7,
    titulo: "7. Lembrar Dados no Aparelho",
    tituloCurto: "7. Lembrar dados",
    duracaoSegundos: 5,
    legenda: "A opção 'Lembrar meus dados' é opcional e salva seu nome e setor no navegador para futuros envios.",
    textoLeitura:
      "A opção 'Lembrar meus dados neste aparelho' é opcional e salva seu nome e setor apenas no seu navegador para agilizar os próximos chamados.",
    fala: aplicarPronuncia(
      "A opção 'Lembrar meus dados neste aparelho' é opcional e salva seu nome e setor apenas no seu navegador para agilizar os próximos chamados."
    ),
    elementoFoco: "lembrar_dados",
    simulacao: {
      solicitante: "Maria Silva",
      email: "maria.silva@exemplo.com",
      setor: "Secretaria",
      categoria: "Internet / Rede",
      local: "Bloco A, Sala 1, Mesa 03",
      descricao:
        "O computador principal da sala 1 perdeu conexão com a internet cabeada. O cabo de rede está conectado, mas a rede não responde.",
      lembrar: true,
      sucesso: false,
    },
  },
  {
    id: 8,
    titulo: "8. Envio e Confirmação Imediata",
    tituloCurto: "8. Enviar",
    duracaoSegundos: 5,
    legenda: "Clique em 'Enviar chamado'. A confirmação com o número do protocolo aparecerá na hora.",
    textoLeitura:
      "Agora clique em Enviar chamado. Uma tela de confirmação mostrará o número do seu chamado registrado e o status de abertura.",
    fala: aplicarPronuncia(
      "Agora clique em Enviar chamado. Uma tela de confirmação mostrará o número do seu chamado registrado e o status de abertura."
    ),
    elementoFoco: "enviar_confirmacao",
    simulacao: {
      solicitante: "Maria Silva",
      email: "maria.silva@exemplo.com",
      setor: "Secretaria",
      categoria: "Internet / Rede",
      local: "Bloco A, Sala 1, Mesa 03",
      descricao:
        "O computador principal da sala 1 perdeu conexão com a internet cabeada. O cabo de rede está conectado, mas a rede não responde.",
      lembrar: true,
      sucesso: true,
      numeroChamado: 142,
    },
  },
  {
    id: 9,
    titulo: "9. Acompanhamento e Avaliação",
    tituloCurto: "9. Acompanhar",
    duracaoSegundos: 7,
    legenda: "Acompanhe o chamado em 'Meus Chamados'. Quando for Finalizado pela TI, avalie o atendimento recebido!",
    textoLeitura:
      "Pronto! Você pode acompanhar o andamento em Meus Chamados ou em Acompanhamento. Assim que o atendimento for Finalizado, você pode avaliar o suporte recebido.",
    fala: aplicarPronuncia(
      "Pronto! Você pode acompanhar o andamento em Meus Chamados ou em Acompanhamento. Assim que o atendimento for Finalizado pela TI, você pode avaliar o suporte recebido."
    ),
    elementoFoco: "acompanhar_avaliar",
    simulacao: {
      solicitante: "Maria Silva",
      email: "maria.silva@exemplo.com",
      setor: "Secretaria",
      categoria: "Internet / Rede",
      local: "Bloco A, Sala 1, Mesa 03",
      descricao:
        "O computador principal da sala 1 perdeu conexão com a internet cabeada. O cabo de rede está conectado, mas a rede não responde.",
      lembrar: true,
      sucesso: true,
      numeroChamado: 142,
    },
  },
];

export const TOTAL_DURACAO_SEGUNDOS = TUTORIAL_PASSOS.reduce(
  (acc, p) => acc + p.duracaoSegundos,
  0
);
