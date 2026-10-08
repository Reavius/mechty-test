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
const BLOB = {"s":"Ce/nYIH/P3V8O4+AeL6A/A==","i":"LkqbRxfQX9N7xaCc","c":"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","n":600000};
