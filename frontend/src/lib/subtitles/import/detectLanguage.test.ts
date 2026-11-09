import { describe, expect, it } from 'vite-plus/test';
import { detectTextLanguage, getFileNameLanguage, toLanguageCode } from './detectLanguage';

describe('detectTextLanguage', () => {
  it('should tell languages apart by their script and the letters only they use', () => {
    const samples = {
      he: 'שלום, מה שלומך היום? אני בסדר גמור, תודה רבה.',
      ar: 'مرحبا، كيف حالك اليوم؟ أنا بخير، شكرا جزيلا لك يا صديقي.',
      fa: 'سلام، حال شما چطور است؟ من خوبم، ممنون. امروز هوا خیلی خوب است.',
      ur: 'آپ کیسے ہیں؟ میں ٹھیک ہوں، شکریہ۔ یہ بہت اچھا ہے۔',
      ru: 'Привет, как дела? Всё хорошо, спасибо. Что ты делаешь сегодня вечером?',
      uk: 'Привіт, як справи? Усе добре, дякую. Що ти робиш сьогодні ввечері?',
      bg: 'Здравей, как си? Добре съм, благодаря. Какво правиш тази вечер? Ще дойдеш ли с нас?',
      el: 'Γεια σου, τι κάνεις σήμερα; Είμαι καλά, ευχαριστώ πολύ.',
      ja: 'こんにちは、元気ですか？今日はとても良い天気ですね。',
      zh: '你好，你今天怎么样？我很好，谢谢你。今天天气很好。',
      ko: '안녕하세요, 오늘 어떻게 지내세요? 저는 잘 지내요, 감사합니다.',
      th: 'สวัสดีครับ วันนี้เป็นอย่างไรบ้าง ผมสบายดี ขอบคุณครับ',
      hi: 'नमस्ते, आप कैसे हैं? मैं ठीक हूँ, धन्यवाद। आज मौसम बहुत अच्छा है।',
    };

    const actualResult = Object.values(samples).map(detectTextLanguage);

    expect(actualResult).toEqual(Object.keys(samples));
  });

  it('should tell languages written in Latin letters apart by their common words', () => {
    const samples = {
      en: 'I don’t know what you’re talking about. We have to get out of here right now, before they find us.',
      es: 'No sé de qué estás hablando. Tenemos que salir de aquí ahora mismo, antes de que nos encuentren.',
      fr: 'Je ne sais pas de quoi tu parles. Nous devons partir d’ici tout de suite, avant qu’ils nous trouvent.',
      de: 'Ich weiß nicht, wovon du sprichst. Wir müssen sofort hier raus, bevor sie uns finden. Das ist mir egal.',
      it: 'Non so di cosa stai parlando. Dobbiamo andarcene da qui subito, prima che ci trovino. Questo è vero.',
      pt: 'Eu não sei do que você está falando. Temos que sair daqui agora mesmo, antes que eles nos encontrem.',
      nl: 'Ik weet niet waar je het over hebt. We moeten hier nu weg, voordat ze ons vinden. Dat is niet goed.',
      sv: 'Jag vet inte vad du pratar om. Vi måste härifrån nu, innan de hittar oss. Det är inte bra.',
      pl: 'Nie wiem, o czym mówisz. Musimy się stąd wydostać, zanim nas znajdą. To jest bardzo ważne.',
      tr: 'Ne dediğini bilmiyorum. Bu çok önemli bir şey, ama sana söyleyemem. Neden bana bakıyorsun?',
    };

    const actualResult = Object.values(samples).map(detectTextLanguage);

    expect(actualResult).toEqual(Object.keys(samples));
  });

  it('should not guess when there’s too little text or it matches no language', () => {
    const actualResult = ['OK', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'].map(detectTextLanguage);

    expect(actualResult).toEqual([null, null]);
  });
});

describe('getFileNameLanguage', () => {
  it('should read the language a file name is tagged with', () => {
    const fileNames = [
      'movie.en.srt',
      'movie.heb.srt',
      'movie.pt-BR.vtt',
      'Movie.2019.1080p.Hebrew.WEB-DL.srt',
      'movie.en.forced.srt',
      'Movie.iw.srt',
      'movie.srt',
      'The.Office.US.S01E01.srt',
    ];

    const actualResult = fileNames.map(getFileNameLanguage);

    expect(actualResult).toEqual(['en', 'he', 'pt', 'he', 'en', 'he', null, null]);
  });
});

describe('toLanguageCode', () => {
  it('should turn language tags into Whisper’s codes', () => {
    const actualResult = ['en-US', 'heb', 'iw', 'pt_BR', 'zh-Hans', 'yue', 'xx'].map(toLanguageCode);

    expect(actualResult).toEqual(['en', 'he', 'he', 'pt', 'zh', 'yue', null]);
  });
});
