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
  "cat": "Настойки",
  "short": "Настойки",
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
const BLOB = {"s":"Ce/nYIH/P3V8O4+AeL6A/A==","i":"hDCmExJov2aX1opP","c":"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","n":600000};
