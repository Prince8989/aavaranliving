import { cookies } from "next/headers";
import { CURRENCY_COOKIE, parseCurrency } from "./currency";

export async function getCurrency() {
  const store = await cookies();
  return parseCurrency(store.get(CURRENCY_COOKIE)?.value);
}
