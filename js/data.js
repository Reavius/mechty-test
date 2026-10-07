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
    "s": [
     "Аперитив",
     "Водка",
     "Сок лайма"
    ]
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
    "al": "Не выявлены",
    "rid": "pornstar",
    "img": "photos/pornstar.webp",
    "s": [
     "Пюре маракуйи",
     "Водка",
     "Сироп ванильный"
    ]
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
    "s": [
     "Сок ананасовый",
     "Пюре маракуйи",
     "Ром",
     "Аперитив",
     "Сок лайма",
     "Сироп ванильный",
     "Биттер"
    ]
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
    "s": [
     "Ром",
     "Сок апельсиновый",
     "Сок ананасовый",
     "Персиковое пюре",
     "Сок лайма",
     "Ликёр амаретто"
    ]
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
    "s": [
     "Джин",
     "Биттер",
     "Вермут красный"
    ]
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
    "al": "Не выявлены",
    "rid": "hugo",
    "img": "photos/hugo.webp",
    "s": [
     "Огуречная вода",
     "Джин",
     "Сок лайма",
     "Сироп бузина"
    ]
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
    "al": "Не выявлены",
    "rid": "bluecolada",
    "img": "photos/bluecolada.webp",
    "s": [
     "Ром",
     "Кордиал голубая лагуна",
     "Сок ананасовый",
     "Кокосовая вода"
    ]
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
    "s": [
     "Кордиал клубника-ваниль",
     "Вермут"
    ]
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
    "s": [
     "Белое вино",
     "Кордиал чили-барбарис",
     "Джин на цедре лимона",
     "Сок лайма"
    ]
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
    "s": [
     "Водка",
     "Джин",
     "Ром",
     "Текила",
     "Апельсиновый ликёр"
    ]
   },
   {
    "id": "grusha",
    "n": "Груша Жасмин",
    "abv": 20,
    "c": [
     "Кордиал персик-жасмин",
     "Водка Лаб Груша Айва"
    ],
    "al": "Не выявлены",
    "rid": "grusha",
    "img": "photos/grusha.webp",
    "s": [
     "Кордиал персик-жасмин",
     "Водка"
    ]
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
    "s": [
     "Аперитив",
     "Джин",
     "Сок лайма",
     "Сахарный сироп"
    ]
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
    "s": [
     "Кордиал ежевика-лаванда",
     "Водка",
     "Сок лайма"
    ]
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
    "s": [
     "Вермут",
     "Тоник"
    ]
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
    "s": [
     "Джин",
     "Тоник"
    ]
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
    "s": [
     "Джин",
     "Энергетик арбузный"
    ]
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
    "s": [
     "Джин",
     "Щавелевый кордиал",
     "Содовая"
    ]
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
    "s": [
     "Аперитив",
     "Игристое вино",
     "Содовая"
    ]
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
    "s": [
     "Биттер",
     "Игристое вино",
     "Содовая"
    ]
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
    "s": [
     "Аперитив",
     "Игристое вино",
     "Содовая"
    ]
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
    "s": [
     "Виски",
     "Вишня",
     "Сахар",
     "Корица"
    ]
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
    "s": [
     "Водка",
     "Малина",
     "Лайм",
     "Сахар",
     "Мята"
    ]
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
    "s": [
     "Водка",
     "Лимонный фреш",
     "Сахарный сироп",
     "Цедра лимона",
     "Апельсиновый фреш"
    ]
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
    "s": [
     "Ром",
     "Пена пломбир",
     "Пюре маракуйи",
     "Молочная кислота",
     "Вода"
    ]
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
    "s": [
     "Водка",
     "Клубника",
     "Сахар",
     "Сок лайма",
     "Каркаде"
    ]
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
    "s": [
     "Вода",
     "Сахар",
     "Щавель",
     "Лимонная кислота"
    ]
   },
   {
    "id": "tarhun",
    "n": "Цитрус-тархун",
    "c": [
     "Кордиал цитрусовый п/ф",
     "Кордиал тархун-лайм"
    ],
    "al": "Не выявлены",
    "s": [
     "Кордиал цитрусовый",
     "Кордиал тархун-лайм"
    ]
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
    "s": [
     "Вода",
     "Сахар",
     "Конфеты барбарис",
     "Молочная кислота",
     "Перец чили"
    ]
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
    "s": [
     "Сок вишнёвый",
     "Вода",
     "Кофе"
    ]
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
    "s": [
     "Облепиха",
     "Вода",
     "Сахар"
    ]
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
    "s": [
     "Сироп ванильный",
     "Мороженое пломбир",
     "Молоко",
     "Сливки",
     "Вода"
    ]
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
    "s": [
     "Сироп базилик",
     "Корица"
    ]
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
    "s": [
     "Кордиал корица-базилик",
     "Безалкогольное пиво",
     "Сок лайма"
    ]
   }
  ]
 }
];
/* PUB:END */

/* ════════════ Раздел бартендеров ════════════ */
/* Рецептуры зашифрованы паролем (PBKDF2-SHA256 → AES-256-GCM). Внутри шифровки
   лежит и токен журнала: без пароля нельзя ни прочитать рецептуры, ни писать в журнал.
   Пересобрать шифровку: tools/vault.mjs. */
const BLOB = {"s":"Ce/nYIH/P3V8O4+AeL6A/A==","i":"fqLhHxrlZqh0wiZ8","c":"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","n":600000};
