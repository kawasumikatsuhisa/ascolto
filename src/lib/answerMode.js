/**
 * その問題を、設定した回答方法で実際に出せるかを決める。
 *
 * 「入力」を選んでいても、答えが日本語になる問題（伊 → 日本語 の曜日・月・単語）
 * は日本語入力になってしまい、電車で片手のときにまず打てない。そういう問題だけ
 * 選択式に落とす。以前はここで「めくって自己採点」に落としていたが、
 * 向きが「両方」だと3割がめくる方式になり、入力を選んだのに効かないように
 * 見えてしまっていた。
 */

/**
 * @param {{answerMode: string}} settings
 * @param {{answerLang?: string, choices?: string[]}} item
 * @returns {'choice'|'typing'|'reveal'}
 */
export function resolveAnswerMode(settings, item) {
  const hasChoices = (item.choices?.length ?? 0) > 1;
  const canType = item.answerLang !== 'ja';

  if (settings.answerMode === 'reveal') return 'reveal';
  if (settings.answerMode === 'typing') {
    if (canType) return 'typing';
    return hasChoices ? 'choice' : 'reveal'; // 日本語入力は避ける
  }
  return hasChoices ? 'choice' : 'reveal';
}
