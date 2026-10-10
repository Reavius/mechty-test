/* Данные. Блоки PUB и BLOB переписывает tools/vault.mjs — руками не править. */
/* Данные карты собираются tools/vault.mjs из того же источника, что и рецептуры:
   состав позиций с рецептурой берётся из рецептуры. Руками здесь не править. */
/* PUB:BEGIN */
const data = [
 {
  "key": "premix",
  "cat": "Премиксы",
  "short": "Премиксы",
  "rule": "Срок годности 14 суток от даты изготовления",
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
  "rule": "Срок годности 14 суток от даты изготовления",
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
  "rule": "Безалкогольные · срок годности 7 суток от даты изготовления",
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
   },
   {
    "id": "sirop",
    "n": "Сироп сахарный",
    "c": [
     "Вода фильтрованная",
     "Сахар"
    ],
    "al": "Не выявлены",
    "lo": true,
    "m": "вода, сахар"
   },
   {
    "id": "igristoe",
    "n": "Пена игристого",
    "kid": "p-igristoe",
    "al": "Яйца (белок), диоксид серы и сульфиты",
    "flag": true,
    "lo": true,
    "c": [
     "Игристое вино «Барселона»",
     "Белок яичный"
    ],
    "m": "игристое вино, яичный белок"
   }
  ]
 }
];
/* PUB:END */

/* ════════════ Раздел бартендеров ════════════ */
/* Рецептуры зашифрованы паролем (PBKDF2-SHA256 → AES-256-GCM). Внутри шифровки
   лежит и токен журнала: без пароля нельзя ни прочитать рецептуры, ни писать в журнал.
   Пересобрать шифровку: tools/vault.mjs. */
const BLOB = {"s":"Ce/nYIH/P3V8O4+AeL6A/A==","i":"IGqGy+eAYu+iRSPs","c":"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","n":600000};
