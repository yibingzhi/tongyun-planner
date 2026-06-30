import type { CustomizationConfig, Task } from "../types";
import { DEFAULT_AI_CLASSIFY_PROMPT } from "../constants";
import { getLocalDateString } from "./date";

/**
 * 辅助清洗 AI 返回的 JSON 字符串，防止 Markdown 代码块标记（```json）导致 JSON.parse 报错。
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * 通用 AI 接口发起函数，自适应适配 OpenAI/DeepSeek 格式与 Anthropic Claude 原生格式
 */
export async function callAI(
  config: CustomizationConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = config.aiApiKey;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const provider = config.aiProvider || "openai";

  if (provider === "anthropic") {
    // Anthropic Claude 原生 API
    const endpoint = config.aiEndpoint || "https://api.anthropic.com/v1/messages";
    const model = config.aiModel || "claude-3-5-sonnet-20241022";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API 错误 (HTTP ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || "";
  } else {
    // OpenAI / DeepSeek / 兼容格式 API
    const endpoint = config.aiEndpoint || "https://api.openai.com/v1";
    const model = config.aiModel || "gpt-4o";
    const url = endpoint.endsWith("/") ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI 兼容 API 错误 (HTTP ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }
}

/** 测试 AI 接口连通性（发送极简探针请求） */
export async function testAIConnection(config: CustomizationConfig): Promise<string> {
  const result = await callAI(config, "你是一个测试助手。", "请只回复：连接成功");
  return result.trim();
}

/**
 * 1. AI 智能划分子视图分类 (Eisenhower Category Selection)
 */
export async function classifyCategory(
  config: CustomizationConfig,
  title: string,
  desc: string
): Promise<Task["category"] | null> {
  const systemPrompt = DEFAULT_AI_CLASSIFY_PROMPT;
  const userPrompt = `任务标题: ${title}\n描述: ${desc || "无"}`;

  try {
    const result = await callAI(config, systemPrompt, userPrompt);
    // 清洗结果：转小写，去除引号、括号、多余标点
    const cleaned = result.trim().toLowerCase().replace(/[`'"'\[\]\.\#\*]/g, "");

    // 映射中文分类到英文标识符
    const chineseMapping: Record<string, Task["category"]> = {
      "重要且紧急": "urgent-important",
      "重要紧急": "urgent-important",
      "重要不紧急": "important-not-urgent",
      "紧急不重要": "urgent-not-important",
      "不重要不紧急": "not-urgent-not-important",
      "不重要且不紧急": "not-urgent-not-important",
    };

    for (const [zh, en] of Object.entries(chineseMapping)) {
      if (cleaned.includes(zh)) {
        return en;
      }
    }

    // 解决包含关系冲突并匹配（先检查最长匹配项，避免 urgent-not-important 被 incorrectly 包含）
    const matched = [
      "not-urgent-not-important",
      "important-not-urgent",
      "urgent-not-important",
      "urgent-important",
    ].find((c) => cleaned === c || cleaned.includes(c));

    return (matched as Task["category"]) || null;
  } catch (e) {
    console.error("AI 自动分类失败:", e);
    return null;
  }
}

/**
 * 2. AI 智能一键拆解子任务 (Checklist Decompose)
 */
export async function decomposeTask(
  config: CustomizationConfig,
  title: string,
  desc: string
): Promise<string> {
  const systemPrompt =
    "你是一个高效日程管理专家。你的任务是将用户输入的大任务进行结构化拆解，分成 3 到 5 步可立即执行的子任务。请输出标准的 Markdown 复选框格式（例如：\n- [ ] 步骤一\n- [ ] 步骤二\n）。只返回 Markdown 复选框列表内容本身，不要返回任何开头引言、多余解释、行号或结束总结。";
  const userPrompt = `需要拆解的任务标题: ${title}\n细节描述: ${desc || "无"}`;

  return await callAI(config, systemPrompt, userPrompt);
}

/**
 * 3. AI 智能优化润色标题 (Title Polish)
 */
export async function polishTitle(
  config: CustomizationConfig,
  title: string
): Promise<string> {
  const systemPrompt =
    "你是一个排版和日常管理助手。请对以下待办任务标题进行精简和美化润色，使其看起来更简练、有条理且专业。请控制在 15 个字以内。你可以适当在标题最前端加上 1 个对应的 Emoji 表情（如 📝，💻，🏃）。直接返回润色后的标题文本，不要包含任何双引号、前缀（如“润色后：”）或多余解释。若觉得原标题已经极好，请直接返回原标题。";
  const userPrompt = `原标题: ${title}`;

  return await callAI(config, systemPrompt, userPrompt);
}

/**
 * 4. AI 便签智能整理排版 (Format Note Text)
 */
export async function formatNoteText(
  config: CustomizationConfig,
  noteText: string
): Promise<string> {
  const systemPrompt =
    "你是一个手账随身记排版专家。请对用户随手记下的凌乱便签草稿进行整理、分点和排版美化，使其结构清晰、易于查阅。你可以根据上下文加入合适的 Emoji，但必须 100% 保持原意与所有事实细节。只返回整理后的便签内容本身，不要返回任何引言、解释或多余的行。";
  const userPrompt = `原便签内容:\n${noteText}`;

  return await callAI(config, systemPrompt, userPrompt);
}

/**
 * 5. AI 便签脑暴续写 (Brainstorm & Expand Note)
 */
export async function brainstormNote(
  config: CustomizationConfig,
  noteText: string
): Promise<string> {
  const systemPrompt =
    "你是一个创意与规划助手。请阅读以下便签记事的内容，并针对其主题，发散出 3 点具体的扩展灵感、补充细节或后续行动建议。请使用 Markdown 的短分点符号（- ）进行排版，字数控制在简短的范围内（每点不超过 20 字）。只返回追加续写的想法内容本身，不要任何多余废话。";
  const userPrompt = `当前便签正文:\n${noteText}`;

  return await callAI(config, systemPrompt, userPrompt);
}

/**
 * 6. AI 夸夸模式 — 根据完成的任务生成祝贺语
 */
export async function generatePraise(
  config: CustomizationConfig,
  locale: string
): Promise<string> {
  const lang = locale === "zh-CN" ? "简体中文" : "English";
  const systemPrompt = `你是一个温暖、有趣的鼓励大师。请用 ${lang} 生成一句简短的任务完成祝贺/夸赞语。
要求：
- 必须通用，不要提及任何具体任务名称
- 不超过 20 个字，可以适当使用 1-2 个 emoji
- 热情、有感染力，不要过于模板化
- 只返回祝贺文本本身，不要任何前缀后缀或引号`;

  const userPrompt = `请给我一句通用的完成祝贺语！`;
  try {
    return await callAI(config, systemPrompt, userPrompt);
  } catch {
    return "";
  }
}

/**
 * 6b. 批量生成夸夸词 — 一次调用生成多条（用于扩充词库）
 */
export async function generatePraiseBatch(
  config: CustomizationConfig,
  locale: string,
  count: number = 5
): Promise<string[]> {
  const lang = locale === "zh-CN" ? "简体中文" : "English";
  const systemPrompt = `你是一个温暖、有趣的鼓励大师。请用 ${lang} 生成 ${count} 条通用的任务完成祝贺/夸赞语。
要求：
- 必须通用，绝对不要提及任何具体任务名称或内容
- 每条不超过 20 个字，可以适当使用 1-2 个 emoji
- 风格热情、有感染力，不要过于模板化
- 每条占一行，不要带序号或前缀后缀
- 只返回纯文本，每行一条`;

  const userPrompt = `请生成 ${count} 条通用夸赞语。`;
  try {
    const result = await callAI(config, systemPrompt, userPrompt);
    const lines = result.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    return lines.slice(0, count);
  } catch {
    return [];
  }
}

/**
 * 7. AI 智能从便签提取日程待办 (Extract Tasks from Note)
 */
export interface ExtractedTask {
  title: string;
  description: string;
  notes: string;
  dueDate: string;
  dueTime?: string;
  category: Task["category"];
}

export async function extractTasksFromNote(
  config: CustomizationConfig,
  noteText: string
): Promise<ExtractedTask[]> {
  const today = getLocalDateString();
  const systemPrompt = `你是一个专业的日程和任务规划专家。你的任务是分析用户输入的文案（如客服工单、备忘或大段规划），提取并分离成结构化的待办任务。
请严格以标准的 JSON 数组格式返回结果。数组中的每个对象代表一个提取出的任务，且必须正好包含以下六个字段：
1. "title": (string) 简短易读的任务标题。如果是工单或系统日志，请浓缩提炼出核心矛盾和人员（例如：“【TD登陆未授权】Adrian Cheng 微信登陆故障”）。控制在 18 个字以内。
2. "description": (string) 任务具体背景及故障表现描述（例如：“学生和家长在国外，两个微信都试了无法登陆，没有开未成年人模式”）。
3. "notes": (string) 详细的元数据、日志编号或硬件/UID数据（例如：“学生：Adrian Cheng\nUID：oXBpRwJV46AAu68DxqQ2xhXjWSU4\n工单：20260627-01”）。请使用换行符分隔。
4. "dueDate": (string) 截止日期，格式为 YYYY-MM-DD。若输入提及“明天/周末/下周三”等相对日期，请根据今天的时间（今天是 ${today}）进行精确推算；若完全没有提到日期，默认使用今天（${today}）。
5. "dueTime": (string) 截止时间，24小时制 HH:mm 格式。如果输入提到"下午3点"/"15:00"/"下班前"（17:00或18:00）等具体时间，请解析为对应时间；如果没有提到时间，请留空 ""。
6. "category": (string) 四象限分类，必须且只能是以下四个值之一：[urgent-important | important-not-urgent | urgent-not-important | not-urgent-not-important]。例如，如果是系统故障或紧急故障，应判定为 "urgent-important"。

重要规则：只返回标准的 JSON 数组格式，不要包含 Markdown 代码块包裹，也不要有任何开头引言、多余文字或注释。如果没有发现明确待办事项，请直接返回空数组 []。`;
  const userPrompt = `用户输入的原始文案:\n${noteText}`;

  const rawResult = await callAI(config, systemPrompt, userPrompt);
  const cleaned = cleanJsonResponse(rawResult);

  if (!cleaned || cleaned === "[]") {
    return [];
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        let cat = (item.category || "").trim().toLowerCase();

        // 映射中文分类到英文标识符
        const chineseMapping: Record<string, Task["category"]> = {
          "重要且紧急": "urgent-important",
          "重要紧急": "urgent-important",
          "重要不紧急": "important-not-urgent",
          "紧急不重要": "urgent-not-important",
          "不重要不紧急": "not-urgent-not-important",
          "不重要且不紧急": "not-urgent-not-important",
        };

        for (const [zh, en] of Object.entries(chineseMapping)) {
          if (cat.includes(zh)) {
            cat = en;
            break;
          }
        }

        // 解决包含关系冲突并格式化
        const matched = [
          "not-urgent-not-important",
          "important-not-urgent",
          "urgent-not-important",
          "urgent-important",
        ].find((c) => cat === c || cat.includes(c));

        return {
          title: item.title || "无题待办",
          description: item.description || "",
          notes: item.notes || "",
          dueDate: item.dueDate || today,
          dueTime: item.dueTime || undefined,
          category: (matched as Task["category"]) || "urgent-important",
        };
      });
    }
    return [];
  } catch (e) {
    console.error("AI 提取任务 JSON 解析失败. 原始返回:", rawResult, "清洗后:", cleaned, e);
    throw new Error("JSON_PARSE_FAILED");
  }
}
