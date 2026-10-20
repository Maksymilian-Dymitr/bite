import * as SecureStore from "expo-secure-store";

const KEY = "gemini_api_key";
const MODEL = "gemini_model";

export const DEFAULT_MODEL = "gemini-3.8-flash";

export const getApiKey = () => SecureStore.getItemAsync(KEY);
export const setApiKey = (v: string) =>
  v ? SecureStore.setItemAsync(KEY, v.trim()) : SecureStore.deleteItemAsync(KEY);

export async function getModel() {
  return (await SecureStore.getItemAsync(MODEL)) || DEFAULT_MODEL;
}
export const setModel = (v: string) =>
  v ? SecureStore.setItemAsync(MODEL, v.trim()) : SecureStore.deleteItemAsync(MODEL);
