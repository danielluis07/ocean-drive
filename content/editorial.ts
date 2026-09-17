export const wrapperDisclosure =
  "Travessia é uma comissão fictícia. Esta viagem combina lugares, paisagens, organismos, temporadas e fenômenos reais da costa brasileira com um navio, uma tripulação e um percurso imaginados. A experiência não mostra as condições atuais dos recifes.";

// Travessia's Core Promise, the invitation on the opening Stop.
export const corePromise = "O Brasil visto do mar.";

export type StopId =
  | "partida"
  | "fernando-de-noronha"
  | "boipeba"
  | "abrolhos"
  | "ilha-grande";

// An illustrative image the Stop Account reserves; the pictures arrive with the
// voyage content, so for now each slot carries only its description.
export type ImageSlot = { alt: string; caption: string };

export type Highlight = { title: string; text: string };

// The complete content of a Stop, read as one continuous scroll.
export type StopAccount = {
  day: string;
  introduction: string;
  highlights: [Highlight, Highlight, Highlight];
  bestSeason: string;
  images: [ImageSlot] | [ImageSlot, ImageSlot];
};

// Placeholder Stop copy: the Travessia voyage content is written in a later
// issue. Stop 00 is the opening and has no account.
// A Stop Card shows the context line, the name, and the introduction sentence.
export type Stop = {
  id: StopId;
  name: string;
  context: string;
  introduction: string;
  account: StopAccount | null;
};

export const stops: Stop[] = [
  {
    id: "partida",
    name: "Travessia",
    context: "Partida",
    introduction: corePromise,
    account: null,
  },
  {
    id: "fernando-de-noronha",
    name: "Fernando de Noronha",
    context: "Pernambuco · Dia 2",
    introduction:
      "Um arquipélago vulcânico isolado no Atlântico, onde a viagem começa de verdade.",
    account: {
      day: "Dias 2 e 3",
      introduction:
        "Depois de uma noite em mar aberto, o Maré Mansa ancora diante do Morro do Pico. A água clara revela o fundo a muitos metros, e o dia começa cedo, no ritmo da ilha.",
      highlights: [
        {
          title: "Golfinhos-rotadores na Baía dos Golfinhos",
          text: "Ao amanhecer, grupos de golfinhos-rotadores entram na baía para descansar. Observamos do mirante, em silêncio, sem entrar na água.",
        },
        {
          title: "Mergulho livre na Baía do Sancho",
          text: "Com guias naturalistas, a tripulação acompanha pequenos grupos entre tartarugas, peixes recifais e paredões de pedra.",
        },
        {
          title: "Pôr do sol no Forte do Boldró",
          text: "A última luz do dia desenha os Dois Irmãos no horizonte antes do jantar a bordo.",
        },
      ],
      bestSeason:
        "De agosto a janeiro, com mar mais calmo e ótima visibilidade para o mergulho.",
      images: [
        {
          alt: "O Morro do Pico visto do mar, ao amanhecer, com o Maré Mansa ancorado em primeiro plano.",
          caption: "Chegada ao arquipélago, ao amanhecer.",
        },
        {
          alt: "Golfinhos-rotadores nadando próximos à superfície em água azul-turquesa.",
          caption: "Golfinhos-rotadores na Baía dos Golfinhos.",
        },
      ],
    },
  },
  {
    id: "boipeba",
    name: "Boipeba",
    context: "Bahia · Dia 5",
    introduction:
      "Uma ilha baixa de coqueirais, piscinas naturais e manguezais.",
    account: {
      day: "Dias 5 e 6",
      introduction:
        "Na costa do Dendê, o navio para ao largo e os botes levam os viajantes até vilarejos sem carros, entre rios, coqueiros e areia branca.",
      highlights: [
        {
          title: "Piscinas naturais de Moreré",
          text: "Na maré baixa, os recifes formam piscinas mornas e rasas, cheias de peixes coloridos.",
        },
        {
          title: "Remada pelo manguezal",
          text: "Um passeio lento de caiaque pelo rio do Inferno, com caranguejos, garças e raízes aéreas.",
        },
        {
          title: "Moqueca na Boca da Barra",
          text: "Um almoço demorado em uma cozinha local, à beira do encontro entre o rio e o mar.",
        },
      ],
      bestSeason:
        "De setembro a março, com dias secos e marés baixas pela manhã.",
      images: [
        {
          alt: "Piscina natural de água clara entre recifes na maré baixa, com coqueiros ao fundo.",
          caption: "Piscinas naturais de Moreré na maré baixa.",
        },
      ],
    },
  },
  {
    id: "abrolhos",
    name: "Arquipélago de Abrolhos",
    context: "Bahia · Dia 8",
    introduction:
      "Cinco ilhas sobre o maior banco de corais do Atlântico Sul.",
    account: {
      day: "Dias 8 e 9",
      introduction:
        "O Maré Mansa chega ao primeiro parque nacional marinho do Brasil. Aqui a visita segue regras do parque, e cada saída é acompanhada por guias credenciados.",
      highlights: [
        {
          title: "Baleias-jubarte",
          text: "Entre julho e novembro, as jubartes vêm à região para ter filhotes. Os saltos podem ser vistos do próprio convés.",
        },
        {
          title: "Chapeirões de coral",
          text: "Colunas de coral em forma de cogumelo, únicas desta região, abrigam uma vida marinha abundante.",
        },
        {
          title: "Ilha de Santa Bárbara",
          text: "A única ilha habitada, com o farol histórico e colônias de aves marinhas.",
        },
      ],
      bestSeason:
        "De julho a novembro para as baleias; de dezembro a março para a melhor visibilidade.",
      images: [
        {
          alt: "Baleia-jubarte saltando fora da água perto de uma ilha rochosa e baixa.",
          caption: "Temporada das jubartes em Abrolhos.",
        },
        {
          alt: "Chapeirão de coral visto de cima, em água rasa e clara.",
          caption: "Um chapeirão visto da superfície.",
        },
      ],
    },
  },
  {
    id: "ilha-grande",
    name: "Ilha Grande",
    context: "Rio de Janeiro · Dia 12",
    introduction:
      "A chegada: uma ilha de mata atlântica entre enseadas calmas.",
    account: {
      day: "Dias 12 e 13",
      introduction:
        "A viagem termina na baía da Ilha Grande, entre montanhas cobertas de mata atlântica e enseadas protegidas, com tempo para desacelerar antes do desembarque.",
      highlights: [
        {
          title: "Lopes Mendes",
          text: "Uma trilha curta pela mata leva a uma das praias mais longas e preservadas da ilha.",
        },
        {
          title: "Lagoa Azul",
          text: "Água calma e transparente entre pequenas ilhas, ideal para um último mergulho livre.",
        },
        {
          title: "Jantar de despedida",
          text: "A tripulação serve o último jantar no convés, ancorado em Abraão, sob as luzes da vila.",
        },
      ],
      bestSeason:
        "De abril a outubro, com menos chuva e trilhas mais secas.",
      images: [
        {
          alt: "Enseada de água verde-esmeralda cercada por morros cobertos de floresta.",
          caption: "Enseada na baía da Ilha Grande.",
        },
      ],
    },
  },
];

