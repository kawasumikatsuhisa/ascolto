/**
 * Web Speech API による読み上げ。外部APIは使わないので、端末に
 * イタリア語の音声が入っていなければ黙って何もしない。
 */

export const speechSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window;

let italianVoice = null;

function refreshVoice() {
  if (!speechSupported) return;
  const voices = window.speechSynthesis.getVoices();
  italianVoice =
    voices.find((v) => v.lang === 'it-IT') ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('it')) ??
    null;
}

export function initSpeech() {
  if (!speechSupported) return;
  refreshVoice();
  // 音声一覧は非同期に届くことがある
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoice);
}

/** イタリア語の音声が実際に使えるか（設定画面の注意書き用） */
export function hasItalianVoice() {
  if (!speechSupported) return false;
  if (!italianVoice) refreshVoice();
  return Boolean(italianVoice);
}

/**
 * 読み上げる。必ずユーザー操作の中から呼ぶこと（iOS の制限）。
 * @param {string} text
 * @param {number} [rate] 0.5〜1.5 くらい
 */
export function speak(text, rate = 0.85) {
  if (!speechSupported || !text) return false;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = rate;
    if (!italianVoice) refreshVoice();
    if (italianVoice) utterance.voice = italianVoice;
    window.speechSynthesis.cancel(); // 連打しても重ならないように
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (speechSupported) window.speechSynthesis.cancel();
}
