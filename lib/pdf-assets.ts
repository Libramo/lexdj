import fs from "fs";
import path from "path";

export function getBlyLogo(): string {
  const logoPath = path.join(process.cwd(), "public", "bly-logo.png");
  const data = fs.readFileSync(logoPath);
  return `data:image/png;base64,${data.toString("base64")}`;
}