// The Arrival's closing card and the complete itinerary it opens.
export const nextDeparture = "Próxima partida · setembro de 2027";

export type ItineraryDay = { days: string; place: string; text: string };

export const itinerary: ItineraryDay[] = [
  {
    days: "Dia 1",
    place: "Recife",
    text: "Embarque no fim da tarde e primeira noite em mar aberto.",
  },
  {
    days: "Dias 2 e 3",
    place: "Fernando de Noronha",
    text: "Golfinhos-rotadores, mergulho livre e pôr do sol no arquipélago.",
  },
  {
    days: "Dia 4",
    place: "Em navegação",
    text: "Um dia no mar, com conversas dos naturalistas no convés.",
  },
  {
    days: "Dias 5 e 6",
    place: "Boipeba",
    text: "Piscinas naturais, manguezais e vilarejos sem carros.",
  },
  {
    days: "Dia 7",
    place: "Em navegação",
    text: "Costa do Descobrimento ao longe, rumo ao sul.",
  },
  {
    days: "Dias 8 e 9",
    place: "Arquipélago de Abrolhos",
    text: "Baleias-jubarte, chapeirões de coral e a Ilha de Santa Bárbara.",
  },
  {
    days: "Dias 10 e 11",
    place: "Em navegação",
    text: "Dois dias de mar ao longo da costa do Espírito Santo e do Rio de Janeiro.",
  },
  {
    days: "Dias 12 e 13",
    place: "Ilha Grande",
    text: "Trilhas, enseadas calmas e o jantar de despedida.",
  },
  {
    days: "Dia 14",
    place: "Angra dos Reis",
    text: "Desembarque pela manhã.",
  },
];
