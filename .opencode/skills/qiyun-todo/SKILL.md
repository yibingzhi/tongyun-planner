---
name: tongyun-todo
description: Use when the user asks to add, list, query, or manage tasks via WebDAV (坚果云). Enables opencode to read and write the tongyun-planner task database through WebDAV sync.
---

# tongyun-todo

This skill lets opencode interact with the [tongyun-planner](https://github.com/user/tongyun-planner) task management app's data through WebDAV (坚果云).

## How to get credentials

Ask the user for their WebDAV credentials (坚果云 > 设置 > 安全 > 第三方应用管理). Tell them to:
1. Open 坚果云 → 设置 → 安全 → 第三方应用管理
2. Generate an app password (or use their main password)
3. Provide you with the **server URL**, **username** (email), and **password**

These should match what they have configured in the app's Settings → 云同步 → WebDAV.

## Task data schema

Tasks live in a JSON array file on WebDAV at `{baseUrl}/TongYunPlanner/tasks.json`. Each entry:

```json
{
  "id": "unique-string-id",
  "title": "任务标题",
  "description": "可选描述",
  "category": "urgent-important | important-not-urgent | urgent-not-important | not-urgent-not-important",
  "dueDate": "2026-07-10",
  "dueTime": "14:30",
  "tags": ["工作", "开发"],
  "isFavorite": false,
  "subtasks": [
    { "id": "sub-id", "title": "子任务", "completed": false }
  ],
  "repeat": "none",
  "dependsOn": []
}
```

- `id`: always generated via `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)`
- `category`: one of the four Eisenhower matrix quadrants
- `dueDate`: optional, `YYYY-MM-DD` format
- `dueTime`: optional, `HH:mm` format

## Reading tasks

```bash
curl -s -u "<username>:<password>" "<baseUrl>/TongYunPlanner/tasks.json"
```

## Adding a task

1. **Read** current tasks with GET
2. **Parse** the JSON array
3. **Append** a new task object with the schema above
4. **Write** back with PUT:

```bash
curl -s -X PUT -u "<username>:<password>" \
  -H "Content-Type: application/json" \
  -d '<updated JSON array>' \
  "<baseUrl>/TongYunPlanner/tasks.json"
```

## Updating / deleting a task

Same flow: GET → mutate the array (find by `id`) → PUT.

## Tips

- The WebDAV base URL is typically `https://dav.jianguoyun.com/dav`
- If the initial GET returns 404, the array is empty — start with `[]`
- Always preserve the full existing data; never overwrite with incomplete data
- When generating IDs, use the same format as the app so there are no conflicts
- For Chinese titles, ensure UTF-8 encoding in curl: the `-d` flag handles this automatically
