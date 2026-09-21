// Travessia's brand content: the single typed source both presentations read
// from. Real Brazilian islands, wildlife and seasons; an openly fictional
// brand, ship, crew and itinerary.
export type Brand = {
  name: string;
  tagline: string;
  ship: string;
  disclosure: string;
  // Credits the open data the island Landmarks are built from. OpenStreetMap's
  // ODbL requires this notice wherever the meshes are shown.
  dataCredit: string;
  nextDeparture: string;
};

export const brand: Brand = {
  name: "Travessia",
  tagline: "O Brasil visto do mar.",
  ship: "Maré Mansa",
  disclosure:
    "Travessia é uma comissão fictícia. Reúne lugares, paisagens, fauna e temporadas reais da costa brasileira com um navio, uma tripulação e um roteiro imaginados. As reservas, a tripulação e as partidas descritas aqui não existem.",
  dataCredit:
    "As ilhas em 3D foram modeladas a partir de dados abertos: linha de costa © colaboradores do OpenStreetMap (ODbL 1.0) e dados de elevação SRTM do U.S. Geological Survey. As formas são reconhecíveis, mas distâncias e escalas foram comprimidas e não devem ser usadas para navegação.",
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
      "Um arquipélago vulcânico remoto no Atlântico, e a primeira chegada de verdade da viagem.",
    account: {
      day: "Dias 2 e 3",
      introduction:
        "Depois de uma noite no mar, o Maré Mansa ancora ao pé do Morro do Pico, o paredão vulcânico que anuncia o arquipélago. Na água clara, o fundo continua visível muitos metros abaixo. A vida a bordo começa cedo e segue as marés da ilha.",
      highlights: [
        {
          title: "Golfinhos-rotadores na Baía dos Golfinhos",
          text: "Ao amanhecer, os golfinhos-rotadores voltam à baía para descansar depois de uma noite caçando em mar aberto. A tripulação observa do mirante, em silêncio e a uma distância respeitosa.",
        },
        {
          title: "Mergulho livre na Baía do Sancho",
          text: "Com guias naturalistas credenciados, pequenos grupos fazem snorkel entre tartarugas-verdes, peixes de recife e paredões de pedra, numa das baías mais bem protegidas do arquipélago.",
        },
        {
          title: "Pôr do sol no Forte do Boldró",
          text: "Quando a luz se apaga, os Dois Irmãos escurecem contra o horizonte. É um lugar tradicional para ver o fim do dia antes do jantar a bordo.",
        },
      ],
      bestSeason:
        "De agosto a janeiro, quando o mar está mais calmo e a visibilidade debaixo d'água é melhor para o mergulho livre.",
      images: [
        {
          src: "/images/noronha-1.v1.webp",
          alt: "O Morro do Pico ao amanhecer, visto do mar, com um navio de expedição ancorado em primeiro plano.",
          caption: "Chegada ao arquipélago, ao amanhecer.",
        },
        {
          src: "/images/noronha-2.v1.webp",
          alt: "Um golfinho-rotador rompendo a superfície em água turquesa clara.",
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
        "Na Costa do Dendê, o Maré Mansa fundeia ao largo e botes pequenos levam os viajantes a vilarejos sem carros, entre rios de água escura, coqueirais e areia branca e fina. Anda-se a pé, de bicicleta ou de canoa. Em terra, quem dá o ritmo é a maré.",
      highlights: [
        {
          title: "Piscinas naturais de Moreré",
          text: "Na maré baixa, os recifes rasos viram piscinas mornas e transparentes, cheias de peixes coloridos, a poucos passos da praia de Moreré. Como o nível da água muda, o recife parece diferente a cada visita.",
        },
        {
          title: "Remada pelo manguezal",
          text: "Um passeio lento de caiaque pelo Rio do Inferno, entre raízes aéreas, caranguejos-uçá e garças-brancas paradas na lama exposta pela maré vazante.",
        },
        {
          title: "Moqueca na Boca da Barra",
          text: "Um almoço demorado numa cozinha de família, onde o rio encontra o mar, com peixe fresco, leite de coco e azeite de dendê da própria ilha.",
        },
      ],
      bestSeason:
        "De setembro a março, quando os dias mais secos coincidem com marés baixas nas primeiras horas da manhã.",
      images: [
        {
          src: "/images/boipeba-1.v1.webp",
          alt: "Piscina natural de água clara entre recifes na maré baixa, com coqueiros ao fundo, numa ilha brasileira.",
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
        "O Maré Mansa chega ao primeiro parque nacional marinho do Brasil, criado em 1983 para proteger seus recifes e sua vida marinha. As visitas seguem as regras do parque, e guias credenciados pelo ICMBio acompanham todos os passeios de bote.",
      highlights: [
        {
          title: "Baleias-jubarte",
          text: "De julho a novembro, as jubartes chegam às águas rasas e quentes de Abrolhos para acasalar e dar à luz. Saltos e batidas de cauda podem ser vistos do convés, à distância regulamentada.",
        },
        {
          title: "Chapeirões de coral",
          text: "Essas colunas de coral em forma de mesa são únicas desta parte do Atlântico. Uma vida marinha densa se reúne ao redor delas, e são a imagem mais conhecida do parque.",
        },
        {
          title: "Ilha de Santa Bárbara",
          text: "A única ilha do arquipélago aberta a visitas guiadas, com um farol histórico da Marinha e grandes colônias de aves marinhas nidificando nas encostas.",
        },
      ],
      bestSeason:
        "De julho a novembro para ver as baleias-jubarte; de dezembro a março para a melhor visibilidade de mergulho.",
      images: [
        {
          src: "/images/abrolhos-1.v1.webp",
          alt: "Uma baleia-jubarte saltando perto de uma ilha rochosa e baixa no Arquipélago de Abrolhos.",
          caption: "Temporada das jubartes em Abrolhos.",
        },
        {
          src: "/images/abrolhos-2.v1.webp",
          alt: "Vista de perto, debaixo d'água, de um chapeirão de coral em forma de mesa cercado por peixes de recife.",
          caption: "Um chapeirão de coral visto de perto, debaixo d'água.",
        },
      ],
    },
  },
  {
    id: "ilha-grande",
    name: "Ilha Grande",
    context: "Rio de Janeiro · Dia 12",
    introduction:
      "A última parada: mata atlântica sobre enseadas calmas.",
    account: {
      day: "Dias 12 e 13",
      introduction:
        "A viagem termina na baía da Ilha Grande, entre montanhas cobertas por um dos últimos grandes remanescentes de mata atlântica preservada e enseadas protegidas onde o mar quase não quebra. Os últimos dias a bordo desaceleram rumo ao desembarque.",
      highlights: [
        {
          title: "Lopes Mendes",
          text: "Uma trilha curta pela mata ou um passeio de bote leva a uma das praias mais longas e bem preservadas da ilha, com areia clara, ondas suaves e mata chegando até a linha da água.",
        },
        {
          title: "Lagoa Azul",
          text: "Água calma e transparente entre pequenas ilhas rochosas faz deste um lugar procurado para um último mergulho livre antes do fim da viagem.",
        },
        {
          title: "Jantar de despedida",
          text: "A tripulação serve o último jantar no convés, ancorados diante de Abraão, enquanto as luzes da vila ondulam pela baía depois de escurecer.",
        },
      ],
      bestSeason:
        "De abril a outubro, fora do pico de chuvas de verão, com trilhas mais secas e a água da baía geralmente mais calma.",
      images: [
        {
          src: "/images/ilha-grande-1.v1.webp",
          alt: "Uma enseada de água verde-esmeralda cercada por morros cobertos de mata atlântica, com pequenos barcos ao longe.",
          caption: "Uma enseada na baía da Ilha Grande.",
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
    text: "Embarque no fim da tarde, seguido da primeira noite no mar.",
  },
  {
    days: "Dias 2 e 3",
    place: "Fernando de Noronha",
    text: "Golfinhos-rotadores, mergulho livre e pôr do sol no arquipélago.",
  },
  {
    days: "Dia 4",
    place: "Em navegação",
    text: "Um dia na água, com conversas de naturalistas no convés.",
  },
  {
    days: "Dias 5 e 6",
    place: "Boipeba",
    text: "Piscinas naturais, manguezais e vilarejos sem carros.",
  },
  {
    days: "Dia 7",
    place: "Em navegação",
    text: "A Costa do Descobrimento no horizonte, com o navio rumo ao sul.",
  },
  {
    days: "Dias 8 e 9",
    place: "Arquipélago de Abrolhos",
    text: "Baleias-jubarte, chapeirões de coral e a Ilha de Santa Bárbara.",
  },
  {
    days: "Dias 10 e 11",
    place: "Em navegação",
    text: "Dois dias ao longo das costas do Espírito Santo e do Rio de Janeiro.",
  },
  {
    days: "Dias 12 e 13",
    place: "Ilha Grande",
    text: "Trilhas na mata, enseadas calmas e o jantar de despedida.",
  },
  {
    days: "Dia 14",
    place: "Angra dos Reis",
    text: "Desembarque pela manhã.",
  },
];
