import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
config({ path: path.join(scriptDir, "../.env.local") });
