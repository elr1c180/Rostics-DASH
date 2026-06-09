import fs from "node:fs";
import path from "node:path";
import { Client } from "ssh2";
import mysql from "mysql2/promise";

function readEnv(filePath) {
  const env = {};

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[match[1]] = value;
  }

  return env;
}

function requireEnv(env, keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required .env keys: ${missing.join(", ")}`);
  }
}

function connectSsh(config) {
  return new Promise((resolve, reject) => {
    const ssh = new Client();
    ssh
      .on("ready", () => resolve(ssh))
      .on("error", reject)
      .connect(config);
  });
}

function openTunnel(ssh, remoteHost, remotePort) {
  return new Promise((resolve, reject) => {
    ssh.forwardOut("127.0.0.1", 0, remoteHost, remotePort, (error, stream) => {
      if (error) reject(error);
      else resolve(stream);
    });
  });
}

export async function withDatabase(root, callback) {
  const env = readEnv(path.join(root, ".env"));
  requireEnv(env, ["ip", "login", "pass"]);

  let ssh;
  let db;

  try {
    ssh = await connectSsh({
      host: env.ssh_host || env.ip,
      port: Number(env.ssh_port || 22),
      username: env.login,
      password: env.pass,
      readyTimeout: 12000,
    });

    const stream = await openTunnel(ssh, env.db_host || "127.0.0.1", Number(env.db_port || 3306));
    db = await mysql.createConnection({
      user: env.login,
      password: env.pass,
      database: env.database || "efes",
      stream,
      multipleStatements: false,
      connectTimeout: 12000,
    });

    return await callback(db);
  } finally {
    if (db) await db.end();
    if (ssh) ssh.end();
  }
}
