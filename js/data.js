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
    "al": "Не выявлены",
    "rid": "pornstar",
    "img": "photos/pornstar.webp",
    "m": "водка, ваниль, маракуйя, игристое"
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
    "al": "Не выявлены",
    "rid": "hugo",
    "img": "photos/hugo.webp",
    "m": "джин Hoppers, огуречный кордиал, бузина, лайм, игристое, содовая"
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
    "m": "ром OAKHEART Original Spiced Gold, кокосовая вода, кордиал, ананасовый сок, пена пломбир"
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
    "m": "джин на цедре, вино совиньон блан, кордиал чили·барбарис"
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
    "al": "Не выявлены",
    "rid": "grusha",
    "img": "photos/grusha.webp",
    "m": "водка грушевая, кордиал персик·жасмин, пена пломбир"
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
    "m": "водка ягодная, кордиал ежевика·лаванда, лайм"
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
    "m": "кордиал цитрусовый, кордиал тархун·лайм"
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
    "m": "кордиал корица·базилик, безалкогольное пиво, лайм"
   }
  ]
 }
];
/* PUB:END */

/* ════════════ Раздел бартендеров ════════════ */
/* Рецептуры зашифрованы паролем (PBKDF2-SHA256 → AES-256-GCM). Внутри шифровки
   лежит и токен журнала: без пароля нельзя ни прочитать рецептуры, ни писать в журнал.
   Пересобрать шифровку: tools/vault.mjs. */
