const http = require("node:http");
const path = require("node:path");
const { NoteStorage } = require("./storage");

const defaultDataFile = path.join(process.cwd(), "data", "notes.json");

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Payload muito grande."));
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON inválido."));
      }
    });
  });
}

function validateNote(data) {
  if (!data.title || String(data.title).trim().length < 3) {
    return "O título precisa ter pelo menos 3 caracteres.";
  }

  if (!data.content || String(data.content).trim().length < 5) {
    return "O conteúdo precisa ter pelo menos 5 caracteres.";
  }

  return null;
}

function createApp(options = {}) {
  const storage = new NoteStorage(options.dataFile || defaultDataFile);

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const segments = url.pathname.split("/").filter(Boolean);

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { status: "ok", service: "notas-api-node" });
        return;
      }

      if (request.method === "GET" && url.pathname === "/notes") {
        const notes = await storage.all();
        const search = url.searchParams.get("search")?.toLowerCase();
        const onlyFavorites = url.searchParams.get("favorite") === "true";

        const filtered = notes.filter((note) => {
          const matchesSearch = !search || `${note.title} ${note.content}`.toLowerCase().includes(search);
          const matchesFavorite = !onlyFavorites || note.favorite;
          return matchesSearch && matchesFavorite;
        });

        sendJson(response, 200, { data: filtered });
        return;
      }

      if (request.method === "POST" && url.pathname === "/notes") {
        const body = await readBody(request);
        const error = validateNote(body);

        if (error) {
          sendJson(response, 422, { error });
          return;
        }

        const note = await storage.create(body);
        sendJson(response, 201, { data: note });
        return;
      }

      if (segments[0] === "notes" && segments[1]) {
        const id = segments[1];

        if (request.method === "PATCH") {
          const body = await readBody(request);
          const note = await storage.update(id, body);

          if (!note) {
            sendJson(response, 404, { error: "Nota não encontrada." });
            return;
          }

          sendJson(response, 200, { data: note });
          return;
        }

        if (request.method === "DELETE") {
          const deleted = await storage.delete(id);

          if (!deleted) {
            sendJson(response, 404, { error: "Nota não encontrada." });
            return;
          }

          sendJson(response, 200, { deleted: true });
          return;
        }
      }

      sendJson(response, 404, { error: "Rota não encontrada." });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3333);
  const server = createApp();

  server.listen(port, () => {
    console.log(`Notas API rodando em http://localhost:${port}`);
  });
}

module.exports = { createApp };
