/* Передача оплаченного заказа в R-Keeper.
   Сейчас — заглушка: бегунок (слип) пишется в table/data/slips/ и сразу виден на экране бармена, печать — кнопкой.
   Настоящая связка — XML-интерфейс R-Keeper 7 на кассовом сервере (лицензия и настройка — у дилера R-Keeper):
   открыть заказ на стол N, добавить блюда по их кодам в R-Keeper, внести оплату валютой «Онлайн (СБП)».
   Тогда бегунок на барный принтер выведет сама сервис-печать R-Keeper, а заказ и оплата попадут в отчёты кассы. */
import fs from "node:fs";
import path from "node:path";

export const RK_NAME = "заглушка (без R-Keeper)";

export async function rkSend(order, slip, dir){
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, order.day + "-" + String(order.no).padStart(3, "0") + ".txt"), slip);
  return { ok: true, ref: "демо-" + order.no };
}
