/**
 * 動詞のデータ。
 *
 * 持つのは次の4つだけ。活用表は保存しない。
 *   - 不規則な単純形だけ（規則どおりの時制は書かない）
 *   - 過去分詞。規則どおり（-ato/-uto/-ito）なら null にして生成させる
 *   - 複合時制で avere と essere のどちらを取るか
 *   - essere を取るなら過去分詞が主語と性数一致する（agree）
 *
 * tail は例文の後半。「Io ___ al cinema.」の "al cinema" にあたる。
 * 主語の代名詞は人称から作るので、動詞1つにつき短い一文ぶんで足りる。
 */

/**
 * @typedef {object} VerbEntry
 * @property {string} inf 不定詞
 * @property {string} ja 訳
 * @property {string} tail 例文の後半
 * @property {'avere'|'essere'} aux 複合時制で取る助動詞
 * @property {string|null} [pp] 不規則な過去分詞。規則どおりなら省略
 * @property {boolean} [isc] -ire の -isc- 型
 * @property {Record<string,string[]>} [irregular] 不規則な単純形
 */

/** @type {VerbEntry[]} */
export const VERBS = [
  // ------------------------------------------------ 現在形が不規則（頻度順）
  {
    inf: 'essere',
    ja: '〜である',
    tail: 'in ritardo',
    aux: 'essere',
    pp: 'stato',
    irregular: {
      presente: ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'],
    },
  },
  {
    inf: 'avere',
    ja: '持っている',
    tail: 'fame',
    aux: 'avere',
    irregular: {
      presente: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'],
    },
  },
  {
    inf: 'fare',
    ja: 'する、作る',
    tail: 'colazione',
    aux: 'avere',
    pp: 'fatto',
    irregular: {
      presente: ['faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno'],
    },
  },
  {
    inf: 'andare',
    ja: '行く',
    tail: 'al cinema',
    aux: 'essere',
    irregular: {
      presente: ['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno'],
    },
  },
  {
    inf: 'stare',
    ja: 'いる、調子が〜だ',
    tail: 'bene',
    aux: 'essere',
    irregular: {
      presente: ['sto', 'stai', 'sta', 'stiamo', 'state', 'stanno'],
    },
  },
  {
    inf: 'dare',
    ja: '与える',
    tail: 'una mano',
    aux: 'avere',
    irregular: {
      presente: ['do', 'dai', 'dà', 'diamo', 'date', 'danno'],
    },
  },
  {
    inf: 'dire',
    ja: '言う',
    tail: 'la verità',
    aux: 'avere',
    pp: 'detto',
    irregular: {
      presente: ['dico', 'dici', 'dice', 'diciamo', 'dite', 'dicono'],
    },
  },
  {
    inf: 'potere',
    ja: '〜できる',
    tail: 'aiutare',
    aux: 'avere',
    irregular: {
      presente: ['posso', 'puoi', 'può', 'possiamo', 'potete', 'possono'],
    },
  },
  {
    inf: 'volere',
    ja: '〜したい',
    tail: 'un caffè',
    aux: 'avere',
    irregular: {
      presente: ['voglio', 'vuoi', 'vuole', 'vogliamo', 'volete', 'vogliono'],
    },
  },
  {
    inf: 'dovere',
    ja: '〜しなければならない',
    tail: 'studiare',
    aux: 'avere',
    irregular: {
      presente: ['devo', 'devi', 'deve', 'dobbiamo', 'dovete', 'devono'],
    },
  },
  {
    inf: 'sapere',
    ja: '知っている',
    tail: "l'indirizzo",
    aux: 'avere',
    irregular: {
      presente: ['so', 'sai', 'sa', 'sappiamo', 'sapete', 'sanno'],
    },
  },
  {
    inf: 'venire',
    ja: '来る',
    tail: 'con noi',
    aux: 'essere',
    pp: 'venuto', // 規則形は venito になってしまう
    irregular: {
      presente: ['vengo', 'vieni', 'viene', 'veniamo', 'venite', 'vengono'],
    },
  },
  {
    inf: 'uscire',
    ja: '出かける',
    tail: 'con gli amici',
    aux: 'essere',
    irregular: {
      presente: ['esco', 'esci', 'esce', 'usciamo', 'uscite', 'escono'],
    },
  },
  {
    inf: 'bere',
    ja: '飲む',
    tail: 'un bicchiere di vino',
    aux: 'avere',
    pp: 'bevuto',
    irregular: {
      presente: ['bevo', 'bevi', 'beve', 'beviamo', 'bevete', 'bevono'],
    },
  },
  {
    inf: 'rimanere',
    ja: 'とどまる',
    tail: 'a casa',
    aux: 'essere',
    pp: 'rimasto',
    irregular: {
      presente: [
        'rimango',
        'rimani',
        'rimane',
        'rimaniamo',
        'rimanete',
        'rimangono',
      ],
    },
  },
  {
    inf: 'tenere',
    ja: '保つ、持っている',
    tail: 'le chiavi',
    aux: 'avere',
    irregular: {
      presente: ['tengo', 'tieni', 'tiene', 'teniamo', 'tenete', 'tengono'],
    },
  },
  {
    inf: 'scegliere',
    ja: '選ぶ',
    tail: 'il vino',
    aux: 'avere',
    pp: 'scelto',
    irregular: {
      presente: [
        'scelgo',
        'scegli',
        'sceglie',
        'scegliamo',
        'scegliete',
        'scelgono',
      ],
    },
  },
  {
    inf: 'piacere',
    ja: '気に入る',
    tail: 'a tutti',
    aux: 'essere',
    pp: 'piaciuto',
    irregular: {
      presente: [
        'piaccio',
        'piaci',
        'piace',
        'piacciamo',
        'piacete',
        'piacciono',
      ],
    },
  },
  {
    inf: 'salire',
    ja: '乗る、のぼる',
    tail: 'sul treno',
    aux: 'essere',
    irregular: {
      presente: ['salgo', 'sali', 'sale', 'saliamo', 'salite', 'salgono'],
    },
  },
  {
    inf: 'morire',
    ja: '死ぬ',
    tail: 'di fame',
    aux: 'essere',
    pp: 'morto',
    irregular: {
      presente: ['muoio', 'muori', 'muore', 'moriamo', 'morite', 'muoiono'],
    },
  },

  // ------------------------------- 現在形は規則どおりだが過去分詞が不規則
  { inf: 'vedere', ja: '見る', tail: 'un film', aux: 'avere', pp: 'visto' },
  { inf: 'prendere', ja: '取る、乗る', tail: 'il treno', aux: 'avere', pp: 'preso' },
  { inf: 'scrivere', ja: '書く', tail: 'una mail', aux: 'avere', pp: 'scritto' },
  { inf: 'leggere', ja: '読む', tail: 'il giornale', aux: 'avere', pp: 'letto' },
  { inf: 'chiedere', ja: '尋ねる', tail: 'una informazione', aux: 'avere', pp: 'chiesto' },
  { inf: 'mettere', ja: '置く', tail: 'la borsa sul tavolo', aux: 'avere', pp: 'messo' },
  { inf: 'chiudere', ja: '閉める', tail: 'la finestra', aux: 'avere', pp: 'chiuso' },
  { inf: 'perdere', ja: '失う、乗り遅れる', tail: 'il treno', aux: 'avere', pp: 'perso' },
  { inf: 'aprire', ja: '開ける', tail: 'la porta', aux: 'avere', pp: 'aperto' },
  { inf: 'offrire', ja: 'おごる', tail: 'il caffè', aux: 'avere', pp: 'offerto' },
  { inf: 'nascere', ja: '生まれる', tail: 'a Roma', aux: 'essere', pp: 'nato' },
  { inf: 'scendere', ja: '降りる', tail: 'alla prossima fermata', aux: 'essere', pp: 'sceso' },

  // -------------------------------------------------------- 完全に規則的
  { inf: 'parlare', ja: '話す', tail: 'italiano', aux: 'avere' },
  { inf: 'mangiare', ja: '食べる', tail: 'una pizza', aux: 'avere' },
  { inf: 'lavorare', ja: '働く', tail: 'in ufficio', aux: 'avere' },
  { inf: 'guardare', ja: '見る、眺める', tail: 'la partita', aux: 'avere' },
  { inf: 'comprare', ja: '買う', tail: 'il pane', aux: 'avere' },
  { inf: 'studiare', ja: '勉強する', tail: "l'italiano", aux: 'avere' },
  { inf: 'abitare', ja: '住む', tail: 'a Milano', aux: 'avere' },
  { inf: 'cercare', ja: '探す', tail: 'la stazione', aux: 'avere' },
  { inf: 'arrivare', ja: '着く', tail: 'in ritardo', aux: 'essere' },
  { inf: 'entrare', ja: '入る', tail: 'nel negozio', aux: 'essere' },
  { inf: 'tornare', ja: '戻る', tail: 'a casa', aux: 'essere' },
  { inf: 'restare', ja: '残る', tail: 'in ufficio', aux: 'essere' },
  { inf: 'credere', ja: '信じる', tail: 'a questa storia', aux: 'avere' },
  { inf: 'vendere', ja: '売る', tail: 'la macchina', aux: 'avere' },
  { inf: 'dormire', ja: '眠る', tail: 'otto ore', aux: 'avere' },
  { inf: 'partire', ja: '出発する', tail: 'in treno', aux: 'essere' },
  { inf: 'capire', ja: '分かる', tail: 'la domanda', aux: 'avere', isc: true },
  { inf: 'finire', ja: '終える', tail: 'il lavoro', aux: 'avere', isc: true },
  { inf: 'preferire', ja: '〜のほうが好きだ', tail: 'il vino rosso', aux: 'avere', isc: true },
];

export const verbByInfinitive = (inf) => VERBS.find((v) => v.inf === inf) ?? null;

/** essere を取る動詞は過去分詞が主語と性数一致する */
export const agreesWithSubject = (verb) => verb.aux === 'essere';
