# Notas API Node

API REST de notas feita com Node.js puro, sem Express e sem dependências externas.

## Funcionalidades

- Criar notas
- Listar notas
- Buscar por texto
- Filtrar favoritas
- Atualizar notas
- Remover notas
- Persistência em arquivo JSON
- Testes com `node:test`

## Como rodar

```bash
npm start
```

A API ficará disponível em:

```txt
http://localhost:3333
```

## Rotas

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Status da API |
| GET | `/notes` | Lista notas |
| GET | `/notes?search=node` | Busca notas |
| GET | `/notes?favorite=true` | Lista favoritas |
| POST | `/notes` | Cria nota |
| PATCH | `/notes/:id` | Atualiza nota |
| DELETE | `/notes/:id` | Remove nota |

## Exemplo de criação

```bash
curl -X POST http://localhost:3333/notes \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Estudar Node\",\"content\":\"Criar uma API para o GitHub.\"}"
```

## Testes

```bash
npm test
```
