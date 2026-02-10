import "dotenv/config";
import postgres from "postgres";
import fs from "node:fs/promises";
import path from "node:path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("DATABASE_URL no definida en .env");
    process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
    const migrationPath = path.join(
        process.cwd(),
        "drizzle",
        "0001_colossal_tigra.sql"
    );
    const content = await fs.readFile(migrationPath, "utf-8");
    const statements = content
        .split(/--> statement-breakpoint\n?/)
        .map((s) => s.trim())
        .filter(Boolean);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;
        try {
            await sql.unsafe(stmt);
            console.log(`✓ ${i + 1}/${statements.length}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("already exists")) {
                console.log(`○ ${i + 1}/${statements.length} (ya existe)`);
            } else {
                console.error(`✗ Error en statement ${i + 1}:`, msg);
                throw err;
            }
        }
    }
    console.log("Migración 0001 aplicada.");
    await sql.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
