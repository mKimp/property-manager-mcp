import fs from "fs";
import path from "path";
import { Property, PropertyStore } from "../types.js";

const DATA_FILE = path.join(process.env.DATA_DIR || process.cwd(), "properties.json");

function loadStore(): PropertyStore {
  if (!fs.existsSync(DATA_FILE)) {
    return { properties: {} };
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as PropertyStore;
}

function saveStore(store: PropertyStore): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function getAllProperties(): Property[] {
  const store = loadStore();
  return Object.values(store.properties).sort((a, b) =>
    a.address.state.localeCompare(b.address.state)
  );
}

export function getPropertyById(id: string): Property | null {
  const store = loadStore();
  return store.properties[id] ?? null;
}

export function saveProperty(property: Property): void {
  const store = loadStore();
  store.properties[property.id] = property;
  saveStore(store);
}

export function deleteProperty(id: string): boolean {
  const store = loadStore();
  if (!store.properties[id]) return false;
  delete store.properties[id];
  saveStore(store);
  return true;
}

export function getDataFilePath(): string {
  return DATA_FILE;
}
