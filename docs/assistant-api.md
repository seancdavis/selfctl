# Assistant API

Public API endpoints for an AI assistant to interact with the dashboard. Authenticated via Bearer token using `ASSISTANT_API_KEY`.

## Authentication

All requests require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <ASSISTANT_API_KEY>
```

Returns `401 Unauthorized` if the token is missing, malformed, or does not match.

## Endpoints

### GET /api/assistant/tasks

Returns the active week and all its tasks.

**Response (200):**

```json
{
  "week": {
    "label": "2026-08",
    "startDate": "2026-02-16",
    "endDate": "2026-02-22"
  },
  "tasks": [
    {
      "id": 42,
      "title": "Write blog post",
      "status": "pending",
      "category": "Work",
      "tags": ["writing"]
    }
  ]
}
```

**Response (404):** No active week found.

```bash
curl -H "Authorization: Bearer $ASSISTANT_API_KEY" \
  https://your-site.netlify.app/api/assistant/tasks
```

---

### POST /api/assistant/tasks/:id/toggle

Toggles a task's status between `pending` and `completed`.

**Response (200):** The updated task object.

**Response (404):** Task not found.

```bash
curl -X POST \
  -H "Authorization: Bearer $ASSISTANT_API_KEY" \
  https://your-site.netlify.app/api/assistant/tasks/42/toggle
```

---

### POST /api/assistant/notes

Adds a note to a task.

**Request body:**

```json
{
  "taskId": 42,
  "contentMarkdown": "Finished the first draft."
}
```

**Response (201):** The created note object.

**Response (404):** Task not found.

```bash
curl -X POST \
  -H "Authorization: Bearer $ASSISTANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"taskId": 42, "contentMarkdown": "Finished the first draft."}' \
  https://your-site.netlify.app/api/assistant/notes
```

---

### POST /api/assistant/backlog

Creates a new backlog item.

**Request body:**

```json
{
  "title": "Research deployment options",
  "contentMarkdown": "Compare Netlify vs Vercel vs Cloudflare.",
  "categoryId": 3,
  "tags": ["research"]
}
```

Only `title` is required. All other fields are optional.

**Response (201):** The created backlog item object.

```bash
curl -X POST \
  -H "Authorization: Bearer $ASSISTANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Research deployment options"}' \
  https://your-site.netlify.app/api/assistant/backlog
```

## Error Responses

All errors return JSON with an `error` field:

```json
{ "error": "Unauthorized" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (missing fields, invalid JSON) |
| 401 | Missing or invalid API key |
| 404 | Resource not found |
| 405 | Method not allowed |
