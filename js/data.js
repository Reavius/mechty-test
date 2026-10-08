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
const BLOB = {"s":"Ce/nYIH/P3V8O4+AeL6A/A==","i":"2Z6rihbF5hx1y04P","c":"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","n":600000};
