// Travessia's brand content: the single typed source both presentations read
// from. Real Brazilian islands, wildlife and seasons; an openly fictional
// brand, ship, crew and itinerary.
export type Brand = {
  name: string;
  tagline: string;
  ship: string;
  disclosure: string;
  nextDeparture: string;
};

export const brand: Brand = {
  name: "Travessia",
  tagline: "O Brasil visto do mar.",
  ship: "Maré Mansa",
  disclosure:
    "Travessia é uma comissão fictícia. Esta viagem combina lugares, paisagens, organismos e temporadas reais da costa brasileira com um navio, uma tripulação e um roteiro imaginados. Nenhuma reserva, tripulação ou embarque descritos aqui existe de fato.",
  nextDeparture: "Próxima partida · setembro de 2027",
};

export type StopId =
  | "partida"
  | "fernando-de-noronha"
  | "boipeba"
  | "abrolhos"
  | "ilha-grande";

// An illustrative, AI-generated image the Stop Account shows; see
// content/asset-manifest.json for its provenance entry.
export type ImageSlot = { src: string; alt: string; caption: string };

export type Highlight = { title: string; text: string };

// The complete content of a Stop, read as one continuous scroll.
export type StopAccount = {
  day: string;
  introduction: string;
  highlights: [Highlight, Highlight, Highlight];
  bestSeason: string;
  images: [ImageSlot] | [ImageSlot, ImageSlot];
};

