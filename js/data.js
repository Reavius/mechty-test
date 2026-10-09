/* Данные. Блоки PUB и BLOB переписывает tools/vault.mjs — руками не править. */
/* Данные карты собираются tools/vault.mjs из того же источника, что и рецептуры:
   состав позиций с рецептурой берётся из рецептуры. Руками здесь не править. */
/* PUB:BEGIN */
const data = [
 {
  "key": "premix",
  "cat": "Премиксы",
  "short": "Премиксы",
  "rule": "Срок годности 14 суток от даты изготовления · хранение при t не выше +25 °C",
  "srok": "14 суток",
  "store": "не выше +25 °C",
  "items": [
   {
    "id": "pantera",
    "n": "Розовая Пантера",
    "abv": 19,
    "c": [
     "Спиртной напиток «Сарти Роза»",
     "Водка Лаб Груша Айва",
     "Сок лайма"
    ],
    "al": "Не выявлены",
    "rid": "pantera",
    "img": "photos/pantera.webp",
    "m": "груша, сарти, содовая"
   },
   {
    "id": "pornstar",
    "n": "Порнстар",
    "abv": 13,
    "c": [
     "Пюре фруктовое «Маракуйя»",
     "Водка Беленькая",
     "Сироп ванильный"
    ],
    "al": "Яйца (белок), диоксид серы и сульфиты",
    "rid": "pornstar",
    "img": "photos/pornstar.webp",
    "m": "водка, ваниль, маракуйя, игристое",
    "flag": true
   },
   {
    "id": "tropiki",
    "n": "Тропики",
    "abv": 9,
    "c": [
     "Сок ананасовый",
     "Пюре фруктовое «Маракуйя»",
     "Коктейль «Оакхарт Ориджинал Спайсд Голд» с ромом",
     "Ликёр Апероль",
     "Спиртной напиток «Сарти Роза»",
     "Сок лайма",
     "Сироп ванильный",
     "Настойка горькая «Ангостура»"
    ],
    "al": "Не выявлены",
    "rid": "tropiki",
    "img": "photos/tropiki.webp",
    "m": "ром OAKHEART Original Spiced Gold, маракуйя, ананас, сарти, апероль"
   },
   {
    "id": "maitai",
    "n": "Май Тай",
    "abv": 11,
    "c": [
     "Коктейль «Оакхарт Ориджинал Спайсд Голд» с ромом",
     "Сок апельсиновый",
     "Сок ананасовый",
     "Пюре концентрированное персик",
     "Сок лайма",
     "Ликёр десертный «Фруко Шульц Амаретто»"
    ],
    "al": "Не выявлены",
    "rid": "maitai",
    "img": "photos/maitai.webp",
    "m": "ром OAKHEART Original Spiced Gold, амаретто, персик, ананас, апельсин, лайм"
   },
   {
    "id": "negroni",
    "n": "Негрони",
    "abv": 27,
    "c": [
     "Джин сухой «Барристер Драй»",
     "Кампари Биттер",
     "Вермут Мартини Россо"
    ],
    "al": "Диоксид серы и сульфиты",
    "flag": true,
    "rid": "negroni",
    "img": "photos/negroni.webp",
    "m": "кампари, вермут Martini Rosso, джин, апельсин"
   },
   {
    "id": "hugo",
    "n": "Огуречный Хьюго",
    "abv": 8,
    "c": [
     "Огуречная вода п/ф",
     "Джин сухой дистиллированный «Хопперс Ориджинал Драй»",
     "Сок лайма",
     "Сироп бузина"
    ],
    "al": "Диоксид серы и сульфиты",
    "rid": "hugo",
    "img": "photos/hugo.webp",
    "m": "джин Hoppers, огуречный кордиал, бузина, лайм, игристое, содовая",
    "flag": true
   },
   {
    "id": "bluecolada",
    "n": "Блю Колада",
    "abv": 9,
    "c": [
     "Коктейль «Оакхарт Ориджинал Спайсд Голд» с ромом",
     "Кордиал «Голубая лагуна»",
     "Сок ананасовый",
     "Вода кокосовая"
    ],
    "al": "Молоко",
    "rid": "bluecolada",
    "img": "photos/bluecolada.webp",
    "m": "ром OAKHEART Original Spiced Gold, кокосовая вода, кордиал, ананасовый сок, пена пломбир",
    "flag": true
   },
   {
    "id": "summer",
    "n": "Саммер Спритц",
    "abv": 6,
    "c": [
     "Кордиал клубника-ваниль п/ф",
     "Ароматизированный виносодержащий напиток из виноградного сырья «Мартини Фиеро»"
    ],
    "al": "Диоксид серы и сульфиты",
    "flag": true,
    "rid": "summer",
    "img": "photos/summer.webp",
    "m": "вермут Martini Fiero, клубничный кордиал, игристое"
   },
   {
    "id": "chili",
    "n": "Чили Барбарис",
    "abv": 14,
    "c": [
     "Вино «Селлар Селекшн» Совиньон Блан",
     "Кордиал чили-барбарис п/ф",
     "Джин на цедре лимона п/ф",
     "Сок лайма"
    ],
    "al": "Диоксид серы и сульфиты",
    "flag": true,
    "rid": "chili",
    "img": "photos/chili.webp",
    "m": "джин на цедре, вино совиньон блан, кордиал чили-барбарис"
   },
   {
    "id": "longisland",
    "n": "Лонг Айленд",
    "abv": 38,
    "c": [
     "Водка Беленькая",
     "Джин сухой «Барристер Драй»",
     "Ром выдержанный «Девис Айленд Бланко»",
     "Коктейль «Сантиамо Сильвер» с текилой",
     "Ликёр крепкий выдержанный Трипл Сек"
    ],
    "al": "Не выявлены",
    "rid": "longisland",
    "m": "водка, джин, ром, текила, трипл сек, кола"
   },
   {
    "id": "grusha",
    "n": "Груша Жасмин",
    "abv": 20,
    "c": [
     "Кордиал персик-жасмин",
     "Водка Лаб Груша Айва"
    ],
    "al": "Молоко",
    "rid": "grusha",
    "img": "photos/grusha.webp",
    "m": "водка грушевая, кордиал персик-жасмин, пена пломбир",
    "flag": true
   },
   {
    "id": "pinklady",
    "n": "Пинк Леди",
    "abv": 17,
    "c": [
     "Спиртной напиток «Сарти Роза»",
     "Джин сухой дистиллированный «Хопперс Ориджинал Драй»",
     "Сок лайма",
     "Сироп сахарный п/ф"
    ],
    "al": "Не выявлены",
    "m": "сарти, джин, лайм, сахарный сироп"
   },
   {
    "id": "bramble",
    "n": "Брамбл",
    "abv": 16,
    "c": [
     "Кордиал ежевика-лаванда",
     "Водка Лаб Лесные ягоды",
     "Сок лайма"
    ],
    "al": "Не выявлены",
    "m": "водка ягодная, кордиал ежевика-лаванда, лайм"
   }
  ]
 },
 {
  "key": "bar",
  "cat": "Коктейли",
  "short": "Коктейли",
  "rule": "Готовятся при подаче, не хранятся",
  "serve": true,
  "nolabel": true,
  "items": [
   {
    "id": "c-fiero",
    "kid": "fiero",
    "n": "Мартини Фиеро Тоник",
    "vol": 160,
    "c": [
     "Ароматизированный виносодержащий напиток из виноградного сырья «Мартини Фиеро»",
     "Тоник"
    ],
    "al": "Диоксид серы и сульфиты",
    "img": "photos/fiero.webp",
    "flag": true,
    "abv": 7,
    "m": "вермут Martini Fiero, тоник"
   },
   {
    "id": "c-bosford",
    "kid": "bosford",
    "n": "Босфорд Тоник",
    "vol": 150,
    "c": [
     "Джин Босфорд",
     "Тоник"
    ],
    "al": "Не выявлены",
    "img": "photos/bosford.webp",
    "abv": 8,
    "m": "джин Bosford, тоник"
   },
   {
    "id": "c-watermelon",
    "kid": "watermelon",
    "n": "Арбузный Джин",
    "vol": 200,
    "c": [
     "Джин сухой дистиллированный «Хопперс Ориджинал Драй»",
     "Red Bull арбузный"
    ],
    "al": "Не выявлены",
    "img": "photos/watermelon.webp",
    "abv": 6,
    "m": "Red Bull The Red Edition, джин Hoppers"
   },
   {
    "id": "c-collins",
    "kid": "collins",
    "n": "Щавелевый Коллинз",
    "vol": 200,
    "c": [
     "Джин сухой дистиллированный «Хопперс Ориджинал Драй»",
     "Щавелевый кордиал п/ф",
     "Содовая"
    ],
    "al": "Не выявлены",
    "img": "photos/collins.webp",
    "abv": 8,
    "m": "джин Hoppers, щавель, содовая"
   },
   {
    "id": "c-aperol",
    "kid": "aperol",
    "n": "Апероль Спритц",
    "vol": 200,
    "c": [
     "Ликёр Апероль",
     "Игристое вино «Барселона»",
     "Содовая"
    ],
    "al": "Диоксид серы и сульфиты",
    "img": "photos/aperol.webp",
    "flag": true,
    "abv": 8,
    "m": "апероль, игристое, содовая, апельсин"
   },
   {
    "id": "c-campari",
    "kid": "campari",
    "n": "Кампари Спритц",
    "vol": 200,
    "c": [
     "Кампари Биттер",
     "Игристое вино «Барселона»",
     "Содовая"
    ],
    "al": "Диоксид серы и сульфиты",
    "img": "photos/campari.webp",
    "flag": true,
    "abv": 12,
    "m": "кампари, игристое, содовая, апельсин"
   },
   {
    "id": "c-sarti",
    "kid": "sarti",
    "n": "Сарти Спритц",
    "vol": 200,
    "c": [
     "Спиртной напиток «Сарти Роза»",
     "Игристое вино «Барселона»",
     "Содовая"
    ],
    "al": "Диоксид серы и сульфиты",
    "img": "photos/sarti.webp",
    "flag": true,
    "abv": 9,
    "m": "сарти, игристое, содовая, лайм"
   }
  ]
 },
 {
  "key": "nastoyki",
  "cat": "Шоты",
  "short": "Шоты",
  "rule": "Срок годности 14 суток от даты изготовления · хранение при t не выше +25 °C",
  "srok": "14 суток",
  "store": "не выше +25 °C",
  "items": [
   {
    "id": "vishnya",
    "n": "Вишня",
    "abv": 20,
    "c": [
     "Виски «Трабл Мейкер»",
     "Вишня с/м",
     "Сахар",
     "Корица в палочках"
    ],
    "al": "Не выявлены",
    "rid": "vishnya",
    "m": "виски, вишня, сахар, корица"
   },
   {
    "id": "malina",
    "n": "Малина, лайм, мята",
    "abv": 20,
    "c": [
     "Водка Беленькая",
     "Малина с/м",
     "Лайм",
     "Сахар",
     "Мята свежая"
    ],
    "al": "Не выявлены",
    "rid": "malina",
    "m": "водка, малина, лайм, сахар, мята"
   },
   {
    "id": "limoncello",
    "n": "Лимончелло",
    "abv": 19,
    "c": [
     "Водка Беленькая",
     "Лимонный фреш п/ф",
     "Сироп сахарный п/ф",
     "Цедра лимона",
     "Апельсиновый фреш п/ф"
    ],
    "al": "Не выявлены",
    "rid": "limoncello",
    "m": "водка, лимонный фреш, сахарный сироп, цедра лимона, апельсиновый фреш"
   },
   {
    "id": "maracuya",
    "n": "Маракуйя Пломбир",
    "abv": 16,
    "c": [
     "Ром выдержанный «Девис Айленд Бланко»",
     "Пена пломбир п/ф",
     "Пюре фруктовое «Маракуйя»",
     "Раствор молочной кислоты 6 %",
     "Вода фильтрованная"
    ],
    "al": "Молоко",
    "flag": true,
    "rid": "maracuya",
    "m": "ром, пена пломбир, маракуйя, молочная кислота, вода"
   },
   {
    "id": "klubnika",
    "n": "Клубника, каркаде",
    "abv": 20,
    "c": [
     "Водка Беленькая",
     "Клубника с/м",
     "Сахар",
     "Сок лайма",
     "Чай каркаде"
    ],
    "al": "Не выявлены",
    "m": "водка, клубника, сахар, лайм, каркаде"
   }
  ]
 },
 {
  "key": "pf",
  "cat": "Полуфабрикаты",
  "short": "Полуфабрикаты",
  "rule": "Безалкогольные · срок годности 7 суток от даты изготовления · хранение при t +2…+6 °C",
  "srok": "7 суток",
  "store": "+2…+6 °C",
  "nonalc": true,
  "items": [
   {
    "id": "shchavel",
    "n": "Щавелевый кордиал",
    "c": [
     "Вода фильтрованная",
     "Сахар",
     "Щавель свежий",
     "Кислота лимонная"
    ],
    "al": "Не выявлены",
    "rid": "shchavel",
    "ln": "Щавель",
    "m": "вода, сахар, щавель, лимонная кислота"
   },
   {
    "id": "tarhun",
    "n": "Цитрус-тархун",
    "c": [
     "Кордиал цитрусовый п/ф",
     "Кордиал тархун-лайм"
    ],
    "al": "Не выявлены",
    "m": "кордиал цитрусовый, кордиал тархун-лайм"
   },
   {
    "id": "barbaris",
    "n": "Кордиал чили-барбарис",
    "c": [
     "Вода фильтрованная",
     "Сахар",
     "Конфеты «Барбарис»",
     "Раствор молочной кислоты 6 %",
     "Перец чили свежий"
    ],
    "al": "Не выявлены",
    "rid": "barbaris",
    "ln": "Чили барбарис",
    "m": "вода, сахар, конфеты барбарис, молочная кислота, перец чили"
   },
   {
    "id": "coldbrew",
    "n": "Колд брю",
    "c": [
     "Сок вишнёвый",
     "Вода фильтрованная",
     "Кофе молотый"
    ],
    "al": "Не выявлены",
    "m": "вишнёвый сок, вода, кофе"
   },
   {
    "id": "oblepiha",
    "n": "Облепиховое пюре",
    "c": [
     "Облепиха с/м",
     "Вода фильтрованная",
     "Сахар"
    ],
    "al": "Не выявлены",
    "m": "облепиха, вода, сахар"
   },
   {
    "id": "plombir",
    "n": "Пена пломбир",
    "rid": "plombir",
    "c": [
     "Сироп ванильный",
     "Мороженое пломбир",
     "Молоко",
     "Сливки",
     "Вода фильтрованная"
    ],
    "al": "Молоко",
    "flag": true,
    "m": "ванильный сироп, мороженое пломбир, молоко, сливки, вода"
   },
   {
    "id": "koritsa",
    "n": "Кордиал корица-базилик",
    "rid": "koritsa",
    "c": [
     "Сироп базилик",
     "Корица в палочках"
    ],
    "al": "Не выявлены",
    "m": "сироп базилик, корица"
   },
   {
    "id": "grapefruit",
    "n": "Лимонад «Грейпфрут»",
    "ln": "Грейпфрут",
    "c": [
     "Кордиал корица-базилик п/ф",
     "Балтика б/а",
     "Сок лайма"
    ],
    "al": "Глютен (ячменный солод)",
    "flag": true,
    "rid": "grapefruit",
    "m": "кордиал корица-базилик, безалкогольное пиво, лайм"
   }
  ]
 }
];
/* PUB:END */

/* ════════════ Раздел бартендеров ════════════ */
/* Рецептуры зашифрованы паролем (PBKDF2-SHA256 → AES-256-GCM). Внутри шифровки
   лежит и токен журнала: без пароля нельзя ни прочитать рецептуры, ни писать в журнал.
   Пересобрать шифровку: tools/vault.mjs. */
const BLOB = {"s":"Ce/nYIH/P3V8O4+AeL6A/A==","i":"UV84L32vUHSHIlAH","c":"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","n":600000};
