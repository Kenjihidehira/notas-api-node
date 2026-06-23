const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { afterEach, beforeEach, test } = require("node:test");
const { createApp } = require("../src/server");

let server;
let baseUrl;
let tempDir;

function listen(app) {
  return new Promise((resolve) => {
    app.listen(0, () => {
      const address = app.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  return { status: response.status, data };
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "notas-api-"));
  server = createApp({ dataFile: path.join(tempDir, "notes.json") });
  baseUrl = await listen(server);
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(tempDir, { recursive: true, force: true });
});

test("cria e lista notas", async () => {
  const created = await request("/notes", {
    method: "POST",
    body: JSON.stringify({
      title: "Estudar Node",
      content: "Praticar criação de APIs com HTTP puro."
    })
  });

  assert.equal(created.status, 201);
  assert.equal(created.data.data.title, "Estudar Node");

  const listed = await request("/notes");
  assert.equal(listed.status, 200);
  assert.equal(listed.data.data.length, 1);
});

test("valida campos obrigatórios", async () => {
  const response = await request("/notes", {
    method: "POST",
    body: JSON.stringify({
      title: "Oi",
      content: "API"
    })
  });

  assert.equal(response.status, 422);
  assert.match(response.data.error, /título/i);
});

test("atualiza e filtra favoritas", async () => {
  const created = await request("/notes", {
    method: "POST",
    body: JSON.stringify({
      title: "Projeto GitHub",
      content: "Adicionar README bonito no repositório."
    })
  });

  const id = created.data.data.id;
  const updated = await request(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ favorite: true })
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.data.data.favorite, true);

  const favorites = await request("/notes?favorite=true");
  assert.equal(favorites.data.data.length, 1);
});

test("remove notas", async () => {
  const created = await request("/notes", {
    method: "POST",
    body: JSON.stringify({
      title: "Apagar depois",
      content: "Nota temporária para teste."
    })
  });

  const id = created.data.data.id;
  const deleted = await request(`/notes/${id}`, { method: "DELETE" });
  const listed = await request("/notes");

  assert.equal(deleted.status, 200);
  assert.equal(listed.data.data.length, 0);
});
