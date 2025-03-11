import { createHiveChain, type IHiveChainInterface } from "@hiveio/wax/vite";

let chain: IHiveChainInterface;

export const getWax = async(): Promise<IHiveChainInterface> => {
  if (!chain)
    chain = await createHiveChain();

  return chain;
};