// A Stop Card shows the context line, the name, and the introduction sentence.
// Stop 00 is the opening and has no account.
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
    name: brand.name,
    context: "Partida",
    introduction: brand.tagline,
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
        "Depois de uma noite em mar aberto, o Maré Mansa ancora diante do Morro do Pico, o paredão vulcânico que marca a chegada ao arquipélago. A água clara revela o fundo a muitos metros de profundidade, e o dia a bordo começa cedo, no ritmo da ilha e das marés.",
      highlights: [
        {
          title: "Golfinhos-rotadores na Baía dos Golfinhos",
          text: "Ao amanhecer, grupos de golfinhos-rotadores entram na baía para descansar depois de uma noite caçando em mar aberto. A tripulação observa do mirante, em silêncio e a distância segura, sem entrar na água.",
        },
        {
          title: "Mergulho livre na Baía do Sancho",
          text: "Com guias naturalistas credenciados, pequenos grupos snorkelam entre tartarugas-verdes, cardumes de peixes recifais e paredões de pedra, numa das baías mais preservadas do arquipélago.",
        },
        {
          title: "Pôr do sol no Forte do Boldró",
          text: "A última luz do dia desenha a silhueta dos Dois Irmãos no horizonte, um mirante tradicional para observar o entardecer antes de voltar a bordo para o jantar.",
        },
      ],
      bestSeason:
        "De agosto a janeiro, quando o mar está mais calmo e a visibilidade debaixo d'água é melhor para o mergulho livre.",
      images: [
        {
          src: "/images/noronha-1.v1.webp",
          alt: "O Morro do Pico visto do mar ao amanhecer, com um navio de expedição ancorado em primeiro plano.",
          caption: "Chegada ao arquipélago, ao amanhecer.",
        },
        {
          src: "/images/noronha-2.v1.webp",
          alt: "Um golfinho-rotador saltando perto da superfície em água azul-turquesa clara.",
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
        "Na Costa do Dendê, o Maré Mansa fundeia ao largo e botes menores levam os viajantes até vilarejos sem carros, entre rios de água escura, coqueirais e areia branca fina. Sem asfalto nem carros, a ilha se atravessa a pé, de bicicleta ou de canoa, e o ritmo em terra passa a ser o da maré, não o do relógio.",
      highlights: [
        {
          title: "Piscinas naturais de Moreré",
          text: "Na maré baixa, os recifes rasos formam piscinas mornas e transparentes, cheias de peixes coloridos, a poucos passos da praia de Moreré. A profundidade muda ao longo do dia, então cada visita revela um recife diferente.",
        },
        {
          title: "Remada pelo manguezal",
          text: "Um passeio lento de caiaque pelo Rio do Inferno, entre raízes aéreas, caranguejos-uçá e garças-brancas pousadas na lama exposta pela maré baixa.",
        },
        {
          title: "Moqueca na Boca da Barra",
          text: "Um almoço demorado numa cozinha de família, à beira do encontro entre o rio e o mar, com peixe fresco, leite de coco e dendê da própria ilha.",
        },
      ],
      bestSeason:
        "De setembro a março, com dias mais secos e marés baixas concentradas nas primeiras horas da manhã.",
      images: [
        {
          src: "/images/boipeba-1.v1.webp",
          alt: "Piscina natural de água clara entre recifes na maré baixa, com coqueiros ao fundo em uma ilha brasileira.",
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
        "O Maré Mansa chega ao primeiro parque nacional marinho do Brasil, criado em 1983 para proteger seus recifes e sua vida marinha. Aqui a visita segue as regras do parque, e cada saída de bote é acompanhada por guias credenciados pelo ICMBio.",
      highlights: [
        {
          title: "Baleias-jubarte",
          text: "Entre julho e novembro, as jubartes migram até as águas rasas e quentes de Abrolhos para acasalar e ter filhotes. Os saltos e as caudas podem ser vistos do próprio convés, a distância regulamentada.",
        },
        {
          title: "Chapeirões de coral",
          text: "Colunas de coral em forma de mesa, únicas desta região do Atlântico, abrigam uma vida marinha densa e são o retrato mais conhecido do parque.",
        },
        {
          title: "Ilha de Santa Bárbara",
          text: "A única ilha do arquipélago aberta à visitação guiada, com o farol histórico da Marinha e grandes colônias de aves marinhas nidificando nas encostas.",
        },
      ],
      bestSeason:
        "De julho a novembro para observar as baleias-jubarte; de dezembro a março para a melhor visibilidade de mergulho.",
      images: [
        {
          src: "/images/abrolhos-1.v1.webp",
          alt: "Baleia-jubarte saltando fora da água perto de uma ilha rochosa e baixa no arquipélago de Abrolhos.",
          caption: "Temporada das jubartes em Abrolhos.",
        },
        {
          src: "/images/abrolhos-2.v1.webp",
          alt: "Um chapeirão de coral em forma de mesa visto de perto debaixo d'água, cercado por peixes recifais.",
          caption: "Um chapeirão visto de perto, debaixo d'água.",
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
        "A viagem termina na baía da Ilha Grande, entre montanhas cobertas por um dos últimos grandes remanescentes de mata atlântica preservada, e enseadas protegidas onde o mar quase não tem ondas. Os últimos dois dias a bordo têm um ritmo mais lento, de desacelerar antes do desembarque.",
      highlights: [
        {
          title: "Lopes Mendes",
          text: "Uma trilha curta pela mata, ou um passeio de bote, leva a uma das praias mais longas e preservadas da ilha, com areia clara, ondas suaves e mata fechada até a linha da água.",
        },
        {
          title: "Lagoa Azul",
          text: "Água calma e transparente entre pequenas ilhas rochosas, um dos pontos mais procurados da baía para um último mergulho livre antes do fim da viagem.",
        },
        {
          title: "Jantar de despedida",
          text: "A tripulação serve o último jantar no convés, ancorados em frente a Abraão, com as luzes da vila refletidas na água parada da baía sob o céu já escuro.",
        },
      ],
      bestSeason:
        "De abril a outubro, fora do pico de chuvas de verão, com trilhas mais secas e o mar da baía geralmente mais calmo.",
      images: [
        {
          src: "/images/ilha-grande-1.v1.webp",
          alt: "Enseada de água verde-esmeralda cercada por morros cobertos de mata atlântica, com pequenos barcos ao longe.",
          caption: "Enseada na baía da Ilha Grande.",
        },
      ],
    },
  },
];

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