const BLOB = {"s":"Ce/nYIH/P3V8O4+AeL6A/A==","i":"v5wQqxMfpvOygyHt","c":"O7b2GTfQps1MjnWMBnCzoo8LDNepgB+yo8lfC1DZ7EFx7YtFScxiCa4Rn+deh21b8g3RjnTQrNWRFpEUt5YsMEzoGFkDiujDH2ZfmsinKSnpilCuTH9rSk9uUtu/F02Cmvu4MsqXFyXBwYbL3eKsH161oJBi6aQuEZ4+Zbiaeg8RKncZz6PVfDRjOiO43trdt6PKmCN+BUGafJNPAZIB8odYVRmniyGjxNBZEdXo/6IzQDsscRUWdutyJGXsznM8DRX1cqoVn6HbSKpuLys4l5NW1xE0J2f84a0Xo8bkDUJMiknsCmpnXpOuvYg61p3NJLoUoAHNXjfIUV09BJPblzpSJCxWm6o5yGD4vPItOSAbf51prelpIxcTu4kT6utteBlxta8m70H5GFdeMKrMiqQY052X3S8O9kzuOvkvROM8M+j0dFgPoXH+xun6fIhxNTXlKLpbYoGffw7SkgNOh9sLt9Ss6tLuILZWpqT2IV0fuHu5866k6m9OzxFGYOLcLYDBoH5YVht3cTZNvpOipRYVYciEfsKP63+3+DA0mPYULjLJKkCdEhVVgHX80psiXwFkgQRHJf1XeUD+7Kg4nggLedmdbaYzWdY3s64Tb7Jhk1czkR+d5xsxxGtMDQwYUGTNlTM+CVJ55JmPwm5t0HIFoyOBw+7/qJhMx3J48VSvAkAvEwvB4MQGmwKPno+Q0lPkqPZEAwKJQhlvVMFuMZkZ04e2FEDxkAxdZfcj5NUxbU5D5a9Sj7FLTYUXv/+tt+KnBcrQKF9GE1dwZHa/WgprdUNUN3FwDn1/O/foXEY1IOLcI8ekibg7ScTe1Rc59MgxSTJFLkQTc/xrrjILbja2e2FkzyQjxPmXjn+l61d9yK56QP1jIENdYPauqUVRt8VhinZ8djX+sWNUpbQg1rW4JHoXGh2dO81YDXIlwuIO12MPNppYeX4WkojryPIPi/jrI8tLesXWvqhDaE7DOMNgVNgFdnoH1zUFBWaCGlCL1aFa+Xjxb9JTKuHRurEYQrIKWaksdnL7J29DPfG4+EDVv64brORjbIbNAfThgv8NnX4GF9+qa/zsnovTV4shlNln38WucnRZz5cyOEK0ieNYsMI1o+XzvM5pCEe7YqAqRk3LDyjvHVeUxLceKA4ONX25nYHJgEzhg/mmHm5QUKvj9QeyE1VCaywdz5prGVSCFO+yuvgjFFjcqnOK/YudLbjWYwtur/1Lln02zqgq/Ti3gQXQ6M6l0LQmGom5ZE6/zUjcYzO8yHpFXtQm6Gtx5nUECl14lYPB0JR8/X9A2LM7NkVLMcdv9WpHec7pWKbbGXYY03bcQGb2l99UCfEiMmV2fzBScEtMtM+Zj1ol7/t2SQzf6EhZI9ZGhjfVzz6S+fP3EXzJLz0R/se+hp/alSBzF10Dvl3uYAdOn2DqNuboyPBYr5cmZ4no0xqGuv/RDPnCxW1i2pjl2hJl4u5bXjkk3gb7WDcuY2aReI9mQCmLHDeRihLR9D8W5NVS28l+lGvU8GkYbpGiFkHPh7s24tWAQhEZYt49X9NPFaXDVGJ9oXvr94+VVoW5rLTa6Tgk6S9CmUWkfidXYmA5Sj6G9o7lQiuiaidrPHi32CqD+yUH9Io/mVAcQbVJYGVV0LRql7gDTx2bwVaqR3HW2gRmfTJcqn/3NM2DS0essHEEhQe1puSL1wtA71h4f6GGLJyugU9AmUu2Law2SgArD8Ay538FenkD87EZ0904o63ubO6vRW/fzI8+sIFPykhHXiU3Dd3CMDDTT2AUeqatIBluI/mqx3C8bZbHSlYyCC7KopQ1NwwjZhIqm9u6vmBA8BfTASe392VWOgknQX3b6WRK8k+BxLiFYQYyO49tqTDZxlAraxbbIGUURUocO4adYagOIHe6rmBQUe27SV2VMwQwX+xBCJpd4bJrQyKnujVwlhdGhr5vg6YW5Q/8Ajns9hj1mf++UEtXwA2FepQJlA5xMuW+qTOjnwYQHFldhi9IPAdZf0m3R0ra6YRA/21y15ybxvpFAnR8eEVxkHdaBx43hfSqLIAsCV+6sd4pQw9IU/07MKUdGIqviTM+GvFMxmr6SfWsjU3e2DOkdSe5jKw098NmARtrSPodeUzpThIRXNIVSCIlyId9kzakxO9eUYRBDC6sNuNmsraKVGxaT1Z3jGBGBmGT33rx++YS3GBXjHEXVoiZQcMVCvU6g9a4FDUk3UUr4HDuIovrsTOXFnDyqwKiXIE5x2W0yNMUnZRm5hXk3kqxWOIheE1igurCeY+8RXohRKuHz+sfYVAEtRWh+r1857iOzbrKluGRc/paVPG1fqZGvfUOy0yNg97BjY1omrhYcvFOOXz1wBOQAUOBEcSKhGDsroyBFmtCWMGjDjkro76pVvf5HMsvIedzGXbGxQbb6JNjarl7nT4zp3N04J2SjoOF0QEc+mLDJ1fSBfd4ko/keaFsdhiMPiAHsrMS3iL9fX4DzQ6Ex06O4NUdlXD70qEcFqIwLPVkbYdqVYh3FZgyqLJOZK+Jkp9jWbBVhexdseJoDrXCCXSG9525T8eAvCEw9CBCzGI8d98XWtyItFosrF/TIDBriinkXmTNdXgckVbE7/iXri4L2WYXgvBRS1Dnkw4dEDoxoN0IptS8df3KUApyG87pZa+233MM20+YfZx8hqvv9YprCyhza5S1Fjr1jf/mDvqzdGdZWBYC5C8SGhRX/ANydQZSSTJcT9RTqy/X2Ze/RYFRYVXNigRw/2/tUG9Ni0EU7GWS2VZ9IXThx3twUlMGEHbNFx/f3IMexoCodPhWyJTTL6R12TfBy1GvsCb7PuR8OSnrkD8V98gGhmcBK9rMFjrUN2g3ZrZuwpS+K85fpIzY/+Schb+jCKfRGL4C0ePeMDpEd18chcPny3uum02Xt3LcpBIXl3sCPolNb74feW6aXvOTHsnRS7gChYex7M6LIauIVaZ2X3YWpF26nKw6UgVOis3PC0YRufqBr5wnbnQW9Nx4IUs/jaJqm8WmsFB+wv3NP+Uwo0Sl4qV3pu6CJglGypTTCzwicgX7wZZBkWcQy+V0a1eAQWC2EJT23rBAD89tI2vH78WT/NAyqANxXRX38ejiQUKF+MU8uIil680Lyw09Q1x8Hu7yp4HsZgOMlB2vj1259s09PCUnZVmm+V1lokfmXdR+uQ9mYhnlDgthpXLFXeU/d9cYMVKDpI+oEV31CCy8aXKZ2FTA+puSDXVnIMSlbkwYYrQpeM+TT3+sV5WMdwEx+Dkf6ZLtkt62GyQkFeXnyfpasXqechr5cBr9BWR1r8oBZMgKaQrqJ4fH6kN9i6psz0eKrCGqB4yZ2X7LbQLP8KwUUsH79jcrx9NTrARpLMgXDDkBrLdKn1WFxtLcK8dsCKUN7orQzaMVXwQFBggi2Ee4vwniOSgSTD2g/OzfAwi2JbZDh08Um7Ts76D/84yAZmujB1YyJF6CVA3Eoix/cpHsA5k9dN/l5XwlXFcoSkOPIK8+4VHa2AyZKvR6o06YCu6xVh0gQe64c3aqEz0KE4dSDxusWQKhu+Rpa/gbRcaeWFl5L+sbSu8PM6hv7uc5/kMU+f80S9h6I150csWuDJkTG4eJ+YJkBkOZiYjSw2lo9Qvs+D21v9yrObRYsgQnN8CvxPv1uCSsDGtBgNGwkurCQVz6Rfa1t4eGEtU+ebodrbZTNz2qLWtlXfChYsJL/C5gb+o1c9uaYB/knpJ9v+RrH9dOY0kHTofagBjRL/hvevTKRLS7m6ZN1IZYrDPuSQwfxeBJOg48DErWkwaNYZrb1WpVJqgYrAtdv/Vb55cPL34Ial7N6k4rXv4kuj12LpUg+nabWTlo8vGisSM16LIb4+5mRAvK4cyoA2p+xqbBkvo3OoAOMBKWa3r5ALxqFJIG0lWXtZBmz4+TzrXdh3as9qedA1nnpoCgUqgD21zXBqFjAghPBH8ao+i+1hVPL7lFHRDAr7yKsFLbaKGENBOjESMu9EmcYPJbBrTO2ntMw9XmPMgZVTneCEu96o4Akk2axTRhppGugpLG4dv4cD6wBvFqIr25IU7bvFu74+Tp9tsVZfQFpUKCWLTvMsMaaUa9J6qLkxOAO5ANLf1NOrzGM2eK6L6eFBjHDF4ODAmQaz2sXahGQSzCED4NUvH1fgwuZpVhKOzpWZbB3ct5g20XIrfeJMZpcCrLDmL5UdOjhB5z5PVLjCTAuG7zWjSYEzmUUHAVkU4U5UlSPvIrXLXvrAPxxWYvfYI6fX+B/b7mbfXqGT+yTo9CipknAHc+wU2g2l8JWTkIcKjX3IMH6iVlVZxtKzBf7eabdknV67fWb9F1PdQQPrHZBF1I34X8A+cLLQTfl9QrV5o9jFk0HzL9gMBdxOesUy5aFCgsNQDygoQeIZcrJKEfxjM3Ul1HAzzGQBTgeCUGPS84OfsVvaJIligBU5uSD7T9JdEGr7oKW+cVMeK5LjtCKAtFvT0hsbAM4O4rLdgo9f8+WMFLWM44AaDnPhQszsHwp3AA5u2HSJGLc1fUJKhiB23z/oMmPDJV7qYD67EzVWN+FoMmQ6Nw2P6CB4Hv419wPlUtafFYoLzGUNnZRZJJTzMmj+4sIQ25PkkRbc3pQKvVE9zfWe74GogNCCIgTQRgZ4uGRWovnXOjYGTkrG4dhwobAERjv3xXnGl84rPS/r9jjhKGWwI+EKPqIlsG49cWrm8EC7pEm9XmxNs2E2n0/9O93yEDDIeGgSFhJDkEjL/WhW12JJHjwr9ne0DxfzB8SsqUG73mRTJ6SOBev2XtjJIDTR/socQpkuTO7roonKTCbFVlC6BdXcQ+ILuZGK8wtPTdThfTdu4xWxcV746vr/lr/Eb0gFXkaw2Jsr16WK9cxS4hG3l2T0qLDYKCjP1i7rXshzLWNiKtMcYfyasD1U4/N3MmeHCSy+ntJpoeiZgVWhkRIicqSvFAwrwmtyFtpAde88CXEUoDsD8VpfFQtP7riVIWpvuk+GN03WJpU9z+K9J94GYn6vVaU3dk2VtSqVNcavh4Gy5vXxflBe0qMkKtv3dS04E2arl9jumhPmIvMhtYT9nNlSyNGu3H4vo3qMLPrwe1mhrMc0sZ1mSATkBsXTfUW0YzzmPC2nMwcUtMtvcSzSfZg+2ykxHk+8K1+J6ZMLDUu/UUDzUSbTIC1rLzut0+D5MA3A1gcQv+18etHNLZKRPCCRyubpoDEQ+7leLkZBMpW6tFWop622Ji5U6uduVYs3VTGCSVRBeAaDjH3fm0G4eO07R0fGiZsrVgbmvaKSeiZtAZWB2GWEH6ulAxD8B4fBPh7Fj+7GQxjc8PiO3LGeA75+y8kfbS9rxOrRdB2lYGlYQKigWgmZLfCSmCczfUiRuMzn3V2f338AjDMRyGeCp9B6qOO0tJR85974sul/5V1NWiwfExiBXS4ouQT4ae85zNfHDu2DOoKiueLLkp7SPUiIDGpJspDCrzFiQU5R/y1OfnzNbG6g+zDhSmsPEYKrF/WRWC3ysoGlMlMC+x7xbdDrN2jyA7eTTwIJhJVg4DMpCsIw0zZ7umzEk1Ou71qoLmCx3v2L3s2gP1Q7fWXzZtKmCAC5ha1AJPWty+J+lc6tnfKi/HzkzI+ru+XzaWD6EPYQF8o4vp4KFBFTJAnp7WxB/GbO2xmS9F480VctyrWApo4LuMTCJMqRjFzr9eU/y62zpv7XQl9hwHRBY/sHVvkwb4/XhVYLuIVUm08sv9/Zfw5jGFrFl/51yGKwEVRvEI+AR1W8mOifEdfip0EaXCNa4s3A7xAJVbse2L3ZMao0pvgn8I+hXPZywl2LMJcdSfK8yZdUZNqRYRybIAUGkLnz5jNuZZzoYSvkimdNvN/2m01xJPS1FXMn1KsoFjpKlU518c+RnweNgBvHH3YFTLPt5QLO1fPiXnBjuL/8w22FSYyNdJwcLXHgEHi5KPB5M8eQcqbpJsB172YsENv+qdSff1vPe/Sx3HuZmNiGPFoAijc3C7eTlbMEzpn/vRJr2IigDFg5i9U55yo8Fb2sudxsdmmsHucRt72/rRqsUhv6OmLKhiYk6EmE7nKZ7g0PnJA/QZpvX541eohdK3idK8WIXPV8i0OWPgM4HuUz8LamO0q50zaA2ZBYN1c2jSPRzdnQbkWQJ1+hlyaOZO0ii7DkVN7bhyl0B2FCztiC5rQkqkaxMbYZe0VE41E3AP8/cezgNWMLx1/KqvZuCoVhVsGiamjriK7tmanNhmSfZ0zCoil8h+73Jjs74Dd6PR9haWc8PPxPRoCh1+xCGfwZmSK+LmlGRwq3m+uVETLu5RQBpnNkZ9Yk7nxffy6sqZcRRPO6oFXVGv/rEHY1rcbO+wIL9jTk1qBUhXR+IKUyLrm6tDCMc6Q0I83k/GfM6mMN672mSdYJpRap8FSX6lEpLNzx0LYwLzTEiwwVPCKW95BxyOjG1Y5H5RqCtfEinV4vTL6jTGAEPGxIUGFqXPZtmTul7ha93mfdQsLoqHqXv4kWSGkj1Bp1vbA7eD8Wp9iPnSlg5H5g3T21WAMJNttjrbYWEXTUEbRsvbTPZDtmsdrlj1L529hUcgssm+VJh/zHwMuFaBHYytOMq3fIAodBaSQ1Lfcdc5HtPePo/DTz4lFqT2WSOSYdWbDhoomFxO2O1RC5kEHylY6JYq45I2do70Hmq3i25gdYfSeMBFtrrBdg1g2h85kxSrAgX6OzcvTvoMpwkzb2z31mrLo4XRAIUtBEtlMNiwdfF4fuJ1w4+5I5PnIf6zqawHV++tB8AmllxFp2RFDuiI/0xfPqWlxbUW76LF4v0IVtkqd2deJIBHJ4xN+Ljm84BhaeJ70FiSYiRxhKVMVIkz7IhE1nFFlVnp2jgAZHIMXJMgfr16OPCCsoj/dGG2/IsIddXCjN6YVdwOFza1KEBAc3E3AO+Hpzvzq/kKRC3anyodKS4eg6rLwxLUWEn3rbA68j681AFIR9tSaRG38M7Dsy4dwcsHQw/YzjbOvVfw3X75El09WgoLwgpp6FnbwhW0Rdnahwy5jKHIBnFXomEF+FaKglaokkWsNJYZUqLo0qVgueFyXlfFSWEIHDqqzuggF6K+tymN0/LWdUyu3ogz1bomc1pwRzyyqifLkjr2QcnIUI7UXs3pjN41tqJ0yUXxXhhieFeiCP5IenHC6h1xyY7paNHnJJ6YPnrkAJBwIyEX7uXvsMwaD2QaHyhBJFZOEqyhQgq+Qo0Z7SRp58MbsqgL/5MCp1/9Unf7yyyVlUgrxOu4tX9mJoPrgVuutQsnyAIOxZwaf3iKB1WqZsFm5VEeRAqhrkRcpv0tfVX53bvW7v+5bmnw0FTzcGvaPkqo1+nFeXa/kfhkf0DY7eBlA9eBuO7xICsY3RrkqbFad6Gy0Gn3fdFPTqUfVtUTTFss3izCkP6/QX3unGxDVOXS665TOy36dLUyoXO8mJb7f7eqheeOPNr4+OXGFfTsWOxCRHdxk75LQWzN/aFrn3BlDiEyk1wWRes0p7gFt/mp2m3Ak59GbLvYIC5JhMHQZt5BchVjI/TNCcbLsU+LvC3ZxVgBexKTVaFPdtEPFlWRlHoJyStNbFWT72V9uz3eZJIYuOUlhgvkCgIwuykD6ted+jrPDvM9NuxQBOIMjpEMBpU629G7iTEUPQSxjCV3C9DCeEWZEBlHn3rugNMdBiI8R8aAnyAvTc6HSaWkha5K+eayKE4bHcpuKRK9sDrAOwxsjPzq4jx0QisMWnXeMdTFdIwe3gFvUe2lxr3252x+6HhglQUqbXa8WqDjdnvG/LdnOBxCaNdOZgXywG7BW3LOsbvNfeLnBEWBcq2LldEW+6u8AU89G9zK7WYB/xoliQlRSlbCFguod2ZkaXWMbnXQZTht9wkdSZoR82kqVjC3EXP6B+Rb4IzE7sNc4mqpGcqIo4r/oNbabRei/2ngWe1cdTQasbXoxdzCj/2SJBw821jJcs/qEMO5W5Cowq91eRxWxPqD+6jrGBBVBny2XwhXHqR7vqPyWAnxo7kCzCUxkT2coqzyqgz6iZEwPbpdxmGOyYmu8LJu0VLtNbnsLZePxn4xrNTUmuZxnFwYiKP92BiGaSA9XKjpy+K3QGGCVvzyVCYfuIzIRGoyMRXjlyEHMT/A3WyhLL4/oqmcOlwQDFES+2KCiNYNEhqb2SN0g0ULacmSrdKu0A52LZxgjmuM4cK5FP7YB5cwpm3MkuR7TN+lBLQKeT+DPLQeLwBphjNLy+hkbTiRHAC798yIwx/CKnibrLvn5Ncz+09o1lYnOlIA3/+SLOb3NMotx3OB9Twe6zBsdkQX8+zYvjvkKsXMW6QjgC4Qn09qInYVBZDViN/meVjFTRYtl1BgSYcabYfC4sqrc1NpWDTkwUl4b7GkGXYjSiePPSGpOhDrNUFKMg4nZ0OhqLa297exGwZW95OcaC8nRGhfngpW0r581XIoQ1Igd4sONm7EIQdp46aeUvO4S8v1HSslqHx4IXZEttV66xf1DDtCCsITR0PPJY4lCc3AF+qp19R+mkA7Eelnnidwf9CRezI5Rx1DJz5TAvk4O5Icrb61c91EqyPPDXQ9SO0G5AI5Oyvf3ZNz5tlaPNHaC0CLUdgNeplFWOBmJse+g44s6U5rzf0UnPQAAm769OnKtwAnKFZDqfqE6k/B/n7/0Le9dgNEiN+coENVDTFL9qpWjJkobrh2dBO55eDrnOSPwIJ2b8hmm3saV2L2J3hgLXDA5xD2r6Aek23cwrA2SYd7x/XRHDRjb2Ngj0/VL/Qc8vnL5GcmBukOVSjM6V6SSf23sb6wzYE7JVclCq8hAZVudNSD707JODl/90STNzEX3D34Pi3rayaNbovcz+gly5kdrEuhFYb1Lj+u4WBPj6IIogVrBU4711tk6lwGfEigxX2HrKgMEXtTdntS6g+w+xYZ3WNn5jMBYxkQrLb/ESAbWMUGmt40yT7r5cY59yw2EXPqJbV5PFmoRn8bUp9KFewQ27jAkiP3bPyFCu3NB7842qPW4qnnC6SOPi2SOZBYlcvcWVGDJl0USdvbNL4IqMCFxgzyeCedKjSApiS2VgxIUqqR3W+HjhBFQQZkDfpX8t4IfyYoI7hmHJGyisMMwmEREyQPpTgHScpfAx015blxGzQhKv1WeHlsGnDsfguPi9oOR7f9l1CmixUs9j6d6DJjgwblFDj0yofMc9xxBnBhR7pGBclUFzd6oD/3Lc59KT3v/3c0hMCOI/FcpmWL9Adc5xK8gpA9N0ZhtAnuWH7E5rqO/8dB/NycKFFKgNOkaGPnCtwg8zcQCaxHDv1FSyaGCoaR88WCT5cxHZ2o+LsLD0Kedlj5ilsSOgnPrJqaG4NYdjCIPvYBREI7dhGfC7xqOJMQSpCQT1JRc9ezBWWVT7+s+vXsnJ4WgIzL693rgQQ2BjQHzidkgHNgnn/5mmUBONy8vTLmJIxrdCUJvbkng/ZIAzCYM6K6h+0Fa8RMSiQSFc0savGHPQP/kKwdMqkSdmoUOoGTAhJcx5GjJc7UxWGsbpzBFeMLlkZHtlYoXZCzhLNpK1Wkvu3ZE10eccEu448y7MTx6LnGq1NjpIFkRjcavcvvUnszgYE6wzYYSGvJ7sv2f1Ly6/bnzo9bigJ3LE9FuApVSx+1QH/XLRd7tiEDcNpwtMUo+UjTr8KYrYW2VSCIA9GjxR3lcepjmbBx/ubMsXL6fy/5mfY2F0uM9G1vFQ93GIyFmL/J3x+QNi8V//EVbmZsXabKvye7axiXechA9bzXT64uEElpq/p3157l3wZHp1g6Ac5dLpTpvUN0W0i4u0ywa4RkUIk9UgU3ZZXEviWsGEGWOarj2An6z8DJ9xF0yC4QvGXBDR4WL74EANT8m3829dEq8Fws+PkdDXcTfZK7k6anDVCpD9TsrTczduugUQuyEf+76qBXNh5k7FPWkmn9FjoR2s3cmxYgnk2XI/iorENEkIb/OMFjtjFrEoWYx6GonY9I6hvmmgQxgnKU2LllH0uwrZXS5ojhubbvHa5Z2Y6BJoKul9rP78Ml9AXpB71kYKTVgvLfwiF0eF/ILPkpdJjRg9xPQuepXQOLO57g168VkeLuA0DCV6M9mmK0vVSWyD+KfQ1qeB8kBdunvKO9xwGOGS74cIggVa8CYf1bQUNGh8dO+9Baun3XijiretyjAc8jZqRIAZIVDFwc9+Rh+fZg6M0A+3ooUyJw9jb7BsoI8zT5nGqKfwq5eiVqSw3MEYtp3nvF1XfFZsDgckkd3WceClBTFuET9B1ggF3dwKhFOLKZIXWyxTAuq57k1Eom1tLRf6gIxKriNBbV5/rt1wViwM/KgllHE72KGpB5oDI0Yhx4ZW4IxaEeizJDgswkmwjMDrdFOj2geGJo2sHQWb1SKDd8FwJ3Yt9lGwZA01YcvkZYpz+ndEHw6LTlwwLuucV/Ol+ex6FQ0NI+vZZuhewsh4WUFMMrh2tBgy7DKVv/4gaa2xNRreJeCbM3t8/QDHipvIvy7LhUSoe+No7oGEFvJJEvph5fRFVR75a2NrR44GHpT6N0QUQoNiFLKbkC2jpTe42iq3vtGODh24YxD2IYeABjJUiZ65kZUZZjGyluf9pf+oC/wla433eAdomKXbFJ0wwy2JSSjMTMDXsfM27zDwyHXqNiqli7Swn+axPEgC9+dJeiNQZZFw7JkjOlR6XE0Vczyb8fxhZiTh6E5NrvElc6hFYvkUU2aJEQhgCpjvQYhvXk2fOvMKLjhUU8Bd14ARbcX0VCECYRNcuDnQCtwX3F74sMdEy1YA98HaPC32Wqo1N9+uI4csgMhu2Lq8NtO0Gq8ydq9Z0swjhFPPb6LOzQflLtKVpP6mrQlgmF4j/VvflUFbv4/r3H17wQFyRIkue+dLSgmLkN9Mmd0kQjL3Ba29RTidL5l98ElHrOCjSRqXQQAEtFKf4WK3m0LUiq7eeDeAav8QsHOaE+9fNlAU7KkCTdfXVml7CXuuPS9CYvlSA9knFlrKRYxDLgwpXII6al6bXGMjDKTbWCpGE9Tr7y8CwaYCLXzF4iE0WWdIhqTXXcTyweLxnkCug8loUBjt6NYKU+UzPT+igA9yxCx5FvZYiZPcxvaTkQn+RuNX6YtzdS7e9MOAIrdKrWzHDyw/yTMo3yG2ec0TsjNMBFw3DiZSRmbgLdWNXcPQzEl5dHBGW7xR/vvVGkJSTzrC0cHIkPyaJ3q0wR6sQlg4vdZlk0uy25fj+AFK7owIIDIYQkWce1MzPdrBS4WRcBQK8pYsov83R6G4OjQdZ0EQEFO/EPXUGSOHZFR023VGIxqoFlb7XXLlwkgd8uq2s7Rj84HMnuJvGs9NNpJM6nJ7rPa/WXRTWOdQ+XZGEYM/0Cr2oMIGQ0qTBwHvgqtbSOMzWevt7RieZMH6uv6qKBLkqdxgptfc6HeaCGxBuSmLdofOI4DMqRQCOm+foyoqghtuDs/o/ZoYA8myF6iJyS9DkQjTkLc468kE23Z6zmBzJYbFhjB3Je894BfM+JY9GCnfPZ/t7iyarxwbt7Ebn7SkEoeRuiB41blPEV73c4Genx1rmJ48lyklcka/+6Q+Rb3AiE1GB9oNMLzCfLsqMWw5c2HTT8r42EYc8CAwzCIoRwy48WsbcaFKTlokcE32mXpmLmIC39/XGlVC4UGiiUCVMEkaeEDn2QLmggVWCnk1BWqPLqFIFOtCBZH7RjKgsAUMXJ0GB12JLm3VTdTJuh28SRb94oswJYUKXJ5CUtDzB5CMZWoeO0SsPWWU0Zay5RNt3z9uts+DCnrPTnaMgWjbJ5KGt2BFAKyCg6nd66UBffT0IdgqMdM8d8A/C1MNyAdT4d/vD0hHOsAe1R6rkvyOVgRcUH2XQZmHRk9Cfxwzk+znKI0rD77TA5JzdzNQHRziWZ2JJsGkKZbZtvJcLSJG7ngjh2T/qsYmuf6zNJ5AWpfFsH05ugGAH142itP5KzZTDCCdQYVndWyC4XVB1Ww14rZaT0aBErxS0XXuqQW/KNz30TKWsGVypbz7WOyRi6XfB2C+t+ydZ1+tWHASf/xzHGlhfSvOfOfNbMbAhNd2VnmV2butBc0uqXuAa3WZesFsTUcOmEaTVabOz39N8HQ6enzaj48M0i/6ONTNo+aK6tIPuA0aa/j5M2NvuXLERkpKA45r6C/iWGmhgpMtByCgN4Av08+DHqlRJS48IBkHAMDAenodml33Ikry7jCv3be1wqGVQ4+KDfDSpxpv7aB5ZBtOdVzahevbvK1vC9AkzKLxfLrF84trgF00o25uCYhCbjgJH6uk1ZGIbGY+6jPPzMp+2fO+IFa9ZL8+VeTibbjxeSjd9RwTsPUzOqgXmDLAgppN9jo0KzVnn7NtKsMZba6HX5VX7NAdMm2xFIH1P6zr8td9zsFeVHTKHCcVOmsTaSj/N2TXrLbdToKcGw/MIv4lhg8DGG3RZBmOkDvCaYo3aqlvxNe9XiJIeU3KQ2X0YQyrhfH5Fm2/BnQtOcOlcJkdzKsrIrv2AEEhxhcXyJL+jA66X6gbntTeMQgxw0EwyM5PBwEuP9clXqwttXE+fp7LDlpJ33D5NLoCmgkizmXHONkr+E7grhhvBytP23myzNstQQKNfPNQXI8x/Lh/YOULQWxv9JFFcv1I8srmXm6Lbi9xiAlKyKoY3BjOmW5WjvaOKNS34c71exLQvSmTsYHMznQ5yTBhBZG9ssvx9hfZGZEcRf9E5i5BIt1hj0ZLLGJz3PBt+IThJ5Tk76zRCVqziWM2yYDg7qCbahQIMBvCbz9uRnVw21UavKsJX6ONXn65yObaGAVNft5b8G2xhMPEX1SJFhlc8S+Javb+JnsDY/WBdM0Imcyau3U4iA6/6NVmnzPRu1olX84hDQBRKHZiN0m/cvlkifOLTV+6q4keNuNmkhvXZ2wqgpAAah3fjcY6uulFZgUdIptTlaU7Zz1LBqidL3W3nufK+SSC9a8+cUs1wydWo+EKtw3IoZGejr5eN0dRMQ9nRvD70pqYnolKZmsj6HC62cnY8vPyx17l+vIlOJZFKpAvUX/FthSIXbBXKqMOi4kHUGPxrWUM2B5VIDgZaO6PVI7BljH8JON8llI8ua7cs+4hnhq3TkGk+kZBo2IzEeAxJMaTxJNdyAIYYJIZgzJXOZDNQXnbXzR8N+FgWIM2nAOhyM3kKzKyRrcq8M7NkEDNPgHeO5uuaCoLKSn0cO2J66MdTMD36rCHDqubaTN/DQe7xSN7oL10x7izuH3+gMGkb+S0WpuO+C6J3EUbNxGidHtPElvMJq36gUnz1bVOYTQP06dfKEEL/HjAUMyArtUXpw8Ksi+uQcyj1yspwoVI+zVK4orbWsIXGJn66/p0AebuHXlIqgQmNQOrOIfR/Znc61Ttn20XnaeQ67vzf4xzqS6ETMd00RikWg4STLJ1Dw369cDDlr9Rf3Ic/jJZPe8jQQBM7qgnRgE9D5CBHWN2lGnpuaKxA6m++9L4enKCL6GXWqqWbU5F90LCVCfaS7lY2l1bT9ofJaRXgcxy/D3tlfh5d6G+EfNxWLzCrA2+g3OJ5xiCsU5QVqVF3gA9o/tQGMSzuxYJKZ/mCwUpF27NIWy+Am5hFXzadXCR0E8RS3ESLhS53tqWsngxV7Ffo+Ckx4mljSnl4SjiohYpfwAndc5jr0+5+jCyFOHbkrv3raCoqlCUgnEA7OEJzUsDzd4C7j+NK0AmKGdpAymTOKehA+FhBCGW6FbzrSoJXcI4sha4AS3SzSgAStukkuxRlKADY9l2vNFw18C16l+687n8r7bmFDQVAHb8Nba6HeT4gykIIDi6sCL/xHLRvN6f/WDXZY3qbhCxfr8A8LLoUnevzqLkUxHSlv3qzskBPItN5V2bxzj7wxAFLmTvG8UKK7L4ZGoGt6vcUot+rcONXFVBJ6o1cVsuT97J0XToplKfIBZv2t8BlF7Qg2vhXz+OJyhaiRIfQ01toKw7D37QcTGCwcL7rYt8EQR0WvnkJu6ZpQA6MGECZgdRWtseukCbRLv3XpLNlfh6dS6hV5nrjeoKTS9qWJOYZSln08YvIvypeQAvCNlpOtoYBjM/e87uUBNeHyiYkjulNkO1TlYS3F7MyakyJNBzvL3LY0MV8JuofNKUHfA/t/TEuwDQ6nX9udVxvKiBG38utJnvmOeZ7Q7Jg5VPkd/HQPV2KkxDuIiF3t1Y3FP5/3H7pXOsvXOFrLOkzIzdoozqctbnTGAguVH8jmcUXLjiPBiU1vHHwQBuY8Xk2uzKSyNVLTpIOIEGdWZP2SCx7SeOokqENnM4sBodOU3sYYMiiyacPqGtmuet9hoc2tu6kT50r2Rcz7C/dU9+Q/BE9mF0BJFT9C77bLgdwqQQVq0xOOVLPIPdO/s/wKbvHfCr+XoNXwaZwuvfhSips4vwhCdXTFkc0vyJSmzeO9WhpuRNw6pQhiSePZYjsaoHnwctC6BWGBtAMDfxmAYKDr6c2SVwSUFNpNA16tM5ta63IiI+hEezPm2AuLtopq9RGTvGBEm1ik6be8jIkx3o+D9Tc6dygjVPbVw3gKpBZuuOM0AfqUEtvFBREzB+t7YC4TVFMif5CtWX5OdK3/yWa8V4UpwsuPlT8/ANZFkxNOc5z3kXGtoBei5DBGX2Q3YcqxYlvY8fYFbbCYZwBLACIl7sxT3OiqSn4zaqjn7WrVMsPKbN2gPJP7adiY3rIPoKhkNfXB0n5L9B4Mnx5tAlxwBMN8YfP0gafImeW34qXChSGLRI84CrYBnCMG3a4vORbyxU8G6LNc8lO6CRtIP+zSszwmtrsh3edJ0iSjSWhlXEoN5PDp7gapM6dkXj/5UQE+N3tNB0eCPE9/nBqSCTJ7fjCISzqQknJnkIEWznW1rgzGQnB7Utncktkxv5PlgRs2SV9c6qsHeyJ+nb8ElHCvWf7MMUn/3IdrL0+mXGBsz3QGqvQGMKwa3YL4NJA50yV41FKAfBSnAdJ/JdzGK2PT5prQg2t4HpvGOtwzwkXK9VOtC82XfL6hhfhjMKjpPAeWURe4Jy/Uwc4E2v90X4+mtg0MSkIFkQHwHQAClLxjgsMwF+jjkzFVvlJ1d8COgwUtUNMDBolZVJD7COp4lAXJEQJlAoVZ0PKneNA2mtEwTFpX17kW9IiJVaLXOlnoDDdeM45e4mkRBRO+DKv+As8dRlVvzE1UmdQvqQcHPOOO57nv9djZMlCIAOnQGuzmpToStv6gT3henz73MD5lp2VXkr0CkkEBmM21k+p/PBg2KV/oNRIMRjsK6j+Ctg1t81MttoICl7MlbGOEN2bpbGV8+Pe2sYvtIE0k9e5IdcyK5xbBI4G7oeUVVacjK9UIerMbt3WnpvCXqh5/Az4leUnLC7dK/fJPujFObatmKIvHqJyKtd0hyd0FPYwPy3YgkqGwQlRYkCKPbRZVQWlcpM9icZ6S6TTWSCGy9Q2nBJbIuo55jFfKUuG5aVGPNIIlGKxKxqgv/rxYK6BmaFgvS+5CjBdrYTvACCHAifOs3YcDcUplMlynIjncfm9Lx8ba1l2ycwtb/qwmtA4UplGgfKme5I2NvK6rxFCVybefuysKPHSlSM7IWkVp8j/c7xjDmVTGNPLbzhjO53ylck31G/lP2g2qdJRFAVzx60Xkv37RbKiNpJWFLXNu3xPob6Dw+Wau2hMUsjJGs6OyVeCG2uSRLWb77oL8B0Bp9iNaEQCt5D9yvESpiHRzxRtCZdO3GFpgg4hiqLn6Xi+QfFssPKWgVTe0ZuXaxcKOh4UyAxgSW4qwcaFjaMGx0Q0pAQ5R/Pb8PiHgEyu79NT6MjR4HsOqEPPKRO+6DADmT3QD/j3fC/HBUlqRMmIhYX7QII1EM/XWOdgfQdtv60MeqZUnL8MpW3hnpk6uAwRGUL8aHWFZQjoHySdVDU8LNDLktqri284ZSfrpiJuE68SzRBcfGD6FEqBmG2RiudY4xfATDH07Kd3VwpBBSUyuoH8tohhFX/FV0JS9gg7HF1T+JPl4EFwWnu6i7Wo+tCupFVeu9if3ObDuoOsT7fTJsZeu3fwj09Em/QyluIfE7ccsB5nsMQNXK8xjZM+ovEX0ujIhgpuBcqRxBlesO0PpD6u9MqfgywLR3+ENNsPddxRIOf8Pb6WiTTkvW9Lq9KZt2dR2NljjMK2t8ruzhaeIJiJwPbNyNekVTHMXgqEJwHm26i9GY4pb1DuGTXahmn4j1cJkFMALRWszy9ULuK2lvMrnhfT0u9p/2Or+9WtIKPIfwA23BsSjlzvjcI+1EW3J+96HuKRKKF/neE+0Q2N8QAqCAZGTaZkO9LZf/nJo2s1Y9/26C8og1efcoDBgHx48dcUswn1obaWgazOpwLzx9BEglv7ZNV+xZVr5rNiEoRGf9yHQnxBvhpa+ELn2ek2blSJf17Mm3N35SnG1fqiaabDfEWTWc1mEGnOJ/TRIIYlTQrWUxg8N56R4o+8BABGHegkhhT1AG1nTCZz/aM9QDMX9Q749FIrgK/ivWTutPS6UqabjpYn5Bf+q7dg6Mgvc6HWWzLnGWbOzDi82tByev+fJys+CVflYyMgkgfL7tiMTWZCrDLfhLwBU6XBP8JjPYAj4LpzADK9f3QWLQJrNuosH0NEW5PtvaJGpNtbYt4CRcQNRtyU69JN+hY5iSNBotYDLfgwmTBS31XWXJ4NnUlHyMgvcksf7ybrU9biVffZ1eJ3ZoBdK9urHYHra/3qYCS8O0M66ROfN5oQML3O7p8I7wYNOwmtM3Xe+gSWELYIdNKRg1/W/E8nkG8Ne2fOOWl0oRPXzErH0Fq0mtp14/w0asb701w7wLItmR8p2U+Av9S+RR1cbUMgq4sgwSHroVdbti4cglNNIeSZpy8wmzx1ODhGpi8yv5oGMcz6efehvyQCjXPWpDDzp1qr4bnBLyIfvzzAyfK2OJCNzSiFrczrtbMzE6iXkvV4XfZc3j/kwoEatON9naRpm5HLW/6+7b98tHflGPkWTahMCgEaoqpP5Pb6m2XEzkIeq+7OIE9Oe7ihz9Sy6pLIK+pvQZ8uv+2ZUsLpXI+GmppBFvvqUDBMz1hGQI73KISvxhVZJXn4skki8q01xtcQv9gPzOxmn7/AMIbrRIgPJJnm1kfgboJtYYQCVK17VfVj+bnVuxXfk5KHXkpurYgeKiQeTi+wPd+PhM5oDHCXAaEJet1+BXFC1vNXcd8QqLzJTTrR5gzWp0mpN/PhkXnVWu60rWrKTw0r1bsJ6ihWKYQA5eXFcLFtOcsLnoIXlaZmrPJNPBlxxj5rEt3CiloOGyMNN7aziE9vLQoiIMqCX8hf1SVDyaeLAsXKHoPJAOnqOnCC6UyJTxyRmd/NdYX2sVX0Od8/9Bu8p4S+rKgKVfP3KH2elT4gI0VlSnvapkf7bye8RoxXobXyKYO2L7g7Da/dDC2wagtzzmvMXuv3AMzHgCNl5td2lZvzk0c/ICL+xpvlwSfIkirWyDuztp9Y8h4vjV8YwbUzOYWZEpaXENVlOyeLM5P+T7aVQrczylFOW4on9HLuzi8TTwG43bXbskgogkpJC3x5vB0XloMlckK+hCLtZq86Gc9Mx6efyNZEWyLCUQ2OX+juq2+mR7qx2UGvydOH1/c3xH5lYXcPM84M8VQrEDhFCObFU8FQ0FjBuTeUXBMiPZ03RCv0tkZMsuB+P7Cu9wby6wXXDoYDQk6KBCptEGvYUcC/lxScs/hYRYpjtMLu+VIOYQYurjbiB98MkH3ME0zktuT64poMcUStjxW3vpcPMHn4q8clma+cFdLh0/1Oiv3CeeKns3cZWSioolE+ssedzWk6gCKLDegGErR7EfqXRvkkAFvgHOSxkjVZhIR8V86rtiD2oOppZDjzgxRFQsZ/i8+M1PHxLozsgN3GmvdiRFR0BSfxejf0gUdNqqlY3gnNoPv8bvYqisrBeqAa0w0UoZQHSabONbWFsl5ZW+o/gwa8ysv58kYHF+uPcl5BT1Erfr+KEyTj1KexpmiLrj+470UnyHYfrfxbnkLR0EO4x7hcMgR8oWsZt0kEg7napt0bMOweuwlEthHxsXae59xhKvMCs6ot2a37e2wZtu2qHDwZU+hCmmIR2Q47kjU2XWRyIjoByWykTWg1mUzqIw7nDhjGSAtOmzI8DQtTku+e8ce8W7S8US0+wNIEqTIvDczPHedG+IrSNyxZpeABn/0aR8ZHOwwnaOvGeGszvKsdLZBDKRyaBi7tqonLr8IsjpgrHfl4te6X5dyXYBXvaGvzF++Cpb/r9Jxllxn0uwbGOASgqiOHjqY4Jg4xV4q3kgSz5dYsJ+Zq9PY/2OTNst1ecn6bi4GhdKckBcfMt7fiABHPLzCl9GjGUTsjXX9+uNKJounJLZm2Vf7w31sEnJIbeqvRbsA1kwAEER9mmLjWZ7hLnBzo1caJi2ljW48dKfqq4bzGi7m1iGnmelvVjUtbgU3mSmQh9Xe+NXGZjo9vPExY3YaWQxW1w10bL/esy79LhAnEZJvTR0mBJvjhMqpzsC9LOJOUkPgHqTU5xUjMtsFSz8Rg7lqPFm7zM78kTPRz4LAgJrlIcpaaRe8o3DTr6GbP6p4PjlZc6fwT/L8XSI63nI3fTMA/82iSjp+V30BFKfzkzunCR9QwfsBRoXNyOg73M+WBsPHOG6B6KDqfndjEq4bTMuGOYsiNfWhAPC1j/02bvyDwbiAwbf8Q8wT8De89yJJYWzaE8O7o8C9NxdzfPRzToY/jn207uzPbKw3Zt1i1NQdlwOqmrCC21I/OooFkn/fv5XZziUSBXMW7DmABIuoHqLz5OX3ognmAuYy6ecgY2IT1VBUmCmNx/QXdIZbEaHHi/glbYNtGxJQYQmOGEzMVzgBBt59qgrEy4Mfax7OqC4f+2rnrHFfNKsTKAoVa8YIUBUgGPj9qq/cp9dRG6Y/4vHBhuv05Gjm/hPeZmMN42GqhI1PH2NvJ0uF0GNehRRk5k776uC8tGiYSnpKhMgIcwt/fAAWP8mEtPAZ13N4MWgLqkyQIjGUNgL7nksg/olBVT7P8I3n+8RNXxUZm9ekapg1iGXE/0O2yimggUBz1Der3zyMrDiRdXc0ht9K73JMHkJL2nbN0jGnTKRaRoyk/9D2F8+sWfYyr9VWzO1WY2Fwxej2HxPQX1pp/IsiVovwTuTOCwIXSSPueVXfpkKFX7EB7WzVupMbCxDWax6kMVNhwBUcvw7EfccXboRalsRO20WeLgBzlxs2NuAWfEKX95WpkwLXImTGZqJI23L3sv6nc9kZYpR6JX5bn6ndTaq12MzggdwDP1EU6dlOVExt9fa+zTVtp1JdUncTc4c6dDc/1romc2NtzBNeaji6Zg+sHvJIzKaCGc6SJ4q7QtjVJVqy8adGIlG5PLldotuvWEaiY10+/5BiaeWUY8ZL9zhi04grC84HMxHNPA7aJMzInnfXcaD55yTOH2ENWCndQMZ5/GTp5sw/1N8cC8uGi8AoAuQEm4SWJ1LPWna7kL43O7DVkm2hZ2B5CUAKE6UmWGpqwPh6n61RRvFFgghUFfioky9hn3n0R7uHn4gIcq1qikmRIb73IFAnTZVdB5ruGcHuGY59U+ETQC7ZfKB49auPGtINMh+od00FSrFnduI9O7ApYzpZ4cMb5hI3yjL2izkoBDUOepAUBkVO6kTCe00PXcFYRuRbCkqLymy1gy7VwaNLXwF4hmcoslN+iHXxA9zkbbCwYk8/wDjuw9KjDgdkTjK1vbuqvdG2YbZO0Jqi1nBKGxV5BAPQqNhZOOWjtVh6BX2dQtmbbi4vVpTXybR1WmPsTmS3LH9LLzwtuuFy2iR7iec92Uyp+4j+TdJ/vmQ2xTnCH+/oHisF32Q2rTAbPF3ne4SfyaIsPaZrH/+k08RjL3+JX+6VsqYM8V9+5mQIdExYZDayGjwgzbRbdYsCxHufeCdyVg51fRJrFmPaYQASrqkDVr70LkSVy1DoKBNx5N6tojA8ZZhNqtMl/ayAmteYic69nZha9tkGrJLWGWawRWKoUZErgidSlajRtq50mlkB8akaisKeUIM2jl4m4hTUrR93EGu7Gd8qAv3j+2wnWkNjejanwzPHXL9dfexNYbd1LR0EeLz8e2TJ3uiIttJwxrwlSqdPwtZtk31GXDRBRp8+nkaLcUHQzLcZqv103Tf2pqLwA1hZAIA40Uq/H9/GDvRwjk0osAcz3MSoSw0R0UxuzhZusr9Q6U1rqoQKfvM6aEp4RS4Ybal9TOf3nj9oQXSe7kn29b46gVaqfBLbuyg0Extm8aRewkVYEVtylT0o0Pb6HQBKEEfu+JsOESbBaH4S0iN+W9rhCiUQbqv2pYOil02DOMyICyqUmoJVTe7yTSJHt+Nn01KbABvHRqElahU/vu/0kpTs3RxIQwNmxDBbfBviqX7li+eJusiyb/8kypomAy4MWOpmyNjFOY6qp/lvvVLWqm0pz2cY7l/2UuwqjX7jON2lv/m4zw04KsB0fWY/IqsjpoKG+H/6ic3OVP6RfE20nEP4LIyhGOtqY0rTYvAlFPW6QkHEUymqoVOnx083jtIFlzzEJgMOjKtHHnrq/IE1wgLDYX4hIu7qnhR8eWLIL0IPn2D/zSzamFutZVrWvYFYponSNvyBPilg6VI2JVDexcW3evchuFZeRPP3ipD/1FU93K7F42zPUiaUjNagcUhZAGZycQH+jwG1P5oQVGigoLOY0Ou9vK4NbF/ZzmMIo8PPjdYJKTxAd4dhmmCHf8RTLCnx+0Wi5vKy2NGbesKMbk25s2jfFxPdXbbK1oCnAb49TU/2tD57TKKezntYEQ3MSN/hkwWFdbEbshykvxskJZV5ZR5HLQ6P+xneMdk4MApYeO3XFiDFc43zrxgnT6VoOtrLGnseZ1ZMvv0FTIjgstHN/ltcqOTwaVhp87RtmUelQRVNzTtduCN3qVxU7MwYMxn8fW7IvcNK06nv/5m7e350SHwoPTWqZOynktI/PLZIxVadCXY/Wo70lTcGic00ZC/m1OjnE9yb+de1GTvgCbZPWM9/sL/Yj6dw/JGJ12KGSgUFO1+b0bA4nbdHIFznLeGwFwUPouIoT7HOclliyPofEEviYMBGAtY7GSqj9y5AZaap9kBzqaSG67nO5HgKb3qzztO/GuVUftbN5CU3kHf/sJVYpJypp9skyNGSHB4Gh6N1hV2FX6lrWq67F568/YCj0tfvIq3ZV3/N0oX3mpfnToORsqdzdjg+QFXPmVE2WUa64K3J7DMvcJvZ/ym2eKBTJcPgxfHb2XXiHgJ3/OVLMHSP6VGgleFThjqGI7HlfGR6Hx613en8MwnkvHCy1BhpHq98VkZzsdyYASJEdMXa2oKBwkx80XCQTnCzzoIVPtWQTNpgzzZJb0SuveAKOJIMbhdU95bG2AWm2dRsbvma3hz8Wv3qZm/DZHhLIQX7cLll/P6n79iMRxzO/pOFvxR41EfCzau4NkK/lr8tjTXOVyVjNU+/uuTGM7u/r/EX1uxZiXFZzCfWx7iCxioXyWQKqHYdT3nb75/jLOIqCrdGjRya1a9FwjnzLBrRRO2IZNtjeCWAoS8Ug+V/0nzxH+L4pBYhADhgXpGTe+EoP02Y5q8Dt7WF65oMw0Waqhv9Xr//L5Pf9cXswZDef1sKG0Ea1m7Cd7v3BIh3EGHI2ZG9IKh5XUy8DeWVgP6f8SXXgBfvN1K+B8ZqQNJEYeACdyO8SZd9Kzv7V/hzb5mRqFMVNgySJ4YWiFw2zSqt3Ah9LazuYzDb3tKZlZSgL2K1s7OwyhMVBU9ftdFoKRC4ubIzfQmcKmNuEgcCOcnZrraOoxj4gxxwGlGjxd9YLO4NzeNrYrqbjZVyzH24HeZCZc6n3hTVoOSWORWIlFbNdIwZt+udE6CljRLy1PrKxWiKcF2BSnhfqoUPa/+OZmXOz/Tzov2YSFIgUfQQHwf0iWu2cJr2A74gGW/d5sugRI/Yk++G9dqoY0arOR6PcdJJj9wyoJHXUJI8tSUrNmYmAqIOz7Q82wnXIEFby1Chwke0fM+WqATYgAPyIylS5IeeBeO3Fb+yG4Qa7BDu3NNjm7YBBeffyday7TRX9GJMu5+8HeXsIGW8B16LU81LQQMYZLX2dVEjqf4Y/oczW8C8GQw1cQsshE2ROUtH3OT34u4jgW6EhB7nZWVd0V7qE0f7Jrsu5q7i/hzGxOPtODReQd2J3aOQVB9JCfzf9Bo3PLuGTlIhhMEoGv8pcKzIHdI4RgXJXUw1sS1gneOuWT18RDL2TFlfgAmR9ZCaRB30ab3AEJSG56im7osXfBNIPnRxVbPj+VEtiUwTdfF4PVDAaHZ98JBI2WMBmGNzX55NRHg2rzOEZyGe/b6kU4zhrOXG8Ize9XUxvwhrJ6Oq4ziYqIXWcC2rTG5FIkWJua6Ss2dPFDs4vzYH60j92KvjwXz9f77L7raFJiCa34zLgsuMb5dL7qomvlqzKG5e9frVvh9y2XCiGSq9cRM88ZVKlFyVcDKmz6Uij0kIbK7DAlt3bXVB6U8xgxu6Q1BIj+3DClQfs1D9VAY7aBaQxoetRt/Qp9//oQ1O04pxy7RxpyAk6Hs3xvV/24IHFJKhwzy4cQ8cI2Fjmsl+15wS+gM+xWahTtPEu2K628Q+gFBgB+8AcN7tqIWrmcfo/Nf6YxqmJPT16eDXSHZz1mgFNcyMnNcq3FoSMykz5t6VCePq1/tddC2FbVm7Gx+QU+R5ciUoIZYk4ZHKXFzsg3yCp4WwmWh3+lZ0kidxiFFmTv7tcfTjL1d1WPvQIeSbTSHuqCztiLVqiRA7klopNq69wy1cGE2nKTJY3wol19o4K+1LuJ8dk0BixhJvENlyxkUzpj0bCuNZ3b89nCGoOJhGI/97ONrc/HW0kaSmUt7nX3oUeU4ekimFGhV93qz8suMO7Vd72XhIQ75dWOm+GOIO2C3+hq4nupVeiQPyZ3dyNMqffH1UrQT2E/iVl80VAvVVIYe9S+MDLYylYi/6o/zXedbim/JWZtuBmR24hl1eekb4Y+NjYxiqaeMEMObM9IHDN7KokhklTmXEdRmY9G2lbn9kd1OR+qeSpMKDZH0HfGbwLztPIsqH18oiYT7JT0XswhGHUViAxiyKIPbWmKQIc+bwMEsEmHQa5ChSvNiStHiqyxV7cdMhhlDKlQxOnKzcHED0vS0hD2PUiZuBuJSvt/JYY+5+5S+PRDEfPemZPSdC7VeRC6IKt0u5CuRfzO70CE7uqQrr8rKnqr70YDePKI1NkgfnY0kTHp3S5pyZHw+wiW69RhOav03NJpOtpU1V4KC9Kh7FTGJmRvbL/McIXFqyvgeGYDUBiz6wWJHiOZuaSfhZ/OTnjfDCX8o5YQwM6R3gA0CeemutHQAzK3wld0S18tpL0ToFSLxfedt46mMxaqWYjUwpmVHPYU3dWlH1kJWgcHTnZf00ieuShqq4V1Ill6H/9zD1TSoxfW7LJ6G+13+BJgLdSyarkAPf3hdyhPGrUpC/IFIulSbTwMYsNIslmjdzm30S1WptVvIpq/sd8kmACyca/jFBD3CQU92b7IxeL/AwQp+7CSZKSq80uAsw91RZVpWh0mIAbNuqjsK3K5Dl1+mxh9gSbzKDFC0wGjYJJxLzvPqxYA8/jwBxdS918k9oCO1E7FiNhIgi8tq1GiuZHlGs5FPNAiQ0f3qBj+Cqygo01EtGdZINl2YTysg9Jhb2JpI0ZOXBkeXvHip2zADpeKEJWWN+RSeieGj3Od3dVRB0zaRmgF8gQe01GmITlYOR++8kD2z3RP6VjRfTlScUvpK1/l3NFi3T7ywoykAFeZWAHY5MoYychtjutbkCF4TcFbWWq5QuUNjcL1WAlR4Yx3vNSO8bUzeXNGCft/wv8bsRbwPT8ojuRHKh6fiOQ0zRPyL/J3ks+9BBa6W+hpSNvZieYc/9Y9PUIOYYt457rLlCnlTt97z4kUS5ZJAem54xGuf6ycMr+3em/y1ry4kZ1DOHk5NOu58m1h+YvFqmsq9p5IWGPVIgjIQeJ40HyHyY5AICevJSF923fpPtczlRje1cRs3ENvEZTmAIsgUyvFMV6DZXUA4T1vGo/C4jYngJZJs7vkTMkBbnR2Rwpp1q+58OCPsXIuau7IukTksfV+xdqtwzyUF4oQqn+/ZvgSEpoffHrvKUMxq02ZQ+HmCLLx42hrQmT1FkJSMQbFZ+cbf/omUifzbR1x91P7CCdkiTi3n3fP/piT/fq1h71ubc9/9DGU8Bn5FWFnaULghHvaINf3JvhTW2nOMEmWl6YVR7R5TKTjVx8e2VV42iJAmNb5jgasiulNURuUAhf9xir4aQkbdeal/Xd5JUWTNcM9FGveh6GrGEHYD+5pnztyV/HOnJsPD0IZ2hP1zx1bbl5TTeekKTxg7sPkYNtAjMpaShYPhh2T/esxyKbJa4kX7ootnZqUvTQe3QHffztElVVTse3tsxrU0VD9udgMBmv/x7q/wnJMH0fpMpK+OZfyYnARzRzCDQcEMzJ3LsLGxEYaVHa+BcL4QL/M39sVltU5bKL90F+Zu5skotOG/SD+ZJ6vSD2n+QQ3ktWg15Y043IZTYaFTm/VjU9xZ3rTuJJd6stXFp3nDIl3k4g3OncvUO+f/8MbVTvWx3ZO4WiKk7VoMhMPDkylFrXCwaVux7L8nZ0Ifyn/l6ndLowxK3qTZ7F8ByMQ3aOv+p/GcmqX0bmvfCK9Y53nhOfMWBfQsAQnyy8eP+SkMhg6nCsB8dSf74LXZYHK743+fKHMtPpEpLa3MfmFogCIJ1TkQd2jF2+0m2lL5E1mvSSZOHxw4UJ1JPQ3AAQ9W7f7ku5IEjaiePJ92Eis90RBRMlEWBcXKwA6YXhr9abtgnMdJzdL1atLN+hduVq9WK+zuyKq97o5CLoR60M8DX+exshFPknTha71uvp8KQT8i9RUzxI5UNgNEJ48NE7P3TcfBExrQHp8hPL5lEbeHvkW0J3so2L3FXsM4rYZZlh0t7kmwAzmesxgRDzaeNnihOTS07i/HdzCalJZK1tY5TFx7yJ38IstNRGAbpk5EEnbAasQhT2u2pZMjgtslPQDKOF+x2dxmTYZdkQK4uwcNQ+c7vetk2AmQApyvMmI81QxX0GJmCsfpqM4T7PtJHg3aZf8LVHXUN/4+V5TuXl0W/nPk2xbjoNQV/5Zba5xPtj9finVxwNY7L0MYwm3CmvJC1ZzQAbCabNh5hM+/8kWzRtHKblecPUDzraAtsoWjHHMs9ett6aayGiltF4r8RDQcg7bs0yoG5luQaWdOPAIYG9rVR7u10bGC2miLpGflnGn3zC7BQJbaouNUUe+uh7LFzftCbLQAiIMiY3aGLSb3U6OggSyq9KjYxY/M5BjE5K7ot+uOZXpzrJPqFDbNlFYxhbwJ0U1sTjg9Dlt2cJ4H0Zejulcb4PBwW4fTJYP/XsUXbqzsDWtEwkw633e9Qu2W55zww+q31cIZCYmabky8MQRgIsYpk90/UqMunLyP+TAvOAgk2V0i4Uej+/j9ZRt2uHVaXiXg8rtGhqx9DK/V9qmTIjXoE4mFhPRbFrSpTes/S+N1hRdwlkEit7Wa3sd7JvQPBCMsk2eQVFFRJYFvz7edQpBDC6n6sbNjirCwYrK0e1/q/XhnMGVS/1C93Kf/lARNa9RopuM4c0b3487eexVIUnflC8vQJRds0INCor4Gd71oaVa/gtaMWo3FgnCAxhwoqaMCsMBmBQqu+MkW0EKJhWhreOCdg65aWfA0zD6ULfRqPJ2hJ9EeWkvPiqnCgGzS3aVOHZ0ZQNcfTN4JkQbRXd23imw0OrQkzCJQ4/WkJ421ybflEmtQugPN1/XkgtbfMxKIeaOo6r/sD2qjoIjdBZEdQDwpMyl2DmTeCj8tPOC8sLY4ovN8LeQIlvncCCHAUXTSLGQGvCTKcl58xFrkciXTSwsvHw+IDTuO25BsgtVQV22RD8hJufUq1oetowd6t6emEd8AqjXgTSD7jVMAIbGpDQ1bUPt47GnR5+e0q4VYhtoaAKvjdnqCl9b7e29KmIW/2jne7Zo0IrdbyGhuxx6KupfaKfOsCdDfcySR8N1lxfKUVRZH7WTJM6lptFdO/WFRP18z0P+9BiHd84N6RI2MHxTmUmZoS5p+zMqynBfXMo+iL9VL+dWMmrGIjGHnFftYo9Wd5/9ejbNEph9oQqXcDyVyDmajFZGT+UDs2w7PXqv+XHhVAhmhqJCh8OJe+taHqYRAqcfSDcLKJ0p8gPV9+Ev4Y8JDmNPQTsI4odGM/LTr+e7yh8VLqrfth9F/2f7gq5/YRxBIQik4d7Su89OaKp/vbbl9O9ov3uUixBivDOHmpQ8dnJkDbBeOok+6ETwTsCWsqVbDDIhtVLFc+zalU2KD0ayu00f7HBUOsbANG8blIgRQ1Z06/TiPmDmVadBcf+51EWMyV4IjJSwARjUNStGURGc94xRz+dPuRwnNGhZ8tVJvtvG2rqLPiAHH8Ff+K5FVD/ul7anmtUx3gNVA6U7EjAM6MJAcLeuL4TSVEvwgN0QRe4Wv0mXoPTFBxx1ZMuXDyWk7lAq0fEKF/ghgMINvbCxPOl1XBJIzApVIPoiUVMH9z+Ocfygsi5rZluqybvTmkspBsHUAxZCrkx/2CJvLxZtXSJuAxGU1LU+xNfg2y6drQPxphsom027f73Ok+i7fmA0vaF/jApHATOezAsKhD9i4M6EIggnYZZM1K+QOBs+ui0Cj+aGnk+ZI/lOJSvXPM7bpmgZMpyf0Alic4d3Uf7TGTxl+9tooU8AKhlfhyY8OblPo4ErYHMySdZ+4zonxQDGwBTKPPjqQaVFA4DVihWpJptGyI9dbQNjDvOxsa3snObMxBuWDUfbtkip9VixTFgd+LJpq19M2La2arheY39pmzdIvzDo0GzNidtXdRKuTF7BnY4odiL7vNeV2maAP+JiXUnSgFqMQhSDj4jp/c5c1Fztlaeb6vGDqbXYkEG8z3KfNykPH66QrrGltAkpoppjCQYI4DhwQM26Cf/WLIel11iBOZxEnEX2ROJjmuIUyGwTcoZbeLpZX4C3u5+bKH4NRM5CYwoW9qZBuotw1D5bPAStPWg8giMVsjjgi1ap5lLWQX9sMUBrxH8i4Kg97mgQG77v02+5C1ox0xmzOkjqjy+suT1C9plc+LTDZyfNFSN8pdg32DyovRxkeqaBbRLpTAsxMO1YtxROUiV4VkFyX2PcUIGjFD29ZPifU228RtzPZjDcU/1WaAc9brL4dCcB/XMlDIS7pX6HNBlmIhPeac5Gr1xqOq9ulCn3ONYsbiuy56JPOIQiRj78UiR9Nj9zOgD1KRRiq9FjJ3g0n01LsI9dvwG96TCgSoCW+FMG/T4DdojRSjimavMMh0ymvJ5RrwUw1Og4n0Mxh6Uk8bMBZIBVwRcSb9wTgGvxCBXoQk1+RrBIemurovFWjVlVhSqE5wFXVyMaR6Tv/ZNGX18bViOJYkO/qnyu7Fl0BO31r76bCAwVNScEKtUywRgu3oapLHsMDdLTmy4ynfU8Ix7ZOpjoh8aAiKmcnPpuAc8pCBsbqXS6efdehOX64N1ew97L6mG2PwkJTD3iqLwVgiyL5j1UVn/wine1Y+7XjdD1OfnQQPGqV5wEDCG5wp4wmnRHDK1ZoiyINSu7uwRywNLMDC80nrAfyS46Rtej5ngR5up31kDT9is1CGDNoJJaDGb19cFiK0iW3Z25ar2JcmYhmM+GdyxQq74a1cIzRW38EkgGRkMQ8g3vkku4gCD6hYOL9qCQKOqmN3ccRXjlITsxa7HrzudQQVaxO6Co9oYuKqAMqV36SEgSEegvSyYgOYJmPhERSOSCeHONbAR2T/ulAwKcivJcn8cFgy8gg8wnWFfGOHkySSX1lEUguI0/egPS9zjSnETSbNinRe62T3fh9iHEO+fMTgrxeF+AVH2knZR+1qQt1RYsjyR/eU+TMB/AvKxXXi/pdNH4FZkMbttGE6T0A5dZVxrtU4avSv8jETC60vy34WmoVQh2jKscMIZVdU/xiVVKtMXPmI8N/ateeC28jrdKAjIFQ5xBEypG3cI8Hhncko9vhpeznvq29bhorcD4rCFEMGO/q6Z1OQQnQill9xEt+x7lTVV8VBNCAxMYkvWja7I7IFn9xBnFtrWyNeQyJzyisi1ApATvrGwTGM1zOLrumhWQG5k2hjsK+pWP+5Yfiy4lQiHmRQfz9grVVbvCb/f/VHqktkjDrICGHISoxQ0gvjf6VJ2qlQ3KB1yitsW4OX7xXuzamEyYCO98TTH1cVQFvOZVFYx0mJ295+0vYLApkSJc43/hBKDZ/hsHtVYzYLzqWa/JJ0NWt2rV4fpo2uYhBpm7CGGTFaWg/I9PdW9wo/M12bob4WxY+2zjQxYfZhF/HVbJ+H6ukWnAv8jsJzCgdYZDfzJhc/2NQmjmTSuLEVd4UbYG826z1Y2LdU2VzCh8qjbMF8mLXtO5uk3sqaL4GGCK9/oFo/qNYeHaGiFPmBeuVYMS+x2X7yAE1D0uAN342R8o1KqXswVTYLMmHsRs7/bQQljXLrcAdrXBn3/5pDTrsTTN/cnnKLBs0vOFgzU1nO+hv1Mx04Ih9u/excsLlNq20mku59Owp9ojp5nOL3k9/EK0dsv4viPGJesDeotH9FpncaURyrjDxopOQ3kT2u1zAFJ4Ej5t8nvlQMsSfvagU/poiQF5KvWGm3h/yDtr6y6UBEZoo8aDfcWjiISsdzsDSYdD5ux4oculzorlL3uDAWtmz6eyzvSdmoTyHIexy1M3sVCK2b1rLkyQ2Ij5dluoZqM3GlqnrkEkCA6B7DTbNZ9nCzdbE0IySo7TfyJM/+5cdi7QvPSEm4Yr96CnfAMoL+iB1e9JitPmR9rOY8DOWBk9Htymi4bI93TKVnAcSj/22+ZPOQgHEBDVVnrpz80IS/NhzQGq4OtHxY1IAYtaWAnToKE+2D2lI79S3gFGv7/MnwlH6DCn2Wj/JgiX30b1qo2tpOWpxWGD0Zu/5nfiL98XnOGTDylmdjFGbtBIGRF2H/JEPkvVZ+KKkWVSnqMiVi8tVkuo+8IXTa1LXs5FXe67xWO1Kg6O6YBaplwQINF9FqhINVotG796haiLihqD3H7Tgx56N0Kfaz+aESx9F4SMRB3gyUN0N0ybKTUg/hfNBPX/dzmVFgtDfDhqWnYEokN0JRi/0yjtqmRIz030EnZ8Lpz8vHfmbgAgfNG3RgXJC3IGtB8pjQ9SngVlUeIIdBlb7E08CgMapL9S/Hfy/bN21F832H/IMJITASK7PJH3azAMzqnD+kBB8cyx/jihSpNoJQSPZ+eZz/5t86Q8XifHYd/ffLoQNcMhzcZZhQ9iorGR2g/4/D3FY0gEGvBl5ixyfZr9C72JCdLWHDKTp4vNFNkJRxGTdnZV2q5vnRnKRaixy8qqlBKP9IE9AHKqAT9zHQfkadu2pELWM30x8LSnhODH9FPE3qbvNrIRhQe8g0Fk/Js5cUijhLESXCGh+8+7iYCJPG+iqgLHiJVZyRceRaby6phoIKI+2P32WVVfVxo8zLPhuABSaJ9dNQ6uJAix3EQVWGFSFt429SfM4vuvTlvK2ukeOuoY7P48WJCp1OKkBPjwqbVLAOoTk0i///q0UhbmyoKbzM9b2VG2M0J2bMffZY4IDfz8ONeo1mbIqgzJ9vo+8MHK+TuFcYSre5Rfm6xCyFHhDpIOcnyUiiNweVrM/lP9WZaDF+4ef0N9gscezeNoGaM3KcaFruk0FiYfGmiyDTT11+Lop+QtZWYUGwuEu4WnvieuJSeUTllzWhUUQVt9s7nx0kM7RlCmZ6PPrauO3rBhl9OIfgWkiNaGhklC4JsRoIZI8O84QP7o+7zl9gTxv0FloYfGMxtXod6fU7rL5MOTtmB//IgoGoqEIpg6fSAM1fNgIc6cCn6BbL51QrSZJrm4aOUqSbSk8T0pDHLys2hI89y2zsXyHirucur2xsdkh2f0GDw0nM8whqUz9tOJYsp/kQBPydBmiGlaJPcp/fejRvzVwAJba6OA4UkRwAT0P7THGC3oEEzp4jgdzJ4f56zffTotVsbbAzf30cHJpFiyK/TehLLnzsRr7yzvCLW5IQNcg6Q4Ia/ZTEC0KrfyP7aeaTpEl1HoMkt3TSQ/XNcIiVibSg82uG349R9ZsG5ZYKoi1uSVUr9/x1Nh81fmaOEqvwLZy6EazdC5EcS2Eh5zNwRHAZZ4JIQgWC9OyELn73maFO2nz3nuXBQOg7l2wYYD8chMU3LTUZa4PF4LiOPTh8+o7daHeQk1tsaETL+x6HgZNIviopCRTVlW3n5kDnu6okw3QaNgEBjSBh5+CQL4fk5AKYBnPCiGl68MTYcL14RxliC0dNg4s5uYEateGdQrkkdMGqe2zvnfkOfNiL9q5IuXFdzoSYQwazbupS4F+M6BQ6EA0nks72O4JaGj4LTaLBGGvshb42eTQHgdSC4KVxZEqx0R6ai+LQ9huAnhxX3vnzFT6jy2clrqBSmn/Qt42SsjKKuJuYAZXdLUHTU0Q1tpRIqsZ/iDrNL+zP7lKnz+hbJsuJ00MzRh5APpZUjiXXPiG8cBMUK1/au2fZFsS8MKMQ5233fG74Yj2TY3LObb5Z856IQfx29ow1mfo1mnPF+EUdz8E2quHvUfsYToyrOWP9dwSSL+hNQEUYXn0VcG95UcfLJcLoZ4RmJYhOxLTC+pO7zkonH7rUosBpK5DxwRD9jnRAYkv5WORX/zxymYBCppoPhcLHtIWKz437SfKqBe2Z3FLQGZkT9PT9iATnnmwph5rJOTA7routOZ74knVnivsFWh2B462MyCRTJRw582G9XGwkUhwoIO2Ue579EP5o4NKy8ClVEPat6pTASPWtwnIuEVJJ6a6TMnSVtCM42Wn2cE6noWEFmleJP7VMgzw9QM/qPQy3xAwjIjXvb+fehZ98K5Qp3jwVLYOvEP8PeE1PdyLGyy2QAfQrAkGX64vmew+52cyob5GIJ+sy/yEuQ4loJK/NO4/Avia+E3te+DWR5aHDEKdPaNUxRY99QlO42lOnbiApmhJqZfrEfvD9oeGqhHO+bkF2WPKPRTx7l6a9NEbfyV9FqrSbNUlE1gcJ8Rm1DBlvtYFXVy7J4GL+LlpNvd7mNG+110XcQsFxxWLSPFXAhNB95eLz7vSSX9YH05NyiHuEzOZeuc7SciwfEAi+CO13wH+VuILaADFqDVuCrAg8skac0j1MPmYBKw8RmKPJ512FviVTwGy04mzLWCzgjmTJ5R7bTGoxCTQzUuc/tFdmeSHqRb+SM3r4vUq0yRl4QLCCi9+KILHaeUxshjYMEXWgur3okD1G42mtGWea/BlGpLtp//nUBARJ3j/18eKzsCLr3xhj84EBunKgxDiDJdK1fvYGv07G4OQVmTXO3HPcRi++7YYiPDVFJn3w/daggW76ew89kPGMeZ/y6R9Kpee1ZUg6jFxQjA5Bwr3YHoAMdLr2vASI4UwRQhEKtuhbd4bhDPT39xRjiKo08IzwSOTezk7MnYk4N0bLBHwZn14BNwnNjzkMG9haDY3IxWUkLt5BVaXvWoHJ6YpBcpEF/ER3KntK8/UBZvs6uDc0Th+0oZg3UWwYvmNsSZMNiYRvv7fqfPKbOs8n7uwIkQl4WxWj6WBsTrjLHTvF8zeznlTIpsuJYFdpvPU0OEfQIUP3mqkjJiVzSwugWkk8CVo5Wxi2AlGWZin2JxFrtoDXt04+omYoRQLYYMR2fncAFQVJys4UV1JtyKAS90iLtgCzfXmanReiFbpTsbIiRpn+5iorovKRQyAEyFTAFGq2SicHFZXXhrtID3BgQLlYrqG55PtZnn4TFfxoaWGCmF5FJ2+QkDWQl7ofMmlKMI5god5ITzf6uCzoZbME7o2NJNDvP3c5RhG481AaTmhpjS5CFNkoZNlsd7PYDszrSYgqPKbrFxi6USfxpm+vlGBw2Sz6FAx6pbzsjtM2RtTlEkhJ+/ruFIqlnUZYIrGjHgf+oX6GI5Tw5XTmqV6ELOLeC/JspyOSHp/4mFPNrl6XJgBljqtbytid4QeBTUm/GgVGGdEY+Je9jZaySnyw0nEzA2to+u400uKHRumPSdMRt5HfhrsyU5ixrOKmUBqNDWmHGA71zf8B5lWbdudRdP5ii4VxSqUqWtkKnCkVIw61mSVS3GfzEP20cc8rwBDkNxAYP226SjHaAtoTtUuRlxboLaR5kiHTFNTkWk8iAqDYtNhhKQ1qEa4VUttnTdazBQiBq+ctnjY5fNoXSHaMKs8mG8Xk+88xooCR7NEAtHLAXcePxwcvS+9+AlL9d9laFg/5ovKMkUVaoRWH77AffAK6RiRJWTxILFO6KpJoaDpah//P2Q/jWMqb9qAQozg6/zlAVlJ+EMFFvtvi4r+vrBqZaxyL69Rz2b67K+7bduva4TcxaAwifn6I6VpckaxPrpQNzBsxmpQ2kdkc23CgYeRU5D/uYAOvU5bpX3gzGqwn9Smaa+H9BwvuvxsNi4vopV1G4y1YINx9qF3D9O7EBaAw0wdYqOVEevDI6k1ysjrWGGhMNJknqFam+KLj2BJwkR7SaSYK4M6A72MOROr4wxhfe0AVXaRzFPopTZQybdBNpcxx0AMLhglulCcywDz2ykCncflnRUmHZ6QqDAxvpAhrv8wSM2V513KIun+bhMpfazSoyDSBoPJZLL4EHzy0C/X6TvEKuVN/IUM7L0qZFDpxOkXPkAmQgPiXEbk6LzVk4mkBNObKg//5rU/SkvuU2OYW7A6DE0y4fRV7iaTPbfyLUYfW+9dd7dTOCT7BDtKV+T6Vsg/+QPbkhXQ7R3OI83yUdZ5MqQ6xsCznSpD4LieQXS/KQgUj5WGqzl8IpsclWaGso7uc3CaGbCeePKxzMdR9smz+rX8kUQpBRuSwQscLgKXidthq3WyIeIP+CR7O8L4bc/B0vy84fT77PssSCcB+jfjsSqXA6NpqxrG7GdkgWMm8sGtt3VTHpEcO+GUCyePDsrx0TRkEF+yTjTmNsOoC217NkDYT69W88Xu0CFj5PKZIoggl2CabbCw+4Nk8XtRdC1eU7V/1RMBkV0nLIXisKNyprZchISHEcqzUutvKx3Zi/dANDh7gNc+35eVx5HjZPW1Wl0B3WS9k4CErVremlMTjb0zVzi+55AxTNbejD7VcGVz9Ob7SkOWcrlDJn4RpvoA4+pG3CdnBddrwcURByyYxf0/vQieXY2UtV5POnSyfr6qokmqvRVMyl3Y+7y4SFL3mBLVcGFBI6Na0pKcHEMnZQqo7W1QhdMo0z7IvDdP/TXsN1gH4zIyVjIulB4H1Urwa0ysMEoBOElvGgV1m5RNEc77Kh4vhbHiaRezG0D9g+sMzDMmgzBjWyrgWYMMirqM5CV9jFLvSY/o7CGNtI3+DCcTznDGpo+fQywD2SFrBtGgTnLi8unAApXNHFfTbeMSu90jkg3dP3DGTtNqWNXyXVyOsksoigrsiQclClQsvl+ZBPJOvmovK19G92OkY9Q0WsIHavnlNRoqkzisrYGNK1IxuRk3qsbJ3ANZ+mb4hsvYBzV1/W7+P91fImVSsEEGj2rQ7s+DNGs1YYOnps22lIPo+Yqr08CcCrpEupO59V65NKmi5ZtwHB4Uj7092/lH/WoJOCq1Pi7tQIocOSBhfy2I6X3dhRKzcndgX1h2S1YLhiAI0nO5kOrizAJTXqBP9bsHGpb+6XzqU0TH055yZG1ZhRoSxodeHTLpodEM0DDD/GVjzfpgkFy6WTmUSzP2H+Qu5bhi3YHCMJil1R2l7l/MR/qbPdRbqAk91IP5V350RZzud80m4agkF7z4nmDrnp06/7PmCM2KUIi9OPFlY5+7FuZwp/d1SNqm7EPVw6HS/+Ju+E8o2mIY9RXhWAOzfWcnH+WsuOZftczUkxg5Jbew68opTnocAtGGGf/6Dhpu06HyZ6tZ6LwyBdeM4yuAzKQf706Ngof7m+LguS7+8/pAOIdTHoCgdVjnzQSgubsOmMLHBtT3AP4rTBCuQ9NTNK3doUKICe66tNCB2KwRhsWz8metki7JCyRCeAXIRUrD9bAu3wNF6dKQ1y1N0uGjY4OrbBQnDbu/gf1nCGEqmRwNctA3RUzKB//QFwu/DGSxnwfSxhZuS7h4giy1QnWotZ+FGaUjPmz1FfQPX4mwk8ZbCpT2Tf6wM3inXbDPd77WV99o3SA8Nr59dULZFMCUuSxN8QUdeSwdWgkVCljgsV/Sg1LChn7ahrs5eOP3Mvbb1H1+9qO8800TyEbEMon1RospkhXLjMKwTNw96zHDvtsWrgLGiZ9IWGodH087LX7Aft300oIAXB7UzZX1RPh2b/CRx07o+s8SN1b8PkT5+COSyDENkcFN6W0V9HLeV+d28mB6Lo1GghTf999JBT7M/nwuM74rRfETak4yNcoBlZUanwdf6c7ke4Wg0gefpWIY0hRdSO7Bdr4URZxJJOavkIH3Czs7uEljZomcaZ4J43qB39gnlI2MkOBTl8m9xFOWZP0Ixb78da8dPHONvW4eGGIBf8u5J+qkbAj4Kd8V/JpU9W2lV5jR0+HXBdZf4+MhUyG3ukCgYUai37mAPuOlJqQe40cj3hcUbLHsxKgHRdZiPLTDkGVoCKTDz176pX1DkqYh6Gcwddh2R75gIB2wffPtlyiROLPTHFqG2y2Z2r6mcMnpULkj+Q8gjH/NDocHHj5Gcw4iOZwgT7SgMIS7e2jNOxU5uzrSJrzp8OA6il/c+Ut3HX+fFRN4e9KFoF5D2yWdRMzRMR8/ZIuGBEI0vtpJHriKEQCM9L3vRglO+sIoqJquVELK0Xea1a6bkAMROu2JKT/Fvih/8VijgzeKKh0zxazNeYrBffNk9GBH/iSm8vWkoCdnshXwMkEh1J+1qBbfUoWiNyHZ5sG80ImVQPktzh5Vw1JPknJjbzbh9fgP8kFWEJMqupH8yxOd8v+3FkxT40DqcLgm1d3Hx8DuuvDcqXnAw0eDvPxhplMki+Lqct7Ghb2/Toil/VJ0hTr06FkqrLpt73jhgv0UWA0yDc6vHMJuFetjDIVcvMWLw09irw7TUQHb+/9ob1WK8zMgrglsQ0PMDr8teP9Pa5O9dqPezmYfsQUd/4R4eqTKh5GBtrjVpuXogMERW2oUJBhXJO6Abra4CLefW2m9vDKeqhgCEAdtulO/99NW9gPZ+lmmVeLfIuXzXrRhwdQxzQDxSyrZr1fwaaMNxg6V5MqVCF/EFyczDPQBLqSgr+FpGGA+CDn6jzG53HQeKPRYAqUqdCT6ZS6HvmVOyLSSuYnZKuXkol7SOhXAOQ1voIWYBS8KtO153zsFF/YZNAN3CzoR3mQNdEvsSoIuQqT0+ZwNA6QedLf5qku5ew8jrKayzV9PwuurrmIwlcKslrGgjFaA3/1DLTRxOUo5BFTabcxnoo4XEOatJSfo7EmKSWyHUwtPW/3skwF9p9sgcj+0PrOrqpAT6Q+MgEazswudsaFRbgUvXal8cPJjU8zpqJ34/9uHjaMW5XY9Z8ZXmzdAJ5maLO3Qeutv2qqrZ42jhRbppAHL1vOfjkc0vYoZCQLbJJqBCz2TU3mHby9auj+2sxaqxB/VyTHdVkSfnifiDo1IiFssMlTD34rDV2TFBEFkcXCYSBMRLUvagVGaWIcfhyOKZ6IMF1jqcrPUlvW4xalW7xN5TGPo1atSX8KwcXMWEFU88Ver2J6BUWcxdRNZ8v7IO+Jh0AmUauAfSm7WAr9tKB+f9Xy7JPvnhPNYVt6G5hyu03Ba/N507cKFOh7SvlWRlmG+Ym6JMA0u4+EYwQafPTLsLF6cpx6a7uVZwIko2j5dalV46IlxYr6mMbk7LsVcJmRFfikF20/WpY7xdd03VgYOL+Zd57nimb1yIlS5lkI9hqxPhyMJf5TEVrOVp91MqebGd8bnaj7w6Pk6m+HjPm2YqAnZGE5BfH3k80ShgB4m6CPifg5Wi9vVDzLBoQXqjxGJXXgE+pX0p4mcMDFhQkGhoDotber87KkrvdEqt6C019Malb2rng6aiZM846t0iozYHwukpxc8SRBhmdVID6FZpWNzoY+ReeeVd701Q9Lsojyh02VnUXAy2qFsVRsS3Df/0w5OTfcPjaN7FLvEUE0iAlYxZZPN+7QcT425Fz2fstkD9mF3mvMhF8e9/K2JCanh8BvEwOZUX4RxrkcwdtnW7X0YBw+92eQuyDV0ad8jhXuuCD99bvUM5gIRFI3phaof47tvPWzIY6ljjFERsbaDdJtUOSGLi76U2zar9VsTFt8jThfI/+oVj3yI1NdYVX1kRuOp43EqVOBFEsIItwUH3xj+dNdnjhCuvBVJn2Sj+5oJIdtTl3rlfU1zY4mb7NmykCDCEKEIrgb1q9ZIsgwOIpUEWxQv2oEhyAnI8ackOCowoHZXR3+Hv314otY9xpRviDia5H3d3CbeUMr8WUjpKNZkqd6J/dhskgEjFpUl77irhcjsVlm+i53/2MeoBwMgW744ijNBtufTzh4oHYxRJVxIstz0HaP/x6DMJRRj9+n8y49m5MA1kSbEdSRI+lWyDeb+ffCMQZ2MR1pLdfBC7S4HVSTT5E4wmE3DZCL8MJXV1Wg1NQ2JjY2IqFmtZu5Hv0ha2jnukFE7wqS9jxBCFIAVw9kFlceZeAUT21FoId7ozzvyTM4zB6buAwY6arri8jYnz/aHZdbnyxrrXsZ/k57EXglkJKc7gueyL6Tc3bRo8HeazpFTs/Ui+lLoc6bKyVLv1nBbhuQT1aJ0u42U4D7ZDjBRC0X0YZBa1aog5QWGWbvsxILi1ZpRc+rW2TttiXEANvwo8NluumrkMjAAzhHtDbnsnFKw7QJ8+cQhiv2adSSeomQf+aAskbiP8qKF7gE0QHsOSSQp04tf7rtuGjjza3b46e8RfYRmPf9H2GJQK8GQi4+Bd7BJKsnH3JZ7sOji8MMVSr8S+kLnDgbzrHGmc4ELDTWa8s+P57YhJ2Rzkc2NHsGIc+FFHzrr8R67QzfksaF9Rsls/BXto1TZVoOLngHF4ONT/nNVviFc3N+6w6lvx4MHO4hQ/d9MJwrUtwCcTFq4CNpg40J6CaK99/JnY0r4gbw09+aRNF5bQZLFkcwB8MAU/zafY8tIlaZbS/djal0X8fBLG43c/1CghDX+PW9W2ODDUMPkc91BRWsvuwTQ7ycOuCcxfrQulrUvAAR+3wZC/6FsCL9sqxNeIfqdvKB6JN8dYRVnQOBFsaTGFb62GCxtomFQ/EBUsSVWqF4FC3P/noNqMh0AUecruQbpyHk06m3V5yWRAOLj/Junu3oLhvPSxOfWCKcHt7kho0xWQNpp2qKayqG+Jpt1vLGVhyA/C/vMmRpiaUnDJtW/6nGWhX6XE4wIEv/OFV37QnKQaDvCxiLBUX/5SBeIMlmgxcvz1O6rcYS94J2eRdqMXBEK+cHPgKP+TJ5He1zcnZGOqvsq/ZqIcWgeQmPZAcICkMr9x3Z5zmP2hbwAx0yW7G2KUoMgbL02aQwLywW5qOzPHhbKQXBTXycr+GkCnu0Ko3vsglzR9o2v26PAqIEnHm5YaFLx7czrEP5B35Q6qkYk8Kpfc/WVQ8enIXGzZkyX1bUzLBkRvj+dHmf5eULNhuClgsJtKRcadjCl1et2SxxwKCkiHuU+X887uuv+5VtS8zGsRLdGtdBBbD3aO58w72iGkZxqGA1k/iJICBib5/sb9rD3rNFK3c9nLvIPYBKCnCizb6qiJ0ZCt3xehtNG60/ThGWGNU5P7HS9Kjr46WAjyoaSiDnHpe9R5HFbgAiXds6Joa2RHMSykpWx8bXso0HXlyrZCnPXZN+r9VE5rZd0UI7BeRXfAeVH0NzbCdY+h0YOCA/C41SZxmLhAsq+zJ51umTaNCQIp5NXiqzSXQAeX5UbqkpieojQw3ElDT5NwqQsiRBVQd3oc/ChRDzLDoQ2e6SDCkI5QRVw0YFAXe+agUXkg3l9mTIMrZdqhIgIGMFOgwRD0lD+hYzwNTyH0KzPmM6En/Nk3P7DLxiiJmO9ZmxCVxj4oJ+ChFRopUKaldTBToysvViXuI8iCpB2mOlpfrSfVW4O1CMpAhF6NMTlSmW7sGwTDKNBsCGddMtbmTqKSBozZBVSJL++ZdVkwV3nyJNUPoL+xXZQzSqJzuLPGUCTGwa/N9+3Fj1sU7u9KZzM0S5l7uWpdeMQUEHdxgW4Zjr0MJhxruFgWQlhbOxuBL3EmdnpW+oorJteAIbCZV7NdMfn1ifYrsFRM0UOAs0HCpxgd20IHGCHp1sRuiT/LB6WoiiEiWUxsXN+iSr2cnq1uu9WuQ0wglhSfJvO/U3E77RvHTqmIahEst1Lxzc45uoZc+rjJ5oGn5pVMDD++hS51hZkW85DTYN/1w+jiX6dAgfuENPvkulynkmYyxpm2yeezEYTE0fPgf8w8yAI4liWh/WXj264FfWPwQMy8CpC3zOFEqth0tJC8dU5AS1t15a2Eai0QuYxp1TFc0HCdLm5fwjtalADw2Pdm8ZSHIpM2LqSZ44rf7WxUf/T2iLWPj36dYFPtGenOuSVdkOLHsTilBhwzcgEVS+fIlOKXbe3rTwJ4yQB6Tjoi9DS0thl2CQlbL38Ql6yKQuovzBRJI7kOemagjKclcWriH/9oZF8H9WegDe4cSv0dtqQNXuDR6O0F+BxJOqMTGiFqPnuQ6uuACS4fPtJ13gUqUJ+8ny3be7DcdHybLHCMa4p7jIOWzn2gUbMOlrJnK9GVkepOZB7qpMvAM97WUD57F7sKc60+PQzyF9YwhC9JqpbprlCHIwsEQIaNbFJmHglTt0zrN9qkHESWsgd/+4wzA/D6RRj5bDslcqQmGsnCM/igXyVJvyWoMs88YYxwVDD/nUSvyNv0hSx5c87L2G7xPxE8/jQMk6WbMbwHAHH4oHa/8BcSUkxBRYD3rsTKTNUNGcApjsp+MeiHqea4w+nmY6+N1PXutTcdeDIlWutZYvrU3iyWlYNTIwllBESSeLmPu74qAIvYOPuFS09vk1mS8tmYXvGTYmDTf/lVlDVTKukWb08P8YzDFPx3/UMfCX0k4AxufT97SlYDD/NQmN9Btq/HYLzZvCcYfbpJCIlfmLKjdl/zrLOxXVIcdpt+/xQ9Dnc0KOkmdC2T3Zk4SkpsN3oNsuSZLo0Z3+JALxxTPMtGFKZHbz+LSsNHeHzhdW8thbaRsdRrOI4coF6mBgmVwZZUvXhv7+KEQBQTVBBsFUfyLbHo7lMNkwrx9g2ts2cSPoUgoWUEEntF1aupq6cgsmubkqNKsKCQHgOBsZ9VwfSdpF0isKkR4TdCXjOpWrICoqvjNJo3hgfAe7EYG4oJKj2rn1j+XlqHZ8davi9ApQqNpRpyyageqg2hDVCIIV3ObpZ5h0bLse8c4arbe0fm+sckt3SPeRAPlp7hvojO9+xYTZ6S4xrjIQAk4DBLBuvLpW/JJXzbXqdfoWHEFxGnyBc2GrPSjxqxSGXpG+eoF4jsAvP/mSYDfDTbn0yzqxuEgjJBTNF4uNxpYE6FPUG7IS9tMeMDtwECNOHbF+s6iN4rXc9AHNa8uiyxsaOqgX14hvHrD/hUWk2n5qdfYpr5GJI4WLDi6BhAHVMuuF3CEsR7eYFKvQHn2zsc8YnEsJfsIwXEJyjzVpAx/keKl77nN6Kl5Updbvoe6RnDaBSMgQIVxNU42E2piuONVCJxUfzCm5bfxfehuwhcVEyR71UOUbJJ1mnXIQuwAziJltkumWwP0fVV6xjsjNOQ0f+17j0TsITyOsRG/GeOZQ/+2UIkqKPzGJmqwp9Y0+wRzfG03OOR7ljuxy65A5qRrGLEbcAIYvIb+g6KxWKZ9xPKixAvv6eNz+mt7ggZYSn1FYiTmUu39NC5Lx+Otq/p3CAmzgZTCsuWxgl38452oy2gLSwyK5wNW409LVJIeyL0bJofy+CT7YvsQwBt+InBWvaPPJZDhu6k/82A12j4g1iHv/k/jKuiv+OUTTGNhwFqGWsAyGf9UVbDC1+XudWYx/lIOlr3XJIRqv9PDm/RdvijZnh0LPC+Nu5lDuWiLTbIVFQOIR5Wpho3b2weg02+M86ntftMID7FywuF/LVk6RFPIeEHgOmS2M6CW4SLzg4ETrl1FZz7Re/Y/2cW3mwZOT4tvcK1pCSF5MYxbHX6JJkWs+V/mzVJsnSTdl37TGrgHefRxVIeTf9xKJvr1PnhgCpXxPH1YXngYPNYGzu2+G+k54eeHJKGiF2cjW5vuOPdbBXZJZIhB+4ZQX/pHxOKaG9IEkWt6atiKOiiFLJv8gydVbEntMckxAkvQ4WHTueU/1cnhbbQRTRP3HG9n6b1T2mO4CpHskGzMbes0xRChGPKw5P9Ny2boW5K3lNAud3xVkVtuJBRAJN/HvjILpXZzW3sCCWU/zhddLnTerdwrXa6UI8dKTzWREr345/O1jEyxpwLpi5EvCThxg2gfb4EQniw7aY7Zyfu1VsQ0EKZHASFSzx+bbUWxDF1DrIq0amCGTT1bM791O5Ctya387U2YrRAUhd8ZQour9sEfOejhGnT6HbyyACUs7Ub3sRc8WQ9qbGbAp4tF34XFpsm14PhYth5AqpIdZUdMrxCmvL531vxkuGr8OaSmh/7eS2VL1O7h/Q3GJfcLTObiFFOIkQornOVwvC2PPLsPutQEkrlyd/Sm73NL3o9cJgzSnWCRsLpiVyJjk2lfdADbuM0bOKz4vFdH2Dzy6QD/1APVPsYHppacNZRU3bwP6mb3o1KGorqPnEkcl6vJ6SLS9RXryU0kIQnbeHvE/YHZWdmpUzh8OnmbAbynkD6KiAZ81JJZoCG+vzSKD7iHlzKuF+0Vgajhz1Ty4Q/1QybejzSVeoMGo1nYxvk7rNBBlBk9FE3Lzik21K6z4bLwuSnOwe3FrKINCJmn0BzLRRGj9hhQz6BaRvdJv3Lzyd1xnecmwQm89cG1i2IbHcXLesj1Tek9egBql+8C/9kp6VqCa8cxjMkrD+bU6iZsj8qpNDjEQ4ez73l/lDYLE4M61FaoP4vJuQ/pmWfrSfOhMJ6GjDbv7CbtybZjXAoC1NFbsCDmfJfmGIs8uchnRQXtrAIGZVZgNxyAjy9XU+4Cb94gV7u8YFBzZ/5R5KRa0LYLACbmzGRr57MmCYwpjB9B0+qMvq28XEwymTpFun3ZVIk4nUm5Ty8MVAJ7/Qowo78zzYCjSfrGpZm7MlwI+ocN3wjalEkSkaRY/nOT6aSRtcwLz9uk8IMBIxQ8oUn1ayTztZe6hYJiosKP+B+bfrSCEIEtaDYjIGqLsYisNrLprns7qCDMEpW93N3leyKzN3Q8/PmnyCHTjskSv5QlhsfhPwpme8rlGYmkDE2KIKQxg5ihejBxWiw5ZlCdXQJ/XhHrgdjc4efHSwPmxOCsxoGTJde7E0pDsIvjS+g6BA2UpYFIk1mQCaSdOV5nqcKq5G+i55sK7tjOhxplXDEP728lJce370lqhSB8W44in8CCQJRhl9UwurA5n24Jl","n":600000};
