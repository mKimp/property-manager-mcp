"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProperties = getAllProperties;
exports.getPropertyById = getPropertyById;
exports.saveProperty = saveProperty;
exports.deleteProperty = deleteProperty;
exports.getDataFilePath = getDataFilePath;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_FILE = path_1.default.join(process.env.DATA_DIR || process.cwd(), "properties.json");
function loadStore() {
    if (!fs_1.default.existsSync(DATA_FILE)) {
        return { properties: {} };
    }
    const raw = fs_1.default.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
}
function saveStore(store) {
    const dir = path_1.default.dirname(DATA_FILE);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    fs_1.default.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}
function getAllProperties() {
    const store = loadStore();
    return Object.values(store.properties).sort((a, b) => a.address.state.localeCompare(b.address.state));
}
function getPropertyById(id) {
    const store = loadStore();
    return store.properties[id] ?? null;
}
function saveProperty(property) {
    const store = loadStore();
    store.properties[property.id] = property;
    saveStore(store);
}
function deleteProperty(id) {
    const store = loadStore();
    if (!store.properties[id])
        return false;
    delete store.properties[id];
    saveStore(store);
    return true;
}
function getDataFilePath() {
    return DATA_FILE;
}
//# sourceMappingURL=storage.js.map