/**
 * 冠詞の練習に使う名詞。
 *
 * 持つのは「単数形・複数形・性・訳」の4つだけ。冠詞そのものは articles.js が
 * 規則から作るので、ここには il も lo も書かない。
 *
 * 複数形はデータで持つ。amico → amici、albergo → alberghi、uomo → uomini の
 * ように規則で作ろうとすると外れるものが多く、生成に向かないため。
 *
 * 語頭のクラス（母音 / s+子音など / ふつうの子音）が偏らないように選んである。
 */

export const NOUNS = [
  // 子音で始まる男性名詞 → il / i
  { sing: 'libro', plur: 'libri', gender: 'm', ja: '本' },
  { sing: 'treno', plur: 'treni', gender: 'm', ja: '電車' },
  { sing: 'gatto', plur: 'gatti', gender: 'm', ja: '猫' },
  { sing: 'cane', plur: 'cani', gender: 'm', ja: '犬' },
  { sing: 'ponte', plur: 'ponti', gender: 'm', ja: '橋' },
  { sing: 'vino', plur: 'vini', gender: 'm', ja: 'ワイン' },
  { sing: 'tavolo', plur: 'tavoli', gender: 'm', ja: 'テーブル' },
  { sing: 'giorno', plur: 'giorni', gender: 'm', ja: '日' },
  { sing: 'ragazzo', plur: 'ragazzi', gender: 'm', ja: '少年' },
  { sing: 'medico', plur: 'medici', gender: 'm', ja: '医者' },
  { sing: 'quadro', plur: 'quadri', gender: 'm', ja: '絵' },
  { sing: 'formaggio', plur: 'formaggi', gender: 'm', ja: 'チーズ' },
  { sing: 'bicchiere', plur: 'bicchieri', gender: 'm', ja: 'コップ' },
  { sing: 'film', plur: 'film', gender: 'm', ja: '映画' },
  { sing: 'telefono', plur: 'telefoni', gender: 'm', ja: '電話' },

  // s+子音・z・gn・ps・y で始まる男性名詞 → lo / gli
  { sing: 'studente', plur: 'studenti', gender: 'm', ja: '学生' },
  { sing: 'stadio', plur: 'stadi', gender: 'm', ja: 'スタジアム' },
  { sing: 'scontrino', plur: 'scontrini', gender: 'm', ja: 'レシート' },
  { sing: 'spettacolo', plur: 'spettacoli', gender: 'm', ja: '公演' },
  { sing: 'straniero', plur: 'stranieri', gender: 'm', ja: '外国人' },
  { sing: 'sbaglio', plur: 'sbagli', gender: 'm', ja: '間違い' },
  { sing: 'sconto', plur: 'sconti', gender: 'm', ja: '割引' },
  { sing: 'specchio', plur: 'specchi', gender: 'm', ja: '鏡' },
  { sing: 'zio', plur: 'zii', gender: 'm', ja: 'おじ' },
  { sing: 'zaino', plur: 'zaini', gender: 'm', ja: 'リュック' },
  { sing: 'zucchero', plur: 'zuccheri', gender: 'm', ja: '砂糖' },
  { sing: 'psicologo', plur: 'psicologi', gender: 'm', ja: '心理学者' },
  { sing: 'gnocco', plur: 'gnocchi', gender: 'm', ja: 'ニョッキ' },
  { sing: 'yogurt', plur: 'yogurt', gender: 'm', ja: 'ヨーグルト' },

  // 母音で始まる男性名詞 → l' / gli
  { sing: 'amico', plur: 'amici', gender: 'm', ja: '友だち' },
  { sing: 'anno', plur: 'anni', gender: 'm', ja: '年' },
  { sing: 'ospedale', plur: 'ospedali', gender: 'm', ja: '病院' },
  { sing: 'orologio', plur: 'orologi', gender: 'm', ja: '時計' },
  { sing: 'esame', plur: 'esami', gender: 'm', ja: '試験' },
  { sing: 'aereo', plur: 'aerei', gender: 'm', ja: '飛行機' },
  { sing: 'occhio', plur: 'occhi', gender: 'm', ja: '目' },
  { sing: 'albergo', plur: 'alberghi', gender: 'm', ja: 'ホテル' },
  { sing: 'ingresso', plur: 'ingressi', gender: 'm', ja: '入口' },
  { sing: 'ufficio', plur: 'uffici', gender: 'm', ja: 'オフィス' },
  { sing: 'uomo', plur: 'uomini', gender: 'm', ja: '男の人' },
  { sing: 'hotel', plur: 'hotel', gender: 'm', ja: 'ホテル（外来語）' },

  // 子音で始まる女性名詞 → la / le
  { sing: 'casa', plur: 'case', gender: 'f', ja: '家' },
  { sing: 'macchina', plur: 'macchine', gender: 'f', ja: '車' },
  { sing: 'ragazza', plur: 'ragazze', gender: 'f', ja: '少女' },
  { sing: 'penna', plur: 'penne', gender: 'f', ja: 'ペン' },
  { sing: 'borsa', plur: 'borse', gender: 'f', ja: 'バッグ' },
  { sing: 'birra', plur: 'birre', gender: 'f', ja: 'ビール' },
  { sing: 'cucina', plur: 'cucine', gender: 'f', ja: '台所' },
  { sing: 'chiave', plur: 'chiavi', gender: 'f', ja: '鍵' },
  { sing: 'sera', plur: 'sere', gender: 'f', ja: '夕方' },
  { sing: 'notte', plur: 'notti', gender: 'f', ja: '夜' },
  { sing: 'madre', plur: 'madri', gender: 'f', ja: '母' },
  { sing: 'moglie', plur: 'mogli', gender: 'f', ja: '妻' },
  { sing: 'città', plur: 'città', gender: 'f', ja: '街' },
  { sing: 'finestra', plur: 'finestre', gender: 'f', ja: '窓' },

  // s+子音・z で始まる女性名詞（単数は la のまま、複数は le）
  { sing: 'stazione', plur: 'stazioni', gender: 'f', ja: '駅' },
  { sing: 'scuola', plur: 'scuole', gender: 'f', ja: '学校' },
  { sing: 'spiaggia', plur: 'spiagge', gender: 'f', ja: 'ビーチ' },
  { sing: 'storia', plur: 'storie', gender: 'f', ja: '歴史' },
  { sing: 'zia', plur: 'zie', gender: 'f', ja: 'おば' },

  // 母音で始まる女性名詞 → l' / le（不定冠詞は un'）
  { sing: 'amica', plur: 'amiche', gender: 'f', ja: '女友だち' },
  { sing: 'ora', plur: 'ore', gender: 'f', ja: '時間' },
  { sing: 'isola', plur: 'isole', gender: 'f', ja: '島' },
  { sing: 'estate', plur: 'estati', gender: 'f', ja: '夏' },
  { sing: 'entrata', plur: 'entrate', gender: 'f', ja: '入場' },
  { sing: 'opera', plur: 'opere', gender: 'f', ja: 'オペラ' },
  { sing: 'aula', plur: 'aule', gender: 'f', ja: '教室' },
  { sing: 'acqua', plur: 'acque', gender: 'f', ja: '水' },
  { sing: 'arancia', plur: 'arance', gender: 'f', ja: 'オレンジ' },
  { sing: 'età', plur: 'età', gender: 'f', ja: '年齢' },
];
