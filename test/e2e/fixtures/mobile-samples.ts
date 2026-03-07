/**
 * Additional test conversations for mobile screenshot testing.
 * Includes multi-turn, working state, and very long content scenarios.
 */

/** Multi-turn conversation — 3 rounds of Q&A. */
export const MULTI_TURN_MESSAGES = [
  { id: "mt-1", role: "user" as const, content: "Rust 的所有权模型是什么？简单解释一下。", timestamp: 1 },
  {
    id: "mt-2", role: "assistant" as const,
    content: `Rust 的所有权模型是其内存安全的核心机制。简单来说：

1. **每个值有且只有一个所有者**
2. **所有者离开作用域时，值被自动释放**
3. **值可以被借用（引用），但有规则限制**

\`\`\`rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // s1 的所有权转移给 s2
    // println!("{}", s1); // 编译错误！s1 已无效
    println!("{}", s2); // OK
}
\`\`\`

借用规则：同一时间只能有**一个可变引用**或**多个不可变引用**。`,
    timestamp: 2,
    result_meta: {
      task_id: "task_mt_1", task_type: "chat", price_cents: 5,
      completed_at: "2026-03-06T12:01:00Z",
      worker_display_name: "RustExpert", worker_avatar_url: null,
      word_count: 85, duration_seconds: 8.2, format: "markdown",
    },
  },
  { id: "mt-3", role: "user" as const, content: "那生命周期标注是什么？什么时候需要用？", timestamp: 3 },
  {
    id: "mt-4", role: "assistant" as const,
    content: `生命周期标注告诉编译器多个引用之间的关系，确保引用不会活过它指向的数据。

**什么时候需要？** 当函数接收多个引用并返回引用时：

\`\`\`rust
// 编译器无法推断返回值的生命周期
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
\`\`\`

这里 \`'a\` 表示返回值的生命周期与输入中较短的那个一致。

**不需要标注的情况：**
- 只有一个引用参数
- 方法中 \`&self\` 的生命周期自动应用于返回值`,
    timestamp: 4,
    result_meta: {
      task_id: "task_mt_2", task_type: "chat", price_cents: 8,
      completed_at: "2026-03-06T12:02:00Z",
      worker_display_name: "RustExpert", worker_avatar_url: null,
      word_count: 72, duration_seconds: 11.5, format: "markdown",
    },
  },
  { id: "mt-5", role: "user" as const, content: "给我一个实际项目中用到生命周期的例子", timestamp: 5 },
  {
    id: "mt-6", role: "assistant" as const,
    content: `一个常见场景：解析器持有对输入文本的引用。

\`\`\`rust
struct Parser<'a> {
    input: &'a str,
    position: usize,
}

impl<'a> Parser<'a> {
    fn new(input: &'a str) -> Self {
        Parser { input, position: 0 }
    }

    fn next_word(&mut self) -> Option<&'a str> {
        let remaining = &self.input[self.position..];
        let start = remaining.find(|c: char| !c.is_whitespace())?;
        let end = remaining[start..]
            .find(char::is_whitespace)
            .unwrap_or(remaining.len() - start);
        self.position += start + end;
        Some(&remaining[start..start + end])
    }
}

fn main() {
    let text = String::from("hello world rust");
    let mut parser = Parser::new(&text);
    while let Some(word) = parser.next_word() {
        println!("{}", word);
    }
    // parser 不能活过 text，编译器保证这一点
}
\`\`\`

关键点：\`Parser\` 不拥有字符串，它只是借用。\`'a\` 确保 parser 不会在原始字符串被释放后继续使用。`,
    timestamp: 6,
    result_meta: {
      task_id: "task_mt_3", task_type: "chat", price_cents: 12,
      completed_at: "2026-03-06T12:03:00Z",
      worker_display_name: "RustExpert", worker_avatar_url: null,
      word_count: 120, duration_seconds: 18.3, format: "markdown",
    },
  },
];

/** A "working" state conversation — user sent message, task is assigned. */
export const WORKING_CONVERSATION = {
  id: "test-conv-working",
  task_id: "task_working_1",
  task_status: "assigned",
  price_cents: 20,
  last_worker_id: null,
  messages: [
    {
      id: "wk-1", role: "user" as const,
      content: "Write a comprehensive comparison of React Server Components vs traditional SSR approaches. Include performance benchmarks and migration strategies.",
      timestamp: Date.now() - 30_000,
    },
  ],
  created_at: Date.now() - 30_000,
  updated_at: Date.now(),
};

/** Multi-turn conversation object. */
export const MULTI_TURN_CONVERSATION = {
  id: "test-conv-multiturn",
  task_id: "task_mt_3",
  task_status: "completed",
  price_cents: 12,
  last_worker_id: "w_rust_expert",
  messages: MULTI_TURN_MESSAGES,
  created_at: 1,
  updated_at: 6,
};
