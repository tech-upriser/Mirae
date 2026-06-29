const dns = require("dns");
const { exec } = require("child_process");

function runNslookup(type, host) {
  return new Promise((resolve, reject) => {
    exec(`nslookup -type=${type} ${host}`, { timeout: 10000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

function parseSrv(stdout) {
  const lines = stdout.split(/\r?\n/);
  const records = [];
  let current = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("priority")) {
      current.priority = parseInt(trimmed.split("=").pop().trim(), 10);
    } else if (trimmed.startsWith("weight")) {
      current.weight = parseInt(trimmed.split("=").pop().trim(), 10);
    } else if (trimmed.startsWith("port")) {
      current.port = parseInt(trimmed.split("=").pop().trim(), 10);
    } else if (trimmed.startsWith("svr hostname")) {
      current.name = trimmed.split("=").pop().trim();
      if (
        typeof current.priority === "number" &&
        typeof current.weight === "number" &&
        typeof current.port === "number" &&
        current.name
      ) {
        records.push(current);
        current = {};
      }
    }
  }

  return records;
}

function parseTxt(stdout) {
  const matches = [...stdout.matchAll(/text\s*=\s*"([^"]*)"/g)];
  if (!matches.length) return [];
  return matches.map((m) => [m[1]]);
}

// callback API patches
dns.resolveSrv = function (hostname, callback) {
  console.log("dnsPatch: callback resolveSrv called for", hostname);
  runNslookup("SRV", hostname)
    .then((stdout) => callback(null, parseSrv(stdout)))
    .catch((err) => callback(err));
};

dns.resolveTxt = function (hostname, callback) {
  console.log("dnsPatch: callback resolveTxt called for", hostname);
  runNslookup("TXT", hostname)
    .then((stdout) => callback(null, parseTxt(stdout)))
    .catch((err) => callback(err));
};

// promise API patches
if (!dns.promises) {
  dns.promises = {};
}

dns.promises.resolveSrv = async function (hostname) {
  console.log("dnsPatch: promises resolveSrv called for", hostname);
  const stdout = await runNslookup("SRV", hostname);
  return parseSrv(stdout);
};

dns.promises.resolveTxt = async function (hostname) {
  console.log("dnsPatch: promises resolveTxt called for", hostname);
  const stdout = await runNslookup("TXT", hostname);
  return parseTxt(stdout);
};

console.log("dnsPatch loaded");